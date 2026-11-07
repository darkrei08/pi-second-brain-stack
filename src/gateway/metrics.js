export function createMetrics({ paths }) {
  const metrics = new Map();
  let active_requests = 0;

  function render() {
    const lines = [
      '# HELP gateway_requests_total Completed gateway requests.',
      '# TYPE gateway_requests_total counter'
    ];
    for (const [{ method, route, status }, value] of metrics) {
      lines.push(`gateway_requests_total{method="${method}",route="${route}",status="${status}"} ${value.count}`);
    }
    lines.push('# HELP gateway_active_requests In-flight gateway requests.');
    lines.push('# TYPE gateway_active_requests gauge');
    lines.push(`gateway_active_requests ${active_requests}`);
    lines.push('# HELP gateway_request_duration_ms_sum Cumulative gateway request duration in milliseconds.');
    lines.push('# TYPE gateway_request_duration_ms_sum counter');
    for (const [{ method, route, status }, value] of metrics) {
      lines.push(`gateway_request_duration_ms_sum{method="${method}",route="${route}",status="${status}"} ${value.duration_ms}`);
    }
    lines.push('# HELP gateway_request_duration_ms_count Completed gateway request durations.');
    lines.push('# TYPE gateway_request_duration_ms_count counter');
    for (const [{ method, route, status }, value] of metrics) {
      lines.push(`gateway_request_duration_ms_count{method="${method}",route="${route}",status="${status}"} ${value.count}`);
    }
    return `${lines.join('\n')}\n`;
  }

  function routeLabel(request) {
    try {
      const pathname = new URL(request.url ?? '/', 'http://gateway.invalid').pathname;
      return paths.has(pathname) ? pathname : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  function completeRequest(method, route, status, duration_ms) {
    const key = { method, route, status };
    const existing = [...metrics.keys()].find((candidate) => candidate.method === method && candidate.route === route && candidate.status === status);
    const value = existing === undefined ? { count: 0, duration_ms: 0 } : metrics.get(existing);
    value.count += 1;
    value.duration_ms += duration_ms;
    if (existing === undefined) metrics.set(key, value);
  }

  return {
    begin(request) {
      const started_at = Date.now();
      const route = routeLabel(request);
      active_requests += 1;
      return {
        route,
        complete(status) {
          const duration_ms = Date.now() - started_at;
          active_requests -= 1;
          completeRequest(request.method ?? 'UNKNOWN', route, status, duration_ms);
          return duration_ms;
        }
      };
    },
    render,
    route() {
      return { method: 'GET', path: '/metrics', handler: () => ({ status: 200, body: render() }) };
    }
  };
}
