import json
import os
import sqlite3
import time
import urllib.error
import urllib.request
from pathlib import Path


DATABASE_PATH = Path("/app/backend/data/webui.db")
FUNCTIONS = (
    ("gateway-retrieval", "Gateway retrieval", "filter", Path("/app/backend/data/functions/filters/gateway_retrieval.py")),
    ("gateway-research", "Gateway research", "pipe", Path("/app/backend/data/functions/pipes/gateway_research.py")),
)


def wait_for_shell():
    for _ in range(120):
        try:
            with urllib.request.urlopen("http://127.0.0.1:3300/health", timeout=2) as response:
                if response.status == 200:
                    return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(1)
    raise RuntimeError("Open WebUI did not become healthy")


def main():
    wait_for_shell()
    token = os.environ.get("GATEWAY_TOKEN")
    gateway_url = os.environ.get("GATEWAY_URL")
    if not token or not gateway_url:
        raise RuntimeError("GATEWAY_TOKEN and GATEWAY_URL are required")
    valves = json.dumps({"GATEWAY_URL": gateway_url, "GATEWAY_TOKEN": token})
    with sqlite3.connect(DATABASE_PATH, timeout=30) as database:
        for function_id, name, function_type, source_path in FUNCTIONS:
            content = source_path.read_text()
            now = int(time.time())
            database.execute(
                """
                INSERT INTO function
                    (id, user_id, name, type, content, meta, valves, is_active, is_global, updated_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    type = excluded.type,
                    content = excluded.content,
                    meta = excluded.meta,
                    valves = excluded.valves,
                    is_active = 1,
                    is_global = 1,
                    updated_at = excluded.updated_at
                """,
                (
                    function_id,
                    "bootstrap",
                    name,
                    function_type,
                    content,
                    json.dumps({"description": name, "manifest": {}}),
                    valves,
                    now,
                    now,
                ),
            )
        database.commit()
    print("Open WebUI gateway functions bootstrapped")


if __name__ == "__main__":
    main()
