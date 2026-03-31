terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {}

data "google_storage_project_service_account" "gcs" {
  depends_on = [google_project_service.required]
}

resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "pubsub.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
    "cloudbuild.googleapis.com",
    "iamcredentials.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com"
  ])

  project = var.project_id
  service = each.value
}

resource "random_password" "db_password_upload" {
  length  = 24
  special = true
}

resource "random_password" "db_password_read" {
  length  = 24
  special = true
}

resource "google_secret_manager_secret" "db_password_upload" {
  secret_id = "moniq-upload-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "db_password_upload" {
  secret      = google_secret_manager_secret.db_password_upload.id
  secret_data = random_password.db_password_upload.result
}

resource "google_secret_manager_secret" "db_password_read" {
  secret_id = "moniq-read-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "db_password_read" {
  secret      = google_secret_manager_secret.db_password_read.id
  secret_data = random_password.db_password_read.result
}

resource "google_sql_database_instance" "primary" {
  name             = var.db_instance_name
  database_version = var.db_version
  region           = var.region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled = true
    }

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = false

  depends_on = [google_project_service.required]
}

resource "google_sql_database" "primary" {
  name     = var.db_name
  instance = google_sql_database_instance.primary.name
}

resource "google_sql_user" "upload" {
  name     = var.db_user_upload
  instance = google_sql_database_instance.primary.name
  password = random_password.db_password_upload.result
}

resource "google_sql_user" "read" {
  name     = var.db_user_read
  instance = google_sql_database_instance.primary.name
  password = random_password.db_password_read.result
}

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = var.artifact_repo_name
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket" "uploads" {
  name                        = var.uploads_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  cors {
    origin          = ["*"]
    method          = ["PUT", "GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "x-goog-resumable"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.required]
}

resource "google_pubsub_topic" "gcs_events" {
  name       = "gcs-files-added"
  depends_on = [google_project_service.required]
}

resource "google_pubsub_topic" "uploaded_files" {
  name       = var.uploaded_files_topic_name
  depends_on = [google_project_service.required]
}

resource "google_pubsub_topic" "ingestion_completed" {
  name       = var.ingestion_completed_topic_name
  depends_on = [google_project_service.required]
}

resource "google_storage_notification" "gcs_to_pubsub" {
  bucket         = google_storage_bucket.uploads.name
  topic          = google_pubsub_topic.gcs_events.id
  payload_format = "JSON_API_V1"
  event_types    = ["OBJECT_FINALIZE"]

  depends_on = [google_pubsub_topic_iam_member.gcs_publisher]
}

resource "google_service_account" "worker" {
  account_id   = "ingest-worker-sa"
  display_name = "Ingest Worker Service Account"
}

resource "google_service_account" "pubsub_invoker" {
  account_id   = "pubsub-invoker-sa"
  display_name = "Pub/Sub Push Invoker"
}

resource "google_service_account" "upload_api" {
  account_id   = "upload-api-sa"
  display_name = "Upload API Service Account"
}

resource "google_cloud_run_v2_service" "worker" {
  count    = var.enable_worker ? 1 : 0
  name     = var.service_name
  location = var.region

  template {
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.primary.connection_name
    }

    service_account = google_service_account.worker.email

    containers {
      image = var.worker_image

      env {
        name  = "DB_USER"
        value = var.db_user_upload
      }

      env {
        name  = "DB_NAME"
        value = var.db_name
      }

      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.primary.connection_name
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "INGESTION_COMPLETED_TOPIC"
        value = google_pubsub_topic.ingestion_completed.name
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_upload.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service" "market_data_worker" {
  count    = var.enable_market_data_worker ? 1 : 0
  name     = var.market_data_worker_name
  location = var.region

  template {
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.primary.connection_name
    }

    service_account = google_service_account.worker.email

    containers {
      image = var.market_data_worker_image

      env {
        name  = "DB_USER"
        value = var.db_user_upload
      }

      env {
        name  = "DB_NAME"
        value = var.db_name
      }

      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.primary.connection_name
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_upload.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "ALPHAVANTAGE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.alphavantage_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "STOCKDATA_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.stockdata_secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service_iam_member" "market_data_worker_public_invoker" {
  count    = var.enable_market_data_worker && var.market_data_worker_public ? 1 : 0
  location = google_cloud_run_v2_service.market_data_worker[0].location
  name     = google_cloud_run_v2_service.market_data_worker[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service" "metrics_worker" {
  count    = var.enable_metrics_worker ? 1 : 0
  name     = var.metrics_worker_name
  location = var.region

  template {
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.primary.connection_name
    }

    service_account = google_service_account.worker.email

    containers {
      image = var.metrics_worker_image

      env {
        name  = "DB_USER"
        value = var.db_user_upload
      }

      env {
        name  = "DB_NAME"
        value = var.db_name
      }

      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.primary.connection_name
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_upload.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service_iam_member" "metrics_worker_invoker" {
  count    = var.enable_metrics_worker ? 1 : 0
  location = google_cloud_run_v2_service.metrics_worker[0].location
  name     = google_cloud_run_v2_service.metrics_worker[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

resource "google_cloud_run_v2_service" "upload_api" {
  count    = var.enable_upload_api ? 1 : 0
  name     = var.upload_api_service_name
  location = var.region

  template {
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.primary.connection_name
    }

    service_account = google_service_account.upload_api.email

    containers {
      image = var.upload_api_image

      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.uploads.name
      }

      env {
        name  = "UPLOADED_FILES_TOPIC"
        value = google_pubsub_topic.uploaded_files.name
      }

      env {
        name  = "UPLOAD_API_KEY"
        value = var.upload_api_key
      }

      env {
        name  = "UPLOAD_API_SIGNER_EMAIL"
        value = google_service_account.upload_api.email
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.firebase_project_id
      }

      env {
        name  = "DB_USER"
        value = var.db_user_upload
      }

      env {
        name  = "DB_NAME"
        value = var.db_name
      }

      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.primary.connection_name
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_upload.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service_iam_member" "upload_api_invoker" {
  count    = var.enable_upload_api && var.upload_api_invoker_service_account != "" ? 1 : 0
  location = google_cloud_run_v2_service.upload_api[0].location
  name     = google_cloud_run_v2_service.upload_api[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.upload_api_invoker_service_account}"
}

resource "google_cloud_run_v2_service_iam_member" "upload_api_public_invoker" {
  count    = var.enable_upload_api && var.upload_api_invoker_service_account == "" ? 1 : 0
  location = google_cloud_run_v2_service.upload_api[0].location
  name     = google_cloud_run_v2_service.upload_api[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "invoker" {
  count    = var.enable_worker ? 1 : 0
  location = google_cloud_run_v2_service.worker[0].location
  name     = google_cloud_run_v2_service.worker[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

resource "google_pubsub_subscription" "push" {
  count = var.enable_worker ? 1 : 0
  name  = "gcs-finalize-push"
  topic = google_pubsub_topic.gcs_events.name

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.worker[0].uri}/pubsub"

    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }
}

resource "google_pubsub_subscription" "uploaded_files_push" {
  count = var.enable_worker ? 1 : 0
  name  = "uploaded-files-push"
  topic = google_pubsub_topic.uploaded_files.name

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.worker[0].uri}/pubsub"

    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }
}

resource "google_pubsub_subscription" "ingestion_completed_push" {
  count = var.enable_metrics_worker ? 1 : 0
  name  = "ingestion-completed-push"
  topic = google_pubsub_topic.ingestion_completed.name

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.metrics_worker[0].uri}/pubsub/ingestion-complete"

    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }
}

resource "google_pubsub_topic_iam_member" "gcs_publisher" {
  topic  = google_pubsub_topic.gcs_events.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_storage_project_service_account.gcs.email_address}"
}

resource "google_pubsub_topic_iam_member" "upload_api_publisher" {
  topic  = google_pubsub_topic.uploaded_files.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.upload_api.email}"
}

resource "google_pubsub_topic_iam_member" "ingest_worker_publisher" {
  topic  = google_pubsub_topic.ingestion_completed.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_storage_bucket_iam_member" "worker_bucket_access" {
  count  = var.enable_worker ? 1 : 0
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_storage_bucket_iam_member" "upload_api_bucket_access" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.upload_api.email}"
}

resource "google_project_iam_member" "worker_cloudsql" {
  count   = (var.enable_worker || var.enable_market_data_worker) ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "upload_api_cloudsql" {
  count   = var.enable_upload_api ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.upload_api.email}"
}

resource "google_secret_manager_secret_iam_member" "worker_db_password_access" {
  count     = (var.enable_worker || var.enable_market_data_worker) ? 1 : 0
  secret_id = google_secret_manager_secret.db_password_upload.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_secret_manager_secret_iam_member" "alphavantage_secret_access" {
  count     = var.enable_market_data_worker ? 1 : 0
  secret_id = var.alphavantage_secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_secret_manager_secret_iam_member" "stockdata_secret_access" {
  count     = var.enable_market_data_worker ? 1 : 0
  secret_id = var.stockdata_secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_secret_manager_secret_iam_member" "upload_api_db_password_access" {
  count     = var.enable_upload_api ? 1 : 0
  secret_id = google_secret_manager_secret.db_password_upload.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.upload_api.email}"
}

resource "google_service_account_iam_member" "upload_api_token_creator" {
  service_account_id = google_service_account.upload_api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.upload_api.email}"
}

resource "google_cloud_run_v2_service" "portfolio_api" {
  count    = var.enable_portfolio_api ? 1 : 0
  name     = var.portfolio_api_name
  location = var.region

  template {
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.primary.connection_name
    }

    service_account = google_service_account.worker.email

    containers {
      image = var.portfolio_api_image

      env {
        name  = "DB_USER"
        value = var.db_user_upload
      }

      env {
        name  = "DB_NAME"
        value = var.db_name
      }

      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.primary.connection_name
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_upload.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.firebase_project_id
      }
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service_iam_member" "portfolio_api_public_invoker" {
  count    = var.enable_portfolio_api && var.portfolio_api_public ? 1 : 0
  location = google_cloud_run_v2_service.portfolio_api[0].location
  name     = google_cloud_run_v2_service.portfolio_api[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
