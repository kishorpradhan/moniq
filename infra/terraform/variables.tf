variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "worker_image" {
  type        = string
  description = "Container image for the ingest worker (e.g., us-central1-docker.pkg.dev/PROJECT/repo/ingest-worker:tag)"
}

variable "uploads_bucket_name" {
  type    = string
  default = "moniq-client-uploads"
}

variable "uploaded_files_topic_name" {
  type    = string
  default = "uploadedfiles"
}

variable "service_name" {
  type    = string
  default = "moniq-ingest-worker"
}

variable "enable_worker" {
  type    = bool
  default = false
}

variable "upload_api_service_name" {
  type    = string
  default = "moniq-upload-api"
}

variable "upload_api_image" {
  type        = string
  description = "Container image for the upload API (e.g., us-central1-docker.pkg.dev/PROJECT/repo/upload-api:tag)"
}

variable "enable_upload_api" {
  type    = bool
  default = false
}

variable "upload_api_invoker_service_account" {
  type        = string
  default     = ""
  description = "Service account email allowed to invoke upload API. Leave empty to skip binding."
}

variable "upload_api_key" {
  type        = string
  description = "API key required in x-api-key header for upload API."
}

variable "artifact_repo_name" {
  type    = string
  default = "moniq"
}
