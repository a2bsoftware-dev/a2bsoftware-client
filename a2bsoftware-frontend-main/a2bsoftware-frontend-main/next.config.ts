import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
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
