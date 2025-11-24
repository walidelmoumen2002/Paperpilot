import logging
import os
import time

from sqlalchemy import text
from sqlmodel import Session

from .deps.db import engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    logger.info("Worker started. Waiting for jobs (placeholder worker).")
    poll_seconds = int(os.getenv("WORKER_POLL_INTERVAL", "30"))
    while True:
        try:
            with Session(engine) as session:
                session.exec(text("SELECT 1"))
            logger.debug("Worker DB heartbeat succeeded.")
        except Exception as exc:  # pragma: no cover - log-only path
            logger.error("Worker DB heartbeat failed: %s", exc)
        time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
