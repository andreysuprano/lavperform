import { ADMIN_API_URL } from "@/services/constants"
import type {
  AdminLoginRequest,
  AdminLoginResponse,
  ApiErrorResponse,
} from "@/services/auth-types"

export class AuthApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = "AuthApiError"
    this.statusCode = statusCode
  }
}

function formatApiErrorMessage(data: ApiErrorResponse): string {
  if (Array.isArray(data.message)) {
    return data.message.join(". ")
  }

  return data.message
}

export async function loginAdmin(
  credentials: AdminLoginRequest
): Promise<AdminLoginResponse> {
  const response = await fetch(`${ADMIN_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  const data = (await response.json()) as AdminLoginResponse | ApiErrorResponse

  if (!response.ok) {
    const error = data as ApiErrorResponse
    throw new AuthApiError(
      formatApiErrorMessage(error),
      error.statusCode ?? response.status
    )
  }

  return data as AdminLoginResponse
}
