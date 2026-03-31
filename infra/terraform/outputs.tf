output "bucket_name" {
  value = google_storage_bucket.uploads.name
}

output "pubsub_topic" {
  value = google_pubsub_topic.gcs_events.name
}

output "uploaded_files_topic" {
  value = google_pubsub_topic.uploaded_files.name
}

output "ingestion_completed_topic" {
  value = google_pubsub_topic.ingestion_completed.name
}

output "upload_api_service_account" {
  value = google_service_account.upload_api.email
}

output "cloud_run_service_url" {
  value = var.enable_worker ? google_cloud_run_v2_service.worker[0].uri : null
}

output "upload_api_url" {
  value = var.enable_upload_api ? google_cloud_run_v2_service.upload_api[0].uri : null
}

output "db_instance_connection_name" {
  value = google_sql_database_instance.primary.connection_name
}

output "db_name" {
  value = google_sql_database.primary.name
}

output "db_user_upload" {
  value = google_sql_user.upload.name
}

output "db_user_read" {
  value = google_sql_user.read.name
}

output "db_password_upload_secret" {
  value = google_secret_manager_secret.db_password_upload.name
}

output "db_password_read_secret" {
  value = google_secret_manager_secret.db_password_read.name
}

output "portfolio_api_url" {
  value = var.enable_portfolio_api ? google_cloud_run_v2_service.portfolio_api[0].uri : null
}

output "metrics_worker_url" {
  value = var.enable_metrics_worker ? google_cloud_run_v2_service.metrics_worker[0].uri : null
}
