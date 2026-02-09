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

  it('fails to decrypt with a wrong key', () => {
    const original = 'secret-value';
    const encrypted = encryptSecret(original);
    // Change to a different key
    const savedKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = generateEncryptionKey();
    expect(() => decryptSecret(encrypted)).toThrow();
    process.env.ENCRYPTION_KEY = savedKey;
  });

  it('handles large strings (100KB)', () => {
    const large = 'A'.repeat(100_000);
    const encrypted = encryptSecret(large);
    expect(decryptSecret(encrypted)).toBe(large);
  });

  it('generateEncryptionKey produces a valid 64-char hex string', () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(key)).toBe(true);
  });

  it('generateEncryptionKey produces unique keys each call', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    expect(key1).not.toBe(key2);
  });
});
