import { NextResponse } from "next/server";

// Proves the Next.js server itself is accepting requests. This is what
// Docker's HEALTHCHECK (healthcheck.js) and the deploy pipeline's cutover
// gate (deploy/scripts/health-check.sh) both poll before/after cutting
// traffic to a new deployment.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
