const BASE = '/api'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function getToken(): string | null {
  return localStorage.getItem('amd_token')
}

function headers(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

export async function request<T = unknown>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
): Promise<T> {
  const opts: RequestInit = { method, headers: headers() }
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${endpoint}`, opts)

  if (res.status === 401) {
    localStorage.removeItem('amd_token')
    localStorage.removeItem('amd_role')
    window.dispatchEvent(new Event('amd-unauthorized'))
    throw new ApiError('Unauthorized', 401)
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(
      (data as Record<string, string>).msg || `Request failed (${res.status})`,
      res.status,
    )
  }

  return data as T
}

export async function upload<T = unknown>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const h: Record<string, string> = {}
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`

  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: h,
    body: formData,
  })

  if (res.status === 401) {
    localStorage.removeItem('amd_token')
    window.dispatchEvent(new Event('amd-unauthorized'))
    throw new ApiError('Unauthorized', 401)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(
      (data as Record<string, string>).msg || 'Upload failed',
      res.status,
    )
  }
  return data as T
}

export { ApiError }
