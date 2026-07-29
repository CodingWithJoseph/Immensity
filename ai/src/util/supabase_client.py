"""Supabase clients with an explicit read/write credential boundary."""

import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()


def get_client(*, write_mode: bool = False) -> Client:
    """Create a read client or a service-role-only write client."""
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    key = service_key if write_mode else (os.getenv("SUPABASE_KEY") or service_key)

    if not url:
        raise EnvironmentError("SUPABASE_URL must be set in .env")
    if write_mode and not service_key:
        raise EnvironmentError("Supabase writes require SUPABASE_SERVICE_ROLE_KEY.")
    if not key:
        raise EnvironmentError("SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY must be set in .env")

    return create_client(url, key)
