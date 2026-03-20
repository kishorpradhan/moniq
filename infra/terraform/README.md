# Terraform (GCP)

Creates:
- GCS bucket (uploads)
- Pub/Sub topics (GCS finalize + upload notifications) + push subscription
- Cloud Run service (ingest worker)
- Upload API service account
- IAM wiring (GCS -> Pub/Sub, Pub/Sub -> Cloud Run, upload API publisher)
- Artifact Registry repo (Docker)

## Prereqs
- Terraform >= 1.5
- `gcloud auth application-default login`
- Project: `moniq-490803`

## Configure
1. `cd infra/terraform`
2. `cp terraform.tfvars.example terraform.tfvars`
3. Set `worker_image` to your built image URL
4. (Optional) Set `uploads_bucket_name` if you want a different bucket name
5. Set `enable_worker = true` only after you have pushed the ingest worker image
6. Set `upload_api_image` and `enable_upload_api = true` to deploy the upload API
7. Set `upload_api_invoker_service_account` to the frontend service account email
8. Set `upload_api_key` to a strong random value (used for x-api-key)
9. (Optional) Set `artifact_repo_name` if you want a different Artifact Registry repo

## Apply
```bash
terraform init
terraform apply
```

## Outputs
- `bucket_name`
- `uploaded_files_topic`
- `upload_api_service_account`
- `cloud_run_service_url`
- `upload_api_url`

Use `bucket_name` as `GCS_BUCKET` in the upload API.
Use `uploaded_files_topic` as the Pub/Sub topic for upload notifications.
