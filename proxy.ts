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

// Static files under public/ (logo, favicons, fonts, ...) - the matcher below
// only excludes favicon.ico by name, so everything else in public/ still runs
// through this function. That matters because next/image's optimizer fetches
// images like /logo.png via a plain server-side request carrying no auth
// cookie; without this early return that internal fetch gets redirected to
// /login and next/image fails with "The requested resource isn't a valid
// image." Checked here (plain JS regex) rather than folded into the matcher
// config, since the matcher's own pattern language is more limited than a
// real RegExp and doesn't reliably support this as a single expression.
const STATIC_FILE_PATTERN = /\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|otf)$/i;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (STATIC_FILE_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

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
