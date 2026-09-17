// Runtime configuration. apiBase: origin of the Worker proxy (no trailing slash). Empty string = same origin
// (local dev server, or the Worker serving the page itself at aurora.birovince.com); GitHub Pages uses the workers.dev URL.
window.AURORA_CONFIG = {
  apiBase: (['localhost', '127.0.0.1', 'aurora.birovince.com'].includes(location.hostname) || location.hostname.endsWith('.workers.dev'))
    ? '' : 'https://aurora-proxy.birovince.workers.dev',
};
