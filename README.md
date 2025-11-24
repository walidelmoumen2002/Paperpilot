# ai-research-coach

## Docker Compose (PostgreSQL, Redis, API, Worker)

1. Copy the sample environment file: `cp .env.example .env` and fill in `SUPABASE_*` and any secrets.
2. Start the stack: `docker compose up --build`.
3. API available at http://localhost:8000 (healthcheck at `/health`).
4. Postgres is exposed on `localhost:5432` with credentials from `.env`; Redis on `localhost:6379`.
5. The `worker` container runs a placeholder loop and keeps a DB heartbeat—replace `apps/api/worker.py` with your job logic.

Hot reload for the API is enabled through the source volume mount in `docker-compose.yml`. Stop everything with `docker compose down`.
