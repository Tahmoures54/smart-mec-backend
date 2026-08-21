// ═══════════════════════════════════════════════════════════
// Audio Diagnose — proxy to text diagnose with description
// تحلیل ویژگی‌های صوتی سمت کلاینت انجام می‌شود؛
// این endpoint اگر description/text بفرستد مثل diagnose عمل می‌کند.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { BadRequestError, handleError } from '@/lib/error-handler';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let description = '';
    let carId = '';
    let year = '';
    let carName = '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      description = String(form.get('description') || form.get('text') || '');
      carId = String(form.get('carId') || '');
      year = String(form.get('year') || '');
      carName = String(form.get('carName') || '');
    } else {
      const body = await request.json().catch(() => ({}));
      description = String(body.description || body.text || '');
      carId = String(body.carId || '');
      year = String(body.year || '');
      carName = String(body.carName || '');
    }

    if (!description || description.trim().length < 10) {
      throw new BadRequestError(
        'تحلیل صدا روی دستگاه انجام می‌شود. لطفاً نتیجه آنالیز یا شرح مشکل را به صورت متن (حداقل ۱۰ کاراکتر) همراه درخواست بفرستید، یا از endpoint اصلی /api/diagnose استفاده کنید.'
      );
    }

    // Forward to main diagnose logic via internal rewrite of body
    const auth = request.headers.get('authorization');
    const base =
      process.env.APP_URL ||
      request.nextUrl.origin;

    const res = await fetch(`${base}/api/diagnose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({
        carId: carId || 'custom',
        year: year || '1400',
        description: description.trim(),
        ...(carName ? { carName } : {}),
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return handleError(error);
  }
}
