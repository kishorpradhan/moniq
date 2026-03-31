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

variable "ingestion_completed_topic_name" {
  type    = string
  default = "ingestion-completed"
}

variable "service_name" {
  type    = string
  default = "moniq-ingest-worker"
}

variable "enable_worker" {
  type    = bool
  default = false
}

variable "market_data_worker_image" {
  type        = string
  description = "Container image for the market data worker (e.g., gcr.io/PROJECT/market-data-worker:tag)"
}

variable "market_data_worker_name" {
  type    = string
  default = "moniq-market-data-worker"
}

variable "enable_market_data_worker" {
  type    = bool
  default = false
}

variable "market_data_worker_public" {
  type    = bool
  default = true
}

variable "metrics_worker_image" {
  type        = string
  description = "Container image for the metrics worker (e.g., gcr.io/PROJECT/metrics-worker:tag)"
}

variable "metrics_worker_name" {
  type    = string
  default = "moniq-metrics-worker"
}

variable "enable_metrics_worker" {
  type    = bool
  default = false
}

variable "alphavantage_secret_id" {
  type    = string
  default = "alphavantage-api-key"
}

variable "stockdata_secret_id" {
  type    = string
  default = "stockdata-api-key"
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

variable "db_instance_name" {
  type    = string
  default = "moniq-postgres"
}

variable "db_version" {
  type    = string
  default = "POSTGRES_15"
}

variable "db_tier" {
  type    = string
  default = "db-f1-micro"
}

variable "db_name" {
  type    = string
  default = "moniq_stocks"
}

variable "db_user_upload" {
  type    = string
  default = "moniq_upload"
}

variable "db_user_read" {
  type    = string
  default = "moniq_read"
}

variable "portfolio_api_image" {
  type        = string
  description = "Container image for the portfolio API (e.g., gcr.io/PROJECT/portfolio-api:tag)"
  default     = ""
}

variable "portfolio_api_name" {
  type    = string
  default = "moniq-portfolio-api"
}

variable "enable_portfolio_api" {
  type    = bool
  default = false
}

variable "portfolio_api_public" {
  type    = bool
  default = true
}

variable "firebase_project_id" {
  type        = string
  description = "Firebase project id for verifying Firebase Auth tokens."
}
