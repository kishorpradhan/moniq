#!/usr/bin/env python3
import os
import subprocess
import sys
import urllib.request


def run(cmd: list[str]) -> str:
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return result.stdout.strip()


def main() -> int:
    project_id = os.getenv("PROJECT_ID", "moniq-490803")
    instance_name = os.getenv("INSTANCE_NAME", "moniq-postgres")
    db_name = os.getenv("DB_NAME", "moniq_stocks")
    db_user = os.getenv("DB_USER", "moniq_upload")
    migration_file = os.getenv("MIGRATION_FILE", "db/migrations/001_create_activities.sql")
    upload_secret_name = os.getenv("UPLOAD_SECRET_NAME", "moniq-upload-db-password")

    if not os.path.isfile(migration_file):
        print(f"Migration file not found: {migration_file}", file=sys.stderr)
        return 1

    print(f"Using project: {project_id}")
    print(f"Instance: {instance_name}")
    print(f"Database: {db_name}")
    print(f"User: {db_user}")
    print(f"Migration: {migration_file}")

    print("Fetching public IP for instance...")
    instance_ip = run(
        [
            "gcloud",
            "sql",
            "instances",
            "describe",
            instance_name,
            "--project",
            project_id,
            "--format",
            "value(ipAddresses[0].ipAddress)",
        ]
    )
    if not instance_ip:
        print("Could not determine instance IP.", file=sys.stderr)
        return 1

    print("Whitelisting your current IP for Cloud SQL...")
    try:
        my_ip = (
            urllib.request.urlopen("https://api.ipify.org", timeout=10)
            .read()
            .decode()
            .strip()
        )
    except Exception:
        my_ip = urllib.request.urlopen("https://ifconfig.me", timeout=10).read().decode().strip()
    run(
        [
            "gcloud",
            "sql",
            "instances",
            "patch",
            instance_name,
            "--project",
            project_id,
            "--authorized-networks",
            f"{my_ip}/32",
            "--quiet",
        ]
    )

    print("Reading DB password from Secret Manager...")
    db_password = run(
        [
            "gcloud",
            "secrets",
            "versions",
            "access",
            "latest",
            "--project",
            project_id,
            "--secret",
            upload_secret_name,
        ]
    )

    print("Running migration...")
    env = os.environ.copy()
    env["PGPASSWORD"] = db_password
    conn_str = f"host={instance_ip} user={db_user} dbname={db_name} sslmode=require"
    subprocess.run(
        [
            "psql",
            conn_str,
            "-v",
            "ON_ERROR_STOP=1",
            "-f",
            migration_file,
        ],
        check=True,
        env=env,
    )

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
