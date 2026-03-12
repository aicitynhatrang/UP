const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface RequestOptions extends RequestInit {
  token?: string
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...init } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  const json = await res.json()

  if (!res.ok || json.ok === false) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`
    throw new Error(msg)
  }

  return json
}

export const api = {
  get:    <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...opts }),
  post:   <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST',  body: JSON.stringify(body), ...opts }),
  put:    <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PUT',   body: JSON.stringify(body), ...opts }),
  patch:  <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...opts }),
}
