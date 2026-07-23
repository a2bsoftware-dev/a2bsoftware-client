// Used by the Dockerfile's HEALTHCHECK instruction. Plain Node instead of
// curl/wget because the runtime image intentionally has neither installed
// (see Dockerfile comments) - Node itself is already there, so this adds
// zero extra attack surface or image weight.
const http = require("http");

// --deep additionally makes /api/health round-trip the database. Only
// deploy/scripts/deploy.sh's pre-cutover gate passes this; Docker's own
// HEALTHCHECK (below, and in the Dockerfile) intentionally stays shallow so
// a transient DB blip can't make Docker restart a perfectly healthy app
// container out from under live traffic.
const deep = process.argv.includes("--deep");

const req = http.get(
  {
    host: "127.0.0.1",
    port: process.env.PORT || 3000,
    path: deep ? "/api/health?deep=true" : "/api/health",
    timeout: 3000,
  },
  (res) => {
    // Drain the response so the socket can close cleanly before exiting.
    res.resume();
    process.exit(res.statusCode === 200 ? 0 : 1);
  }
);

req.on("error", () => process.exit(1));
req.on("timeout", () => {
  req.destroy();
  process.exit(1);
});
