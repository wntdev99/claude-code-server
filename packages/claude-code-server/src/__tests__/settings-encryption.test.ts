import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import {
  encryptSecret,
  decryptSecret,
  generateEncryptionKey,
  ENCRYPTED_SETTINGS,
  VALID_SETTINGS_KEYS,
} from '@claude-code-server/shared';

/**
 * Settings encryption tests - validates the encryption/decryption and masking
 * logic used by the settings API route.
 */

const dbPath = path.resolve(__dirname, '../../../core/prisma/dev.db');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

const createdSettingsKeys: string[] = [];
let savedEncryptionKey: string | undefined;

beforeAll(() => {
  savedEncryptionKey = process.env.ENCRYPTION_KEY;
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = generateEncryptionKey();
  }
});

afterAll(async () => {
  for (const key of createdSettingsKeys) {
    await prisma.settings.delete({ where: { key } }).catch(() => {});
  }
  await prisma.$disconnect();
  if (savedEncryptionKey !== undefined) {
    process.env.ENCRYPTION_KEY = savedEncryptionKey;
  } else {
    delete process.env.ENCRYPTION_KEY;
  }
});

// Replicate the route's helper functions
function maskValue(key: string, value: string): string {
  if (ENCRYPTED_SETTINGS.includes(key) && value.length > 4) {
    return value.slice(0, 4) + '****';
  }
  return value;
}

function shouldEncrypt(key: string): boolean {
  return ENCRYPTED_SETTINGS.includes(key);
}

describe('Settings encryption logic', () => {
  it('encrypts and decrypts github_token', () => {
    const token = 'ghp_test1234567890';
    const encrypted = encryptSecret(token);
    expect(encrypted).not.toBe(token);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it('stores encrypted value in DB and retrieves correctly', async () => {
    const key = 'github_token';
    const value = 'ghp_testtoken123';
    createdSettingsKeys.push(key);

    const storedValue = shouldEncrypt(key) ? encryptSecret(value) : value;

    await prisma.settings.upsert({
      where: { key },
      update: { value: storedValue },
      create: { key, value: storedValue },
    });

    const setting = await prisma.settings.findUnique({ where: { key } });
    expect(setting).not.toBeNull();
    // Stored value should be encrypted (not readable)
    expect(setting!.value).not.toBe(value);
    // Decrypt should recover original
    expect(decryptSecret(setting!.value)).toBe(value);
  });

  it('does not encrypt non-sensitive settings', async () => {
    const key = 'claude_model';
    const value = 'claude-sonnet-4-5';
    createdSettingsKeys.push(key);

    const storedValue = shouldEncrypt(key) ? encryptSecret(value) : value;
    expect(storedValue).toBe(value); // Should NOT be encrypted

    await prisma.settings.upsert({
      where: { key },
      update: { value: storedValue },
      create: { key, value: storedValue },
    });

    const setting = await prisma.settings.findUnique({ where: { key } });
    expect(setting!.value).toBe(value); // Plain text
  });
});

describe('Settings masking logic', () => {
  it('masks encrypted setting values (shows first 4 chars + ****)', () => {
    const masked = maskValue('github_token', 'ghp_test1234567890');
    expect(masked).toBe('ghp_****');
  });

  it('does not mask non-encrypted settings', () => {
    const masked = maskValue('claude_model', 'claude-sonnet-4-5');
    expect(masked).toBe('claude-sonnet-4-5');
  });

  it('does not mask short values (4 chars or less)', () => {
    const masked = maskValue('github_token', 'ghp_');
    expect(masked).toBe('ghp_'); // 4 chars exactly, not masked
  });

  it('masks all encrypted setting types', () => {
    for (const key of ENCRYPTED_SETTINGS) {
      const masked = maskValue(key, 'some_secret_value_here');
      expect(masked).toBe('some****');
    }
  });
});

describe('Settings validation', () => {
  it('VALID_SETTINGS_KEYS contains expected keys', () => {
    expect(VALID_SETTINGS_KEYS).toContain('claude_model');
    expect(VALID_SETTINGS_KEYS).toContain('github_token');
    expect(VALID_SETTINGS_KEYS).toContain('output_directory');
  });

  it('ENCRYPTED_SETTINGS is a subset of VALID_SETTINGS_KEYS', () => {
    for (const key of ENCRYPTED_SETTINGS) {
      expect(VALID_SETTINGS_KEYS).toContain(key);
    }
  });

  it('rejects unknown setting keys', () => {
    const unknownKey = 'totally_unknown_setting';
    expect(VALID_SETTINGS_KEYS.includes(unknownKey)).toBe(false);
  });

  it('upserts settings (create then update)', async () => {
    const key = 'claude_max_tokens';
    createdSettingsKeys.push(key);

    await prisma.settings.upsert({
      where: { key },
      update: { value: '4000' },
      create: { key, value: '4000' },
    });

    let setting = await prisma.settings.findUnique({ where: { key } });
    expect(setting!.value).toBe('4000');

    // Update
    await prisma.settings.upsert({
      where: { key },
      update: { value: '8000' },
      create: { key, value: '8000' },
    });

    setting = await prisma.settings.findUnique({ where: { key } });
    expect(setting!.value).toBe('8000');
  });

  it('deletes a setting', async () => {
    const key = 'slack_default_channel';
    createdSettingsKeys.push(key);

    await prisma.settings.upsert({
      where: { key },
      update: { value: '#general' },
      create: { key, value: '#general' },
    });

    await prisma.settings.delete({ where: { key } });
    const setting = await prisma.settings.findUnique({ where: { key } });
    expect(setting).toBeNull();

    // Remove from cleanup list since already deleted
    const idx = createdSettingsKeys.indexOf(key);
    if (idx !== -1) createdSettingsKeys.splice(idx, 1);
  });
});
