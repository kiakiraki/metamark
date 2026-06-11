// Post-build guard for the static CSP in public/_headers.
//
// The policy uses `script-src 'self'` with no inline-script hashes, which is
// only sound while the built HTML contains zero inline <script> elements
// (true for Vite's default output). If a future plugin or tool injects one,
// the browser would silently block it in production — fail the build here
// instead.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;

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

const htmlFiles = collectHtmlFiles(DIST);
if (htmlFiles.length === 0) {
  throw new Error(`No HTML files found under ${DIST} — did the build run?`);
}

const offenders = [];
// Per the HTML spec a closing tag may carry whitespace or attributes
// (`</script >`) — match the way browsers terminate the element.
const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script[^>]*>/gi;
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const [, attrs, body] of html.matchAll(scriptRe)) {
    if (/\bsrc\s*=/i.test(attrs) || body === '') continue;
    offenders.push(`${file}: <script${attrs}>${body.slice(0, 80)}…`);
  }
}

if (offenders.length > 0) {
  throw new Error(
    `Inline <script> found in built HTML, but the static CSP in public/_headers ` +
      `allows none — add hashes or remove the source of the injection:\n` +
      offenders.join('\n')
  );
}

const headers = readFileSync(join(DIST, '_headers'), 'utf8');
if (!headers.includes('Content-Security-Policy')) {
  throw new Error('dist/_headers is missing the Content-Security-Policy line');
}

console.log(
  `CSP verified: ${htmlFiles.length} HTML file(s), no inline scripts`
);
