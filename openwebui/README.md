# Pi Second Brain Shell

Plugins for the pinned Open WebUI image `ghcr.io/open-webui/open-webui:v0.6.5`.
This repository is a plugin package, not a fork and not a copy of Open WebUI.

## Compatibility and licence

The exact `v0.6.5` image tag's upstream `LICENSE` is BSD 3-Clause:
<https://github.com/open-webui/open-webui/blob/v0.6.5/LICENSE>.
The image remains third-party software under that licence. This package does not
vendor Open WebUI source or change the licence position of the image.

## Configuration

Both plugins require these admin Valves:

- `GATEWAY_URL`: the gateway base URL (`http://127.0.0.1:8080` for loopback, or HTTPS remotely)
- `GATEWAY_TOKEN`: the gateway bearer token

`bootstrap.py` reads those values from the runtime environment and stores them
in the Open WebUI Function records. No secret is included in this repository,
its test fixtures, or its CI configuration; provide the values at startup.

## Startup

Mount `filters/` and `pipes/` into the Open WebUI container's Function
locations, and mount `bootstrap.py` as `/opt/second-brain/bootstrap.py`. Start
Open WebUI with the pinned image, then run the bootstrap in that container with
`GATEWAY_URL` and `GATEWAY_TOKEN` set. The bootstrap waits for the shell health
endpoint and imports both Function records. The reference stack must mount
this package rather than duplicate its source.

## Tests

```bash
python3 -m pip install -r requirements.txt
python3 -m unittest discover -v
```

CI runs this browser-free suite on every push in the `python-tests` job.
