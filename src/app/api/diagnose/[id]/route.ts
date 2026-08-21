// ═══════════════════════════════════════════════════════════
// Delete Diagnostic - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { diagnostics } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, NotFoundError, BadRequestError } from '@/lib/error-handler';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbReady();
    const user = await getUserFromRequest(request);
    const { id } = await context.params;
    const diagnosticId = Number(id);

    if (!Number.isInteger(diagnosticId) || diagnosticId <= 0) {
      throw new BadRequestError('شناسه عیب‌یابی نامعتبر است');
    }

    const row = await db.query.diagnostics.findFirst({
      where: and(
        eq(diagnostics.id, diagnosticId),
        eq(diagnostics.userId, user.id)
      ),
    });

    if (!row) {
      throw new NotFoundError('عیب‌یابی یافت نشد');
    }

    await db.delete(diagnostics).where(eq(diagnostics.id, diagnosticId));

    return NextResponse.json({
      success: true,
      message: 'حذف شد',
    });
  } catch (error) {
    return handleError(error);
  }
}
