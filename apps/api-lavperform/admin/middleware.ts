import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { TOKEN_COOKIE } from "@/services/auth-storage"
import { isValidToken } from "@/services/jwt"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  const isAuthenticated = token ? isValidToken(token) : false
  const isLoginPage = pathname === "/login"
  const isPublicConnectPage = pathname.startsWith("/connect/")

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!isAuthenticated && !isLoginPage && !isPublicConnectPage) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
