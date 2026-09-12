import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { diagnostics } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserFromRequest, isAdminPhone } from '@/lib/auth';
import { handleError, BadRequestError, NotFoundError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError('شناسه عیب‌یابی نامعتبر است');
    }

    const row = await db.query.diagnostics.findFirst({
      where: eq(diagnostics.id, id),
    });

    if (!row) {
      throw new NotFoundError('عیب‌یابی یافت نشد');
    }

    if (row.userId !== user.id && !isAdminPhone(user.phone)) {
      throw new NotFoundError('عیب‌یابی یافت نشد');
    }

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    return handleError(error);
  }
}
