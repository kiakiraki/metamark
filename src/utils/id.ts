/**
 * Generates a random identifier suitable for React keys / toast ids / etc.
 *
 * `crypto.randomUUID()` is only exposed in secure contexts (HTTPS or
 * localhost), so it throws a TypeError when the app is served over plain
 * HTTP or in older Safari versions. This falls back to a
 * `crypto.getRandomValues`-based UUID, and finally to a `Math.random`-based
 * id if the Crypto API isn't available at all.
 */
export function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to the other strategies below (e.g. insecure context).
    }
  }

  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    // Per RFC 4122 §4.4: set version (4) and variant (10) bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  // Last-resort fallback: not cryptographically strong, but good enough for
  // a non-security-sensitive local identifier.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
