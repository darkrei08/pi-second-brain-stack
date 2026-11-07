"""Open WebUI Pipe exposing grounded answers from the gateway."""

import asyncio
import json
from ipaddress import ip_address
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


def _cleartext_allowed(host):
    """Cleartext may not leave the deployment: loopback or a compose service name."""
    lowered = host.lower()
    if lowered == "localhost":
        return True
    try:
        return ip_address(lowered).is_loopback
    except ValueError:
        # A single label resolves only through the container's own DNS, so it
        # names a compose service instead of a remote host.
        return "." not in lowered and ":" not in lowered


def _gateway_url(base_url, route):
    if not isinstance(base_url, str) or not base_url.strip():
        raise GatewayError("gateway URL is required")
    try:
        parsed = urlsplit(base_url)
        parsed.port
    except ValueError:
        raise GatewayError("gateway URL must be a valid origin") from None
    host = parsed.hostname
    if (parsed.scheme not in {"http", "https"} or not host
            or parsed.username or parsed.password or parsed.query or parsed.fragment
            or (parsed.scheme != "https" and not _cleartext_allowed(host))):
        raise GatewayError("gateway URL must be an HTTPS URL or an internal HTTP URL")
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
            parts = [
                part.get("text", "")
                for part in content
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            ]
            text = "".join(parts).strip()
            if text:
                return text
    raise GlueError("a user question is required")


def _user_id(user):
    value = user.get("id") if isinstance(user, dict) else None
    if not isinstance(value, str) or not value.strip():
        raise GlueError("Open WebUI user identity is required")
    return value


def _headers(token, shell_user_id):
    if not isinstance(token, str) or not token:
        raise GatewayError("gateway token is required")
    result = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if shell_user_id:
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
    if not isinstance(citations, list):
        raise GlueError("gateway answer metadata is malformed")

    lines = [result["answer"], "", "Citations:"]
    for item in citations:
        if not isinstance(item, dict) or not isinstance(item.get("citation"), dict):
            raise GlueError("gateway citation is malformed")
        citation = item["citation"]
        label = citation.get("label")
        reference = citation.get("ref")
        if label is not None and not isinstance(label, str):
            raise GlueError("gateway citation is malformed")
        if reference is not None and not isinstance(reference, str):
            raise GlueError("gateway citation is malformed")
        lines.append(f"- {label or 'source'}{f' {reference}' if reference else ''}")
    if not citations:
        lines.append("- none")

    unresolved = result.get("unresolved_citations", [])
    stale = result.get("stale_citations", [])
    if (not isinstance(unresolved, list)
            or any(not isinstance(value, int) or isinstance(value, bool) for value in unresolved)
            or not isinstance(stale, list)
            or any(not isinstance(value, str) for value in stale)):
        raise GlueError("gateway answer metadata is malformed")
    if unresolved:
        lines.append(f"Unresolved citations: {', '.join(str(value) for value in unresolved)}")
    if stale:
        lines.append(f"Stale citations: {', '.join(stale)}")

    uncertainty = result.get("uncertainty")
    if not isinstance(uncertainty, dict) or not isinstance(uncertainty.get("level"), str):
        raise GlueError("gateway answer metadata is malformed")
    lines.extend(["", f"Uncertainty: {uncertainty['level']}"])
    return "\n".join(lines)


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

    async def pipe(self, body: dict, __user__: dict | None = None, __metadata__: dict | None = None) -> str:
        if not isinstance(body, dict):
            raise GlueError("body must be an object")
        shell_user_id = _user_id(__user__)
        payload = {"question": _user_text(body)}
        metadata_folder_id = __metadata__.get("folder_id") if isinstance(__metadata__, dict) else None
        folder_id = metadata_folder_id if metadata_folder_id is not None else body.get("folder_id")
        if folder_id is not None:
            if not isinstance(folder_id, str) or not folder_id.strip() or folder_id != folder_id.strip():
                raise GlueError("folder_id must be non-empty text")
            payload["collection_ids"] = [folder_id]
        if self.valves.EMBEDDING_MODEL_ID:
            payload["embedding_model_id"] = self.valves.EMBEDDING_MODEL_ID
        result = await post_json(
            _gateway_url(self.valves.GATEWAY_URL, "/v1/answers"),
            self.valves.GATEWAY_TOKEN,
            shell_user_id,
            payload,
            self.valves.TIMEOUT_SECONDS,
        )
        return _render_answer(result)
