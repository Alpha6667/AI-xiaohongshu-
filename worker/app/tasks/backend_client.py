from __future__ import annotations

import json
import os
from urllib import error, request


def post_backend(path: str, payload: dict[str, object]) -> dict[str, object]:
    base_url = os.getenv("BACKEND_BASE_URL", "http://localhost:8000").rstrip("/")
    url = f"{base_url}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=10) as resp:
            response_body = resp.read().decode("utf-8")
    except error.URLError as exc:
        raise RuntimeError(f"backend request failed for {path}") from exc

    if not response_body:
        return {}
    return json.loads(response_body)
