const DEFAULT_TIMEOUT_MS = 60000;
const MAX_TIMEOUT_MS = 600000;
const PARSER_TYPES = new Set(['docling', 'mineru', 'paddleocr']);
const LOOPBACK_HOSTS = new Set(['localhost', '[::1]', '::1', '::ffff:127.0.0.1']);
const LOOPBACK_IPV4_PATTERN = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const LOOPBACK_MAPPED_IPV4_PATTERN = /^\[::ffff:127\.\d{1,3}\.\d{1,3}\.\d{1,3}\]$/;

function requireNonEmptyText(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} must be non-empty text`);
  }
}

function requireObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return LOOPBACK_HOSTS.has(normalized) ||
    LOOPBACK_IPV4_PATTERN.test(normalized) ||
    LOOPBACK_MAPPED_IPV4_PATTERN.test(normalized);
}

function resolveEndpoint(base_url, allowed_hosts = []) {
  requireNonEmptyText(base_url, 'base_url');
  let url;
  try {
    url = new URL(base_url);
  } catch {
    throw new TypeError('base_url must be an absolute http or https URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('base_url must be an absolute http or https URL');
  }
  if (url.username || url.password) {
    throw new TypeError('base_url must not contain credentials');
  }
  // Uploaded documents must never travel in cleartext off this host.
  if (url.protocol === 'http:' && !isLoopbackHostname(url.hostname)) {
    throw new TypeError('base_url must use https unless the host is loopback');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/u, '');
  if (!isLoopbackHostname(hostname) && !allowed_hosts.some((host) => host.toLowerCase().replace(/\.$/u, '') === hostname)) {
    throw new TypeError(`provider host ${hostname} is not allowed; set PARSER_ENGINE_ALLOWED_HOSTS`);
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

// NOTE: the request and response shapes are Docling Serve's conversion contract, which is engine-neutral for our purposes.
export function createParserEngine({
  fetch = globalThis.fetch,
  base_url,
  allowed_hosts = [],
  timeout_ms = DEFAULT_TIMEOUT_MS,
  parser_type = 'docling'
} = {}) {
  if (typeof fetch !== 'function') {
    throw new TypeError('fetch must be a function');
  }
  const endpoint = `${resolveEndpoint(base_url, allowed_hosts)}/v1/convert/source`;
  if (!PARSER_TYPES.has(parser_type)) {
    throw new TypeError('parser_type is unsupported');
  }
  if (!Number.isInteger(timeout_ms) || timeout_ms < 1 || timeout_ms > MAX_TIMEOUT_MS) {
    throw new TypeError(`timeout_ms must be an integer between 1 and ${MAX_TIMEOUT_MS}`);
  }

  return async function parse(input) {
    requireObject(input, 'input');
    requireNonEmptyText(input.filename, 'filename');
    requireNonEmptyText(input.content_base64, 'content_base64');
    const response = await (async () => {
      try {
        return await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            options: { to_formats: ['json'], image_export_mode: 'placeholder' },
            sources: [{ kind: 'file', base64_string: input.content_base64, filename: input.filename }]
          }),
          // A redirect could forward the document to another origin.
          redirect: 'error',
          signal: AbortSignal.timeout(timeout_ms)
        });
      } catch (error) {
        if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
          throw new Error('parser engine request timed out');
        }
        const code = error && typeof error.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(error.code)
          ? ` (${error.code})`
          : '';
        throw new Error(`parser engine request failed${code}`);
      }
    })();
    if (!response.ok) {
      // Never echo the request, the document, or the response body in an error.
      throw new Error(`parser engine request failed with status ${response.status}`);
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new Error('parser engine response must be valid JSON');
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('parser engine response must be an object');
    }
    if (body.status !== 'success') {
      throw new Error('parser engine response must report a successful conversion');
    }
    const raw_json = body.document?.json_content;
    if (raw_json === null || typeof raw_json !== 'object' || Array.isArray(raw_json)) {
      throw new Error('parser engine response must contain a JSON document');
    }
    return { parser_type, raw_json };
  };
}
