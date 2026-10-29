from ipaddress import ip_address
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel, Field


TIMEOUT_SECONDS = 10.0


def _gateway_url(value):
    if not isinstance(value, str) or not value:
        raise RuntimeError("Invalid gateway URL")
    try:
        parsed = urlsplit(value)
        parsed.port
    except ValueError:
        raise RuntimeError("Invalid gateway URL") from None
    host = parsed.hostname
    if not host or parsed.username is not None or parsed.password is not None or parsed.query or parsed.fragment:
        raise RuntimeError("Invalid gateway URL")
    try:
        loopback = host.lower() == "localhost" or ip_address(host).is_loopback
    except ValueError:
        loopback = host.lower() == "localhost"
    if parsed.scheme != "https" and not (parsed.scheme == "http" and loopback):
        raise RuntimeError("Non-loopback gateway URLs must use HTTPS")
    return value.rstrip("/")


def _user_id(user):
    value = user.get("id") if isinstance(user, dict) else None
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError("Open WebUI user identity is required")
    return value


def _latest_user_message(messages):
    if not isinstance(messages, list):
        raise RuntimeError("Pipe requires chat messages")
    for message in reversed(messages):
        if not isinstance(message, dict) or message.get("role") != "user":
            continue
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()
        if isinstance(content, list):
            text = " ".join(
                part["text"].strip()
                for part in content
                if isinstance(part, dict) and part.get("type") == "text"
                and isinstance(part.get("text"), str) and part["text"].strip()
            )
            if text:
                return text
        break
    raise RuntimeError("Pipe requires a user message")


class Pipe:
    class Valves(BaseModel):
        GATEWAY_URL: str = Field(default="http://127.0.0.1:8080", description="Loopback gateway URL, or an HTTPS URL")
        GATEWAY_TOKEN: str = Field(default="", description="Gateway bearer token")

    def __init__(self):
        self.valves = self.Valves()

    async def _research(self, payload, user_id):
        base_url = _gateway_url(self.valves.GATEWAY_URL)
        token = self.valves.GATEWAY_TOKEN
        if not isinstance(token, str) or not token:
            raise RuntimeError("Gateway token is not configured")
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=False) as client:
                response = await client.post(
                    f"{base_url}/v1/research",
                    json=payload,
                    headers={
                        "authorization": f"Bearer {token}",
                        "x-shell-user-id": user_id,
                    },
                )
                response.raise_for_status()
                return response.json()
        except Exception:
            raise RuntimeError("Gateway research failed") from None

    async def pipe(self, body, __user__=None, __metadata__=None):
        user_id = _user_id(__user__)
        if not isinstance(body, dict):
            raise RuntimeError("Pipe requires chat data")
        payload = {"question": _latest_user_message(body.get("messages"))}
        if isinstance(__metadata__, dict) and __metadata__.get("folder_id") is not None:
            folder_id = __metadata__["folder_id"]
            if not isinstance(folder_id, str) or not folder_id.strip() or folder_id != folder_id.strip():
                raise RuntimeError("Invalid Open WebUI folder scope")
            payload["collection_ids"] = [folder_id]

        result = await self._research(payload, user_id)
        if not isinstance(result, dict) or not isinstance(result.get("answer"), str):
            raise RuntimeError("Gateway research failed")
        citations = result.get("citations", [])
        if not isinstance(citations, list):
            raise RuntimeError("Gateway research failed")

        lines = [result["answer"], "", "Citations:"]
        if citations:
            for item in citations:
                if not isinstance(item, dict):
                    raise RuntimeError("Gateway research failed")
                citation = item.get("citation")
                if not isinstance(citation, dict):
                    raise RuntimeError("Gateway research failed")
                label = citation.get("label")
                reference = citation.get("ref")
                if label is not None and not isinstance(label, str):
                    raise RuntimeError("Gateway research failed")
                if reference is not None and not isinstance(reference, str):
                    raise RuntimeError("Gateway research failed")
                lines.append(f"- {label or 'source'}{f' {reference}' if reference else ''}")
        else:
            lines.append("- none")

        unresolved = result.get("unresolved_citations", [])
        stale = result.get("stale_citations", [])
        if (not isinstance(unresolved, list)
                or any(not isinstance(value, int) or isinstance(value, bool) for value in unresolved)
                or not isinstance(stale, list)
                or any(not isinstance(value, str) for value in stale)):
            raise RuntimeError("Gateway research failed")
        if unresolved:
            lines.append(f"Unresolved citations: {', '.join(str(value) for value in unresolved)}")
        if stale:
            lines.append(f"Stale citations: {', '.join(str(value) for value in stale)}")
        uncertainty = result.get("uncertainty")
        if not isinstance(uncertainty, dict) or not isinstance(uncertainty.get("level"), str):
            raise RuntimeError("Gateway research failed")
        lines.extend(["", f"Uncertainty: {uncertainty['level']}"])
        return "\n".join(lines)
