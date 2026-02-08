import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ENCRYPTED_SETTINGS } from '@claude-code-server/shared';
import { encryptSecret, decryptSecret } from '@claude-code-server/shared';

// Sensitive keys that should be masked in GET responses
const SENSITIVE_KEYS = ['github_token', 'vercel_token', 'encryption_key'];

function maskValue(key: string, value: string): string {
  if (SENSITIVE_KEYS.includes(key) && value.length > 4) {
    return value.slice(0, 4) + '****';
  }
  return value;
}

function shouldEncrypt(key: string): boolean {
  return ENCRYPTED_SETTINGS.includes(key);
}

// GET /api/settings
export async function GET() {
  const settings = await prisma.settings.findMany();
  const masked = settings.map((s: { key: string; value: string; updatedAt: Date }) => {
    let displayValue = s.value;

    // Decrypt for masking display (so we mask the actual value, not the encrypted blob)
    if (shouldEncrypt(s.key)) {
      try {
        displayValue = decryptSecret(s.value);
      } catch {
        // If decryption fails, show raw (might be unencrypted legacy data)
        displayValue = s.value;
      }
    }

    return {
      key: s.key,
      value: maskValue(s.key, displayValue),
      updatedAt: s.updatedAt,
    };
  });

  return NextResponse.json({ success: true, data: masked });
}

// PATCH /api/settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { success: false, error: 'Expected object with key-value pairs' },
        { status: 400 }
      );
    }

    const results = [];
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string') continue;

      // Encrypt sensitive values before storage
      const storedValue = shouldEncrypt(key) ? encryptSecret(value) : value;

      const setting = await prisma.settings.upsert({
        where: { key },
        update: { value: storedValue },
        create: { key, value: storedValue },
      });
      results.push({ key: setting.key, updatedAt: setting.updatedAt });
    }

    return NextResponse.json({ success: true, data: results });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
