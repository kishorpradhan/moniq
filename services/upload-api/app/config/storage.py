import os

from google.cloud import storage

bucket_name = os.getenv("GCS_BUCKET")
if not bucket_name:
    raise RuntimeError("Missing env var: GCS_BUCKET")

storage_client = storage.Client()
bucket = storage_client.bucket(bucket_name)
