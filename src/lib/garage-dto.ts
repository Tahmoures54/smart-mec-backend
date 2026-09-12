import { garages } from '@/db/schema';
import { garageTierRank } from '@/lib/constants';

export type GarageRow = typeof garages.$inferSelect;

export function parseSpecialties(raw: string | null | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toPublicGarage(
  g: GarageRow,
  extra?: { distanceMeters?: number | null }
) {
  return {
    id: String(g.id),
    name: g.name,
    address: g.address,
    phone: g.phone,
    lat: g.lat,
    lng: g.lng,
    rating: g.rating,
    userRatingsTotal: g.reviewsCount ?? 0,
    reviewsCount: g.reviewsCount ?? 0,
    specialties: parseSpecialties(g.specialties),
    photoUrl: g.photoUrl,
    website: g.website,
    description: g.description,
    isOpen: g.isOpen,
    isFeatured: g.isFeatured,
    isVerified: g.isVerified,
    subscriptionTier: g.subscriptionTier || 'free',
    subscriptionExpiresAt: g.subscriptionExpiresAt,
    city: g.city,
    distanceMeters: extra?.distanceMeters ?? null,
  };
}

export function compareGarages<
  T extends {
    subscriptionTier?: string | null;
    isFeatured?: boolean | null;
    distanceMeters?: number | null;
  },
>(a: T, b: T): number {
  const tr =
    garageTierRank(b.subscriptionTier) - garageTierRank(a.subscriptionTier);
  if (tr !== 0) return tr;
  if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
    return a.isFeatured ? -1 : 1;
  }
  return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
}
