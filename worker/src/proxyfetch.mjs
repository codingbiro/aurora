// Minimal HTTP client that goes through an HTTP forward proxy (CONNECT + TLS) using Cloudflare's
// TCP sockets. Used so that ntfy.sh sees the proxy's address instead of Cloudflare's shared egress.
import { connect } from 'cloudflare:sockets';

const enc = (s) => new TextEncoder().encode(s);
const dec = new TextDecoder();

function concat(a, b) { const out = new Uint8Array(a.length + b.length); out.set(a); out.set(b, a.length); return out; }

async function readUntil(reader, marker) {
  let buf = new Uint8Array();
  for (;;) {
    const idx = indexOf(buf, enc(marker));
    if (idx >= 0) return { head: dec.decode(buf.subarray(0, idx)), rest: buf.subarray(idx + marker.length) };
    const { value, done } = await reader.read();
    if (done) throw new Error('connection closed before the proxy answered');
    buf = concat(buf, value);
    if (buf.length > 65536) throw new Error('proxy response too large');
  }
}
function indexOf(hay, needle) {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) { for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer; return i; }
  return -1;
}
async function readAll(reader, first = new Uint8Array()) {
  let buf = first;
  for (;;) { const { value, done } = await reader.read(); if (done) return buf; buf = concat(buf, value); if (buf.length > 4 * 1024 * 1024) throw new Error('response too large'); }
}

/** Parse a raw HTTP/1.1 response (handles Content-Length and chunked bodies). */
export function parseHttpResponse(raw) {
  const sep = indexOf(raw, enc('\r\n\r\n'));
  if (sep < 0) throw new Error('malformed HTTP response');
  const headText = dec.decode(raw.subarray(0, sep));
  const lines = headText.split('\r\n');
  const status = +(lines[0].match(/^HTTP\/1\.[01] (\d{3})/) || [])[1] || 0;
  const headers = {};
  for (const l of lines.slice(1)) { const i = l.indexOf(':'); if (i > 0) headers[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
  let body = raw.subarray(sep + 4);
  if ((headers['transfer-encoding'] || '').includes('chunked')) {
    let out = new Uint8Array(), pos = 0;
    for (;;) {
      const lineEnd = indexOf(body.subarray(pos), enc('\r\n')); if (lineEnd < 0) break;
      const size = parseInt(dec.decode(body.subarray(pos, pos + lineEnd)).split(';')[0], 16); pos += lineEnd + 2;
      if (!size) break;
      out = concat(out, body.subarray(pos, pos + size)); pos += size + 2;
    }
    body = out;
  } else if (headers['content-length']) body = body.subarray(0, +headers['content-length']);
  return { ok: status >= 200 && status < 300, status, headers, text: dec.decode(body) };
}

/**
 * fetch-like call through an HTTP proxy given as http://user:pass@host:port.
 * Opens a TCP socket to the proxy, issues CONNECT host:443, upgrades to TLS, sends one HTTP/1.1
 * request with Connection: close and reads the response to EOF.
 */
export async function fetchViaHttpProxy(proxyUrl, targetUrl, { method = 'GET', headers = {}, body = null, timeoutMs = 15000 } = {}) {
  const p = new URL(proxyUrl), t = new URL(targetUrl);
  const https = t.protocol === 'https:';
  const port = t.port ? +t.port : (https ? 443 : 80);
  const socket = connect({ hostname: p.hostname, port: p.port ? +p.port : 3128 }, { secureTransport: 'starttls', allowHalfOpen: false });
  const timer = setTimeout(() => { socket.close().catch(() => {}); }, timeoutMs);
  try {
    let writer = socket.writable.getWriter(), reader = socket.readable.getReader();
    const auth = p.username ? `Proxy-Authorization: Basic ${btoa(`${decodeURIComponent(p.username)}:${decodeURIComponent(p.password)}`)}\r\n` : '';
    const bodyBytes = body == null ? new Uint8Array() : (typeof body === 'string' ? enc(body) : new Uint8Array(body));
    let req;
    if (https) {
      await writer.write(enc(`CONNECT ${t.hostname}:${port} HTTP/1.1\r\nHost: ${t.hostname}:${port}\r\n${auth}Proxy-Connection: Keep-Alive\r\n\r\n`));
      const { head } = await readUntil(reader, '\r\n\r\n');
      const cstatus = +(head.match(/^HTTP\/1\.[01] (\d{3})/) || [])[1];
      if (cstatus !== 200) throw new Error(`proxy CONNECT failed: ${head.split('\r\n')[0]}`);
      writer.releaseLock(); reader.releaseLock();
      const stream = socket.startTls({ expectedServerHostname: t.hostname });
      writer = stream.writable.getWriter(); reader = stream.readable.getReader();
      req = `${method} ${t.pathname}${t.search} HTTP/1.1\r\nHost: ${t.hostname}\r\nConnection: close\r\nUser-Agent: aurora-dashboard/1.0\r\nAccept: */*\r\nContent-Length: ${bodyBytes.length}\r\n`;
    } else {
      // plain HTTP: the proxy forwards an absolute-URI request itself, no tunnel needed
      req = `${method} ${t.href} HTTP/1.1\r\nHost: ${t.host}\r\n${auth}Connection: close\r\nProxy-Connection: close\r\nUser-Agent: aurora-dashboard/1.0\r\nAccept: */*\r\nContent-Length: ${bodyBytes.length}\r\n`;
    }
    for (const [k, v] of Object.entries(headers)) req += `${k}: ${v}\r\n`;
    await writer.write(concat(enc(req + '\r\n'), bodyBytes));
    const raw = await readAll(reader);
    return parseHttpResponse(raw);
  } finally {
    clearTimeout(timer);
    try { await socket.close(); } catch { /* already closed */ }
  }
}

/** Debug helper: open the tunnel and return the proxy's raw CONNECT response head. */
export async function debugConnect(proxyUrl, host, port) {
  const p = new URL(proxyUrl);
  const socket = connect({ hostname: p.hostname, port: p.port ? +p.port : 3128 }, { secureTransport: 'starttls', allowHalfOpen: false });
  try {
    const writer = socket.writable.getWriter(), reader = socket.readable.getReader();
    const auth = p.username ? `Proxy-Authorization: Basic ${btoa(`${decodeURIComponent(p.username)}:${decodeURIComponent(p.password)}`)}\r\n` : '';
    await writer.write(enc(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n${auth}\r\n`));
    const { head, rest } = await readUntil(reader, '\r\n\r\n');
    return { head, extraBytes: rest.length };
  } finally { try { await socket.close(); } catch {} }
}
