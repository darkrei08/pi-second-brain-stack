"""Open WebUI Pipe exposing grounded research answers from the gateway."""

import asyncio
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

try:
    from pydantic import BaseModel
except ImportError:
    class BaseModel:
        def __init__(self, **values):
            for name, default in self.__class__.__dict__.items():
                if name.isupper():
                    setattr(self, name, values.get(name, default))


MAX_RESPONSE_BYTES = 1024 * 1024


class GlueError(RuntimeError):
    pass


class GatewayError(GlueError):
    pass


def _gateway_url(base_url, route):
    if not isinstance(base_url, str) or not base_url.strip():
        raise GatewayError("gateway URL is required")
    parsed = urlsplit(base_url)
    if parsed.scheme not in {"http", "https"} or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise GatewayError("gateway URL must be an http(s) origin")
    if parsed.scheme == "http" and parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise GatewayError("gateway HTTP URL must use loopback")
    return base_url.rstrip("/") + route


def _user_text(body):
    messages = body.get("messages")
    if not isinstance(messages, list):
        raise GlueError("messages must be a list")
    for message in reversed(messages):
        if not isinstance(message, dict) or message.get("role") != "user":
            continue
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()
        if isinstance(content, list):
            parts = [part.get("text", "") for part in content if isinstance(part, dict) and isinstance(part.get("text"), str)]
            text = "".join(parts).strip()
            if text:
                return text
    raise GlueError("a user question is required")


def _headers(token, shell_user_id):
    if not isinstance(token, str) or not token:
        raise GatewayError("gateway token is required")
    result = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if isinstance(shell_user_id, str) and shell_user_id:
        result["x-shell-user-id"] = shell_user_id
    return result


def _post_json_sync(url, token, shell_user_id, payload, timeout):
    request = Request(
        url,
        data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers=_headers(token, shell_user_id),
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise GatewayError("gateway request failed") from error
    if len(raw) > MAX_RESPONSE_BYTES:
        raise GatewayError("gateway response is too large")
    try:
        result = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise GatewayError("gateway response is not valid JSON") from error
    if not isinstance(result, dict):
        raise GatewayError("gateway response must be an object")
    return result


async def post_json(url, token, shell_user_id, payload, timeout):
    return await asyncio.to_thread(_post_json_sync, url, token, shell_user_id, payload, timeout)


def _render_answer(result):
    if not isinstance(result, dict) or not isinstance(result.get("answer"), str):
        raise GlueError("gateway answer is malformed")
    citations = result.get("citations", [])
    uncertainty = result.get("uncertainty", {})
    if not isinstance(citations, list) or not isinstance(uncertainty, dict):
        raise GlueError("gateway answer metadata is malformed")
    rendered = []
    for citation in citations:
        if not isinstance(citation, dict):
            raise GlueError("gateway citation is malformed")
        detail = citation.get("citation", {})
        if not isinstance(detail, dict):
            raise GlueError("gateway citation detail is malformed")
        label = detail.get("label", "unknown source")
        reference = detail.get("ref", "")
        rendered.append(f"- {label} {reference}".strip())
    result_text = result["answer"]
    result_text += "\n\nResearch uncertainty: " + str(uncertainty.get("level", "unknown"))
    if rendered:
        result_text += "\nResearch citations:\n" + "\n".join(rendered)
    return result_text


class Pipe:
    class Valves(BaseModel):
        GATEWAY_URL: str = "http://127.0.0.1:8080"
        GATEWAY_TOKEN: str = ""
        EMBEDDING_MODEL_ID: str = ""
        TIMEOUT_SECONDS: float = 15.0

    def __init__(self):
        self.valves = self.Valves()

    def pipes(self):
        return [{"id": "research", "name": "Research"}]

    async def pipe(self, body: dict, __user__: dict | None = None) -> str:
        if not isinstance(body, dict):
            raise GlueError("body must be an object")
        question = _user_text(body)
        payload = {"question": question}
        folder_id = body.get("folder_id")
        if folder_id is not None:
            if not isinstance(folder_id, str) or not folder_id.strip():
                raise GlueError("folder_id must be non-empty text")
            payload["collection_ids"] = [folder_id]
        if self.valves.EMBEDDING_MODEL_ID:
            payload["embedding_model_id"] = self.valves.EMBEDDING_MODEL_ID
        shell_user_id = __user__.get("id") if isinstance(__user__, dict) else None
        result = await post_json(
            _gateway_url(self.valves.GATEWAY_URL, "/v1/answers"),
            self.valves.GATEWAY_TOKEN,
            shell_user_id,
            payload,
            self.valves.TIMEOUT_SECONDS,
        )
        return _render_answer(result)
