# Metrics Worker

Recomputes portfolio metrics (XIRR) from activities + prices.

## Local run
```bash
cd services/metrics-worker
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Example request
```bash
curl -X POST http://localhost:8000/metrics/recompute \
  -H 'Content-Type: application/json' \
  -d '{"as_of_date":"2026-03-23"}'
```

To recompute for a single account:
```bash
curl -X POST http://localhost:8000/metrics/recompute \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"...","account_id":"...","as_of_date":"2026-03-23"}'
```
