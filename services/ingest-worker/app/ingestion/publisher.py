import json
import logging
import os
from typing import Iterable

from google.cloud import pubsub_v1


logger = logging.getLogger("ingest-worker")

_publisher = None


def _get_publisher():
    global _publisher
    if _publisher is None:
        _publisher = pubsub_v1.PublisherClient()
    return _publisher


def publish_ingestion_completed(events: Iterable[dict]) -> int:
    project_id = os.getenv("PROJECT_ID")
    topic_name = os.getenv("INGESTION_COMPLETED_TOPIC", "ingestion-completed")
    if not project_id or not topic_name:
        logger.warning(
            "ingestion_complete_publish_skipped_missing_env",
            extra={"project_id": project_id, "topic": topic_name},
        )
        return 0

    publisher = _get_publisher()
    topic_path = publisher.topic_path(project_id, topic_name)
    published = 0
    for event in events:
        data = json.dumps(event).encode("utf-8")
        publisher.publish(topic_path, data)
        published += 1
    return published
