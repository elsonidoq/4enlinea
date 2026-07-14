// FR-028: shared frontend guard for the /admin surface — mirrors server-side
// requireLocalhost (server/index.js). Only localhost/loopback hostnames pass.
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

export function isLocalhostOrigin(hostname = window.location.hostname) {
  return LOCALHOST_HOSTNAMES.has(hostname);
}
