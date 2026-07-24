import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      // Spring Boot API proxy - routes every browser call to /api/* through
      // this app's own origin instead of straight to NEXT_PUBLIC_API_BASE_URL
      // (a different port). A same-origin fetch carries the auth cookie as a
      // normal first-party request regardless of the browser's third-party-
      // cookie policy (Incognito blocks direct cross-port cookie access by
      // default, which is why /api/users etc. came back 401 "anonymous" even
      // with a valid session). API_INTERNAL_URL is server-side only (no
      // NEXT_PUBLIC_ prefix) since this runs in the Next.js server process,
      // not the browser - see docker-compose.yml for the containerized
      // override (host.docker.internal, not localhost, from inside a container).
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081"}/api/:path*`,
      },
      // Assets proxy
      {
        source: "/assets/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/assets/:path*`,
      },
      {
        source: "/scripts/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/scripts/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/uploads/:path*`,
      },
      // Non-migrated routes fallback
      {
        source: "/projects",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/projects`,
      },
      {
        source: "/projects/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/projects/:path*`,
      },
      {
        source: "/users",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/users`,
      },
      {
        source: "/users/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/users/:path*`,
      },
      {
        source: "/clients",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/clients`,
      },
      {
        source: "/clients/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/clients/:path*`,
      },
      {
        source: "/vendors",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/vendors`,
      },
      {
        source: "/vendors/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/vendors/:path*`,
      },
      {
        source: "/client-api-data",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/client-api-data`,
      },
      {
        source: "/client-api-data/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/client-api-data/:path*`,
      },
      {
        source: "/access-rights",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/access-rights`,
      },
      {
        source: "/setting",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/setting`,
      },
      {
        source: "/logout",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/logout`,
      },
    ];
  },
};

export default nextConfig;
