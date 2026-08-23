import { describe, it, expect, afterEach, vi } from 'vitest';
import { generateId } from '../id';

describe('generateId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when available', () => {
    const spy = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('11111111-1111-4111-8111-111111111111');

    expect(generateId()).toBe('11111111-1111-4111-8111-111111111111');
    expect(spy).toHaveBeenCalled();
  });

  it('falls back to crypto.getRandomValues when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array) => {
        arr.fill(0xab);
        return arr;
      },
    });

    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('falls back to a Math.random-based id when the Crypto API is unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    const id = generateId();
    expect(id).toMatch(/^id-[0-9a-z]+-[0-9a-z]+$/);
  });

  it('generates unique ids across multiple calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});
