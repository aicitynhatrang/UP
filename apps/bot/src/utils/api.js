const BASE = process.env.BACKEND_URL ?? 'http://backend:4000'
const SECRET = process.env.WEBHOOK_SECRET_TOKEN ?? ''

/**
 * Internal HTTP client for bot → backend calls.
 * Uses the webhook secret for trusted internal auth.
 */
export async function backendApi(method, path, body = null) {
  const headers = {
    'Content-Type':       'application/json',
    'x-webhook-secret':   SECRET,
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`
    throw new Error(msg)
  }

  return json
}

export const api = {
  get:   (path)        => backendApi('GET', path),
  post:  (path, body)  => backendApi('POST', path, body),
  patch: (path, body)  => backendApi('PATCH', path, body),
}
