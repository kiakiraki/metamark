// Appends a Content-Security-Policy line to dist/_headers after `next build`.
//
// The static export embeds the App Router flight data as inline <script>
// elements whose contents (and therefore hashes) change every build, so the
// CSP cannot live in public/_headers — it has to be computed from the built
// HTML. Run via the package.json `postbuild` hook.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const HEADERS_FILE = join(DIST, '_headers');

function collectHtmlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(path));
    } else if (entry.name.endsWith('.html')) {
      files.push(path);
    }
  }
  return files;
}

function inlineScriptHashes(html) {
  const hashes = [];
  const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const [, attrs, body] of html.matchAll(scriptRe)) {
    if (/\bsrc\s*=/i.test(attrs) || body === '') continue;
    const digest = createHash('sha256').update(body, 'utf8').digest('base64');
    hashes.push(`'sha256-${digest}'`);
  }
  return hashes;
}

const htmlFiles = collectHtmlFiles(DIST);
if (htmlFiles.length === 0) {
  throw new Error(`No HTML files found under ${DIST} — did the build run?`);
}

const scriptHashes = [
  ...new Set(
    htmlFiles.flatMap((f) => inlineScriptHashes(readFileSync(f, 'utf8')))
  ),
];

const csp = [
  "default-src 'self'",
  `script-src 'self' ${scriptHashes.join(' ')}`,
  // framer-motion sets inline style attributes
  "style-src 'self' 'unsafe-inline'",
  // previews use blob: URLs, icons may use data:
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const headers = readFileSync(HEADERS_FILE, 'utf8');
if (headers.includes('Content-Security-Policy')) {
  throw new Error(`${HEADERS_FILE} already contains a CSP line`);
}
const updated = headers.replace(
  /^\/\*$/m,
  `/*\n  Content-Security-Policy: ${csp}`
);
if (updated === headers) {
  throw new Error(`Could not find the /* block in ${HEADERS_FILE}`);
}
writeFileSync(HEADERS_FILE, updated);

console.log(
  `CSP written to dist/_headers (${scriptHashes.length} inline script hash(es) from ${htmlFiles.length} HTML file(s))`
);
