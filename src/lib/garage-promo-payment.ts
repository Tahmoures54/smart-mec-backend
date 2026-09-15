import { eq } from 'drizzle-orm';
import { garages } from '@/db/schema';
import { PRODUCTS, ProductId } from '@/types';
import {
  isGaragePromoProduct,
  tierFromGarageProduct,
} from '@/lib/chat-garages';

/** بعد از پرداخت موفق — pending_review تا ادمین تأیید کند */
export async function applyGaragePromoAfterPayment(
  tx: any,
  purchase: { userId: number; productId: string; garageId?: number | null }
) {
  if (!isGaragePromoProduct(purchase.productId)) return;
  const garageId = purchase.garageId;
  if (!garageId) return;

  const tier = tierFromGarageProduct(purchase.productId);
  const days = PRODUCTS[purchase.productId as ProductId]?.days || 30;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  await tx
    .update(garages)
    .set({
      subscriptionTier: tier,
      subscriptionExpiresAt: expires.toISOString(),
      isFeatured: tier === 'gold',
      chatStatus: 'pending_review',
      showInChat: false,
      updatedAt: new Date(),
    })
    .where(eq(garages.id, garageId));
}
