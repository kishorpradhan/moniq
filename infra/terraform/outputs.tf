output "bucket_name" {
  value = google_storage_bucket.uploads.name
}

output "pubsub_topic" {
  value = google_pubsub_topic.gcs_events.name
}

output "uploaded_files_topic" {
  value = google_pubsub_topic.uploaded_files.name
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
