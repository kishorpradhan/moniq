import importlib
import json

from fastapi.testclient import TestClient


def _build_app(monkeypatch):
    monkeypatch.setenv("GCS_BUCKET", "test-bucket")
    monkeypatch.setenv("UPLOADED_FILES_TOPIC", "uploadedfiles")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project")
    monkeypatch.setenv("UPLOAD_API_SIGNER_EMAIL", "")
    monkeypatch.setenv("UPLOAD_API_KEY", "test-key")
    monkeypatch.setenv("AUTH_BYPASS", "true")
    monkeypatch.setenv("AUTH_BYPASS_USER_ID", "test-user")

    from google.cloud import pubsub_v1
    from google.cloud import storage
    from google.auth.transport.requests import Request as GoogleAuthRequest

    class FakeBlob:
        def __init__(self, path):
            self.path = path

        def generate_signed_url(self, **_kwargs):
            return "https://signed-url"

    class FakeBucket:
        def blob(self, path):
            return FakeBlob(path)

    class FakeStorageClient:
        def bucket(self, _name):
            return FakeBucket()

    class FakePublishFuture:
        def result(self, timeout=None):
            return True

    class FakePublisher:
        def __init__(self):
            self.published = []

        def topic_path(self, project, topic):
            return f"projects/{project}/topics/{topic}"

        def publish(self, topic_path, data):
            self.published.append((topic_path, data))
            return FakePublishFuture()

    def fake_auth_default(*_args, **_kwargs):
        class FakeCreds:
            token = "token"

            def refresh(self, _request: GoogleAuthRequest):
                return None

        return FakeCreds(), "test-project"

    monkeypatch.setattr(storage, "Client", FakeStorageClient)
    monkeypatch.setattr(pubsub_v1, "PublisherClient", FakePublisher)

    import app.config.storage as storage_mod
    import app.routes.uploads as uploads_mod
    import app.main as main_mod

    monkeypatch.setattr(uploads_mod, "google_auth_default", fake_auth_default)

    importlib.reload(storage_mod)
    importlib.reload(uploads_mod)
    importlib.reload(main_mod)

    return main_mod.app, uploads_mod


def test_presign_returns_signed_url(monkeypatch):
    app, uploads = _build_app(monkeypatch)
    client = TestClient(app)

    monkeypatch.setattr(uploads.time, "time", lambda: 1700000000.0)

    resp = client.post(
        "/uploads/presign",
        headers={"x-api-key": "test-key"},
        json={"filename": "test.csv", "contentType": "text/csv"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["uploadUrl"] == "https://signed-url"
    assert data["filePath"].startswith("uploads/1700000000000-")


def test_complete_publishes_message(monkeypatch):
    app, uploads = _build_app(monkeypatch)
    client = TestClient(app)

    fake_publisher = uploads.publisher
    uploads.topic_path = fake_publisher.topic_path("test-project", "uploadedfiles")

    resp = client.post(
        "/uploads/complete",
        headers={"x-api-key": "test-key"},
        json={"filePath": "uploads/x.csv"},
    )
    assert resp.status_code == 200

    assert len(fake_publisher.published) == 1
    topic_path, data = fake_publisher.published[0]
    assert topic_path == "projects/test-project/topics/uploadedfiles"
    assert json.loads(data.decode("utf-8")) == {
        "bucket": "test-bucket",
        "name": "uploads/x.csv",
        "user_id": "test-user",
    }
