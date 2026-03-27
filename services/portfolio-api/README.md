# Portfolio API

Expose portfolio summary, allocation, and positions over HTTP.

## Env vars
- `DATABASE_URL` or
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `INSTANCE_CONNECTION_NAME`
- `DB_SSLMODE` (default: require)

## Endpoints
- `GET /health`
- `GET /portfolio/summary`
- `GET /portfolio/allocation`
- `GET /portfolio/positions`
