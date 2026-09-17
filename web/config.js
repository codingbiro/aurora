// Runtime configuration. apiBase: origin of the Worker proxy (no trailing slash). Leave empty to use
// the same origin (local dev server) or set to null to run NOAA-only without the proxy.
window.AURORA_CONFIG = {
  apiBase: (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? '' : 'https://aurora-proxy.birovince.workers.dev',
};
