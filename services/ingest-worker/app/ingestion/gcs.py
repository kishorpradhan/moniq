from google.cloud import storage


def open_text_stream(bucket: str, name: str):
    client = storage.Client()
    blob = client.bucket(bucket).blob(name)
    return blob.open("rb")
