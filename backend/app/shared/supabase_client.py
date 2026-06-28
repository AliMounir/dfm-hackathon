"""Minimal Supabase access for the backend (REST + Storage) over httpx.

Uses the service-role key (RLS is disabled for the prototype). Reads config from
``app.core.config``. Kept dependency-light (httpx is already a dependency).
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings


def _key() -> str:
    s = get_settings()
    return s.supabase_service_role_key or s.supabase_anon_key


def _headers() -> dict[str, str]:
    key = _key()
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def configured() -> bool:
    s = get_settings()
    return bool(s.supabase_url and _key())


def rest_select(table: str, params: dict[str, str]) -> list[dict]:
    """Run a PostgREST select on a table. Returns [] if Supabase isn't configured."""
    s = get_settings()
    if not configured():
        return []
    url = f"{s.supabase_url}/rest/v1/{table}"
    with httpx.Client(timeout=20.0) as client:
        resp = client.get(url, headers={**_headers(), "Accept": "application/json"}, params=params)
        resp.raise_for_status()
        return resp.json()


def storage_download(bucket: str, path: str) -> bytes:
    """Download an object from a (private) storage bucket."""
    s = get_settings()
    url = f"{s.supabase_url}/storage/v1/object/{bucket}/{path}"
    with httpx.Client(timeout=60.0) as client:
        resp = client.get(url, headers=_headers())
        resp.raise_for_status()
        return resp.content
