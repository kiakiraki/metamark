import { describe, it, expect } from 'vitest';
import { formatSonyModel } from '../cameraNameFormatter';

describe('formatSonyModel', () => {
  describe('ILCE (E-mount α)', () => {
    it.each([
      ['ILCE-1', 'α1'],
      ['ILCE-1M2', 'α1 II'],
      ['ILCE-7M4', 'α7 IV'],
      ['ILCE-7RM5', 'α7R V'],
      ['ILCE-7SM3', 'α7S III'],
      ['ILCE-7CM2', 'α7C II'],
      ['ILCE-7C', 'α7C'],
      ['ILCE-6700', 'α6700'],
      ['ILCE-9M3', 'α9 III'],
    ])('%s → %s', (input, expected) => {
      expect(formatSonyModel('SONY', input)).toBe(expected);
    });
  });

  describe('ILCA (A-mount α)', () => {
    it('ILCA-99M2 → α99 II', () => {
      expect(formatSonyModel('SONY', 'ILCA-99M2')).toBe('α99 II');
    });
  });

  describe('DSC (Cybershot)', () => {
    it.each([
      ['DSC-RX100M7', 'RX100 VII'],
      ['DSC-RX1RM2', 'RX1R II'],
      ['DSC-RX10M4', 'RX10 IV'],
      ['DSC-WX500', 'WX500'],
    ])('%s → %s', (input, expected) => {
      expect(formatSonyModel('SONY', input)).toBe(expected);
    });
  });

  describe('non-Sony manufacturers pass through', () => {
    it('Canon EOS R5 returns model unchanged', () => {
      expect(formatSonyModel('Canon', 'EOS R5')).toBe('EOS R5');
    });

    it('Nikon Z 9 returns model unchanged', () => {
      expect(formatSonyModel('NIKON CORPORATION', 'NIKON Z 9')).toBe(
        'NIKON Z 9'
      );
    });
  });

  describe('null and empty inputs', () => {
    it('null model returns null', () => {
      expect(formatSonyModel('SONY', null)).toBeNull();
    });

    it('undefined model returns null', () => {
      expect(formatSonyModel('SONY', undefined)).toBeNull();
    });

    it('null make returns model unchanged', () => {
      expect(formatSonyModel(null, 'ILCE-7M4')).toBe('ILCE-7M4');
    });

    it('empty make returns model unchanged', () => {
      expect(formatSonyModel('', 'ILCE-7M4')).toBe('ILCE-7M4');
    });
  });

  describe('fallbacks for unknown patterns', () => {
    it('NEX-7 (unsupported family) returns original', () => {
      expect(formatSonyModel('SONY', 'NEX-7')).toBe('NEX-7');
    });

    it('ILCE with garbage suffix returns original', () => {
      expect(formatSonyModel('SONY', 'ILCE-FOO')).toBe('ILCE-FOO');
    });
  });

  describe('make casing variants', () => {
    it('mixed-case "Sony" works', () => {
      expect(formatSonyModel('Sony', 'ILCE-1M2')).toBe('α1 II');
    });

    it('"Sony Group Corporation" still matches', () => {
      expect(formatSonyModel('Sony Group Corporation', 'ILCE-1M2')).toBe(
        'α1 II'
      );
    });

    it('whitespace around make is tolerated', () => {
      expect(formatSonyModel('  SONY  ', 'ILCE-7M4')).toBe('α7 IV');
    });
  });
});
