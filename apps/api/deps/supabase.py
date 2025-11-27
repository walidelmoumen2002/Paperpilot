import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase client initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase client: {e}")
else:
    logger.warning(
        "⚠️ SUPABASE_URL or SUPABASE_KEY not set. Storage features will fail."
    )


def get_supabase_client() -> Client:
    """
    Returns the Supabase client instance.
    Raises an error if not configured, ensuring workers fail fast if config is missing.
    """
    if not supabase:
        raise ValueError("Supabase client is not configured. Check .env variables.")
    return supabase
