# Platform support

The runtime is designed around one private HTTP API. That gateway is not implemented yet: no HTTP server exists in `src/`, and the only shipped CLI (`segment-document`) reads a JSON document from stdin. Clients never connect directly to PostgreSQL, vector indexes, object storage, workers, or graph data.

## Recommendation

Use the responsive web application/PWA as the primary human interface and the terminal client as the first automation interface. Add desktop or native mobile shells only when a concrete capability justifies another release target.

| Surface | Support level | Implementation | Constraint |
|---|---|---|---|
| Linux terminal | First-class | Designed as a CLI and Pi extension over the API; today only `segment-document` ships | The CLI must not read the database directly |
| Linux distributions | Runtime portability | Docker Compose or compatible container runtime | Validate the claimed distro matrix; do not promise every distro without tests |
| macOS | First-class operator platform | Browser, terminal client, optional desktop shell | Docker Desktop is the supported local runtime path |
| Web desktop | Primary | Responsive web UI behind the local gateway | Bind the gateway to loopback by default |
| Android | Initial | Installable PWA in a supported browser | Native APIs and offline behavior are limited |
| iPhone/iPad | Initial | Installable PWA in Safari or another supported browser | Provide platform-specific installation instructions |
| Desktop native | Optional | Tauri 2 shell over the same web/API contract | Tauri adds packaging and signing work |
| Android/iOS native | Deferred | Tauri 2 or a dedicated client only if required | iOS builds require macOS, Xcode and Apple signing |

Docker Compose improves reproducibility across Linux and macOS, but it is not proof of support for every Linux distribution. The project should publish a tested matrix instead of an unbounded compatibility claim.

## Why API-first wins

- One authorization and audit boundary.
- One retrieval and citation implementation.
- Web, terminal, PWA, desktop, and mobile clients share the same behavior.
- Native mobile development remains optional.
- The private P.IVA runtime stays local even when a client is packaged for another platform.

## Evidence

- [Docker Compose installation](https://docs.docker.com/compose/install/)
- [Tauri 2 start guide](https://v2.tauri.app/start/)
- [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/)
- [MDN: making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

These sources describe capabilities and prerequisites. They do not constitute this project's compatibility certification.
