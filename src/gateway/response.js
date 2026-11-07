export function sendResponse(response, status, payload, extraHeaders = {}) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': typeof payload === 'string' ? 'text/plain; version=0.0.4; charset=utf-8' : 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
    ...extraHeaders
  });
  response.end(text);
}
