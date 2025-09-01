// Minimal Cloudflare Worker to serve static assets from dist/ with security and cache headers
// This avoids relying on Pages and centralizes headers in the Worker.

interface Env {
  // Bound by wrangler.toml [assets]
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Try to serve from static assets
    let response = await env.ASSETS.fetch(request);

    // If not found and the client accepts HTML, fall back to index (for pretty URLs)
    if (response.status === 404 && acceptsHtml(request)) {
      const indexUrl = new URL('/index.html', url.origin);
      response = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    // Clone response and add headers
    const res = new Response(response.body, response);

    // Security headers
    const isHtml = isHtmlResponse(res);
    if (isHtml) {
      setSecurityHeaders(res);
      // HTML: avoid caching
      res.headers.set('Cache-Control', 'no-store');
    } else {
      // Static assets: long cache for hashed files, short for others
      const longCache = isHashedAsset(url.pathname);
      const cacheControl = longCache
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600, must-revalidate';
      res.headers.set('Cache-Control', cacheControl);
    }

    return res;
  },
};

export default worker;

function isHtmlResponse(res: Response): boolean {
  const ct = res.headers.get('Content-Type') || '';
  return ct.includes('text/html');
}

function acceptsHtml(req: Request): boolean {
  const accept = req.headers.get('Accept') || '';
  return accept.includes('text/html');
}

function isHashedAsset(pathname: string): boolean {
  // e.g. app-abcdef123456.js, chunk.e57805618994549f.js, etc.
  return /\.[a-f0-9]{8,}\./i.test(pathname);
}

function setSecurityHeaders(res: Response): void {
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "script-src 'self'",
    "connect-src 'self'",
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}
