const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const json = await res.json()

  if (!res.ok || json.ok === false) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`
    throw new Error(msg)
  }

  return json
}

export const api = {
  get: <T>(path: string, opts?: RequestInit) =>
    request<T>(path, { method: 'GET', ...opts }),
}
