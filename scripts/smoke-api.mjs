const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://localhost:4000/api').replace(/\/+$/, '');

const checks = [
  { method: 'GET', path: '/health', envelope: false },
  { method: 'GET', path: '/services?page=1&limit=5&sort=asc', envelope: true },
  { method: 'GET', path: '/rooms?page=1&limit=5&sort=asc', envelope: true },
  { method: 'GET', path: '/doctors?page=1&limit=5&sort=asc', envelope: true },
  { method: 'GET', path: '/turns?page=1&limit=5&sort=desc', envelope: true },
];

function assertEnvelope(payload, url) {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`${url} did not return a JSON object.`);
  }

  if (payload.success !== true || !('data' in payload)) {
    throw new Error(`${url} must return { success: true, data, pagination? }.`);
  }
}

async function runCheck(check) {
  const url = `${apiBaseUrl}${check.path}`;
  const response = await fetch(url, { method: check.method });
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${url} returned non-JSON response: ${text.slice(0, 120)}`);
  }

  if (!response.ok) {
    const message = payload?.message ? ` - ${payload.message}` : '';
    throw new Error(`${url} returned HTTP ${response.status}${message}`);
  }

  if (check.envelope) {
    assertEnvelope(payload, url);
  }

  return {
    url,
    status: response.status,
    count: Array.isArray(payload?.data) ? payload.data.length : undefined,
  };
}

for (const check of checks) {
  try {
    const result = await runCheck(check);
    const suffix = typeof result.count === 'number' ? ` (${result.count} item(s))` : '';
    console.log(`OK ${result.status} ${result.url}${suffix}`);
  } catch (error) {
    console.error(`FAIL ${check.method} ${apiBaseUrl}${check.path}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
