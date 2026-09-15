import { db } from '@/db';
import { garages } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { haversineMeters } from '@/lib/geo';
import { compareGarages, toPublicGarage } from '@/lib/garage-dto';

/**
 * تعمیرگاه‌هایی که پرداخت کرده‌اند و ادمین تأیید کرده تا در چت معرفی شوند.
 */
export async function getChatApprovedGaragesNearby(opts: {
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  limit?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 3, 1), 5);

  const rows = await db
    .select()
    .from(garages)
    .where(
      and(
        eq(garages.isActive, true),
        eq(garages.showInChat, true),
        eq(garages.chatStatus, 'approved')
      )
    )
    .limit(80);

  const now = Date.now();
  let list = rows.filter((g) => {
    if (!g.subscriptionExpiresAt) return true;
    const exp = Date.parse(g.subscriptionExpiresAt);
    return !Number.isFinite(exp) || exp > now;
  });

  if (opts.city) {
    const c = opts.city.trim().toLowerCase();
    const cityMatch = list.filter((g) => (g.city || '').toLowerCase().includes(c));
    if (cityMatch.length) list = cityMatch;
  }

  const withDist = list.map((g) => {
    let distanceMeters: number | null = null;
    if (
      opts.lat != null &&
      opts.lng != null &&
      Number.isFinite(opts.lat) &&
      Number.isFinite(opts.lng)
    ) {
      distanceMeters = Math.round(haversineMeters(opts.lat, opts.lng, g.lat, g.lng));
    }
    return toPublicGarage(g, { distanceMeters });
  });

  withDist.sort(compareGarages);
  return withDist.slice(0, limit);
}

export function formatGaragesForChat(
  items: Awaited<ReturnType<typeof getChatApprovedGaragesNearby>>
): string {
  if (!items.length) return '';
  const lines = items.map((g, i) => {
    const parts = [`${i + 1}. **${g.name}**`];
    if (g.city) parts.push(`(${g.city})`);
    if (g.address) parts.push(`— ${g.address}`);
    if (g.phone) parts.push(`☎️ ${g.phone}`);
    if (g.specialties?.length) parts.push(`تخصص: ${g.specialties.slice(0, 4).join('، ')}`);
    if (g.distanceMeters != null) {
      const km = (g.distanceMeters / 1000).toFixed(1);
      parts.push(`~${km} کیلومتر`);
    }
    return parts.join(' ');
  });
  return (
    '\n\n---\n## 🔧 تعمیرگاه‌های پیشنهادی (تأییدشده)\n' +
    lines.join('\n') +
    '\n\n_این معرفی‌ها از تعمیرگاه‌های عضو طرح معرفی اپ هستند؛ انتخاب نهایی با شماست._'
  );
}

export function isGaragePromoProduct(productId: string): boolean {
  return productId === 'garage_silver_30' || productId === 'garage_gold_30';
}

export function tierFromGarageProduct(productId: string): 'silver' | 'gold' {
  return productId === 'garage_gold_30' ? 'gold' : 'silver';
}
