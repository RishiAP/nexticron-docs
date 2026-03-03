import axios from "axios"

// ---------------------------------------------------------------------------
// In-memory access token store (never persisted to localStorage/cookies)
// ---------------------------------------------------------------------------
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: "/",
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor — attach access token as Bearer
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Response interceptor — automatic refresh on 401
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  try {
    // Refresh token is sent automatically via HTTP-only cookie
    const { data } = await axios.post<{
      success: boolean
      accessToken?: string
    }>("/api/auth/refresh")

    if (data.success && data.accessToken) {
      setAccessToken(data.accessToken)
      return data.accessToken
    }
    return null
  } catch {
    setAccessToken(null)
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.response) {
      return Promise.reject(error)
    }

    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined
    // Skip retry for auth routes or already-retried requests
    if (
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.startsWith("/api/auth/")
    ) {
      originalRequest._retry = true

      // Deduplicate concurrent refresh requests
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }
      const newToken = await refreshPromise

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      }

      // Refresh failed — redirect to sign-in
      if (typeof window !== "undefined") {
        window.location.href = "/sign-in"
      }
    }

    const message =
      (error.response.data as { error?: string })?.error ??
      error.message ??
      "An unexpected error occurred"
    return Promise.reject(new Error(message))
  },
)

export default api
