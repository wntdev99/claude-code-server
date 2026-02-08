import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Sensitive keys that should be masked in GET responses
const SENSITIVE_KEYS = ['github_token', 'vercel_token', 'encryption_key'];

function maskValue(key: string, value: string): string {
  if (SENSITIVE_KEYS.includes(key) && value.length > 4) {
    return value.slice(0, 4) + '****';
  }
  return value;
}

// GET /api/settings
export async function GET() {
  const settings = await prisma.settings.findMany();
  const masked = settings.map((s: { key: string; value: string; updatedAt: Date }) => ({
    key: s.key,
    value: maskValue(s.key, s.value),
    updatedAt: s.updatedAt,
  }));

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
      const setting = await prisma.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
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
