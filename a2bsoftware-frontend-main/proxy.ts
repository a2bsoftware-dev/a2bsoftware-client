import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The backend (Spring Boot) owns all token validation and refresh. This is
// purely a dumb presence/shape check so unauthenticated users don't even
// render a protected page before their first API call would 401 — it is
// not a security boundary, the backend re-checks every request itself.
function hasValidLookingSession(request: NextRequest): boolean {
  const accessToken = request.cookies.get("access_token")?.value;
  return !!accessToken && accessToken.split(".").length === 3;
}

// Hit directly by survey respondents and vendor callback servers, neither of
// which ever holds an admin session cookie - these must stay reachable
// unauthenticated, unlike every other page this proxy gates.
const PUBLIC_ROUTES = ["/survey-start", "/client-redirect-url"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthEntryPoint = isLoginPage || pathname === "/";

  const authenticated = hasValidLookingSession(request);

  if (!authenticated && !isLoginPage && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isAuthEntryPoint) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
