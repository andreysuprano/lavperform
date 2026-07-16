import { ADMIN_API_URL } from "@/services/constants"
import { clearStoredToken, getStoredToken } from "@/services/auth-storage"
import type { ApiErrorResponse } from "@/services/auth-types"
import {
  beginPendingRequest,
  endPendingRequest,
} from "@/services/pending-requests"

export class ApiClientError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "ApiClientError"
    this.statusCode = statusCode
  }
}

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>
}

function formatApiErrorMessage(data: ApiErrorResponse): string {
  if (Array.isArray(data.message)) {
    return data.message.join(". ")
  }

  return data.message
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const contentLength = response.headers.get("content-length")
  if (contentLength === "0") {
    return undefined
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    const text = await response.text()
    return text.length > 0 ? text : undefined
  }

  const text = await response.text()
  if (text.length === 0) {
    return undefined
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = getStoredToken()

  beginPendingRequest()

  try {
    const response = await fetch(`${ADMIN_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    if (response.status === 401) {
      clearStoredToken()
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }

    const data = await parseResponseBody(response)

    if (!response.ok) {
      const error = (data ?? {}) as ApiErrorResponse
      throw new ApiClientError(
        formatApiErrorMessage(error) || response.statusText,
        error.statusCode ?? response.status
      )
    }

    return data as T
  } finally {
    endPendingRequest()
  }
}
