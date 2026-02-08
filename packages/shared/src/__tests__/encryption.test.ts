import { describe, it, expect, beforeAll } from 'vitest';
import { encryptSecret, decryptSecret, generateEncryptionKey } from '../utils/encryption.js';

describe('encryption', () => {
  beforeAll(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = generateEncryptionKey();
  });

  it('encrypts and decrypts a secret correctly', () => {
    const original = 'ghp_abc123secrettoken';
    const encrypted = encryptSecret(original);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(original);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const value = 'test-secret';
    const encrypted1 = encryptSecret(value);
    const encrypted2 = encryptSecret(value);
    expect(encrypted1).not.toBe(encrypted2);

    // But both decrypt to the same value
    expect(decryptSecret(encrypted1)).toBe(value);
    expect(decryptSecret(encrypted2)).toBe(value);
  });

  it('handles empty strings', () => {
    const encrypted = encryptSecret('');
    expect(decryptSecret(encrypted)).toBe('');
  });

  it('handles unicode strings', () => {
    const original = '비밀키-テスト-🔑';
    const encrypted = encryptSecret(original);
    expect(decryptSecret(encrypted)).toBe(original);
  });

  it('throws on invalid encrypted format', () => {
    expect(() => decryptSecret('not-valid-format')).toThrow();
  });
});
