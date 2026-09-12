import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  bigint,
  doublePrecision,
  AnyPgColumn,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    phone: text('phone').unique().notNull(),
    credits: integer('credits').default(0).notNull(),
    isGolden: boolean('is_golden').default(false).notNull(),
    goldenExpiresAt: text('golden_expires_at'),
    monthlyLimit: integer('monthly_limit').default(200),
    referralCode: text('referral_code').unique(),
    referredBy: integer('referred_by').references((): AnyPgColumn => users.id),
    earnings: integer('earnings').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    referredByIdx: index('idx_users_referred_by').on(t.referredBy),
  })
);

export const goldenUsage = pgTable(
  'golden_usage',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    yearMonth: text('year_month').notNull(),
    count: integer('count').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userMonth: uniqueIndex('idx_golden_usage_user_month').on(t.userId, t.yearMonth),
  })
);

export const monthlyFreeUsage = pgTable(
  'monthly_free_usage',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    yearMonth: text('year_month').notNull(),
    freeCount: integer('free_count').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userMonth: uniqueIndex('idx_monthly_free_usage_user_month').on(
      t.userId,
      t.yearMonth
    ),
  })
);

export const otps = pgTable(
  'otps',
  {
    id: serial('id').primaryKey(),
    phone: text('phone').notNull(),
    code: text('code').notNull(),
    expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
    isUsed: boolean('is_used').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    phoneIdx: index('idx_otps_phone').on(t.phone),
    expiryIdx: index('idx_otps_expires_at').on(t.expiresAt),
  })
);

export const diagnostics = pgTable(
  'diagnostics',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    carId: text('car_id').notNull(),
    description: text('description').notNull(),
    result: text('result').notNull(),
    audioUrl: text('audio_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_diagnostics_user_id').on(t.userId),
    createdIdx: index('idx_diagnostics_created_at').on(t.createdAt),
  })
);

export const purchases = pgTable(
  'purchases',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    productId: text('product_id').notNull(),
    amount: integer('amount').notNull(),
    status: text('status').default('pending').notNull(),
    authority: text('authority').unique(),
    refId: text('ref_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_purchases_user_id').on(t.userId),
    statusIdx: index('idx_purchases_status').on(t.status),
  })
);

export const withdrawals = pgTable(
  'withdrawals',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    amount: integer('amount').notNull(),
    cardNumber: text('card_number').notNull(),
    fullName: text('full_name').notNull(),
    status: text('status').default('pending').notNull(),
    adminNote: text('admin_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_withdrawals_user_id').on(t.userId),
    statusIdx: index('idx_withdrawals_status').on(t.status),
  })
);

/**
 * تعمیرگاه‌ها — دیتابیس خود اپ
 * subscriptionTier: free | silver | gold
 */
export const garages = pgTable(
  'garages',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    address: text('address'),
    phone: text('phone'),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    rating: doublePrecision('rating'),
    reviewsCount: integer('reviews_count').default(0),
    specialties: text('specialties'),
    photoUrl: text('photo_url'),
    website: text('website'),
    description: text('description'),
    isOpen: boolean('is_open').default(true),
    isFeatured: boolean('is_featured').default(false).notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    subscriptionTier: text('subscription_tier').default('free').notNull(),
    subscriptionExpiresAt: text('subscription_expires_at'),
    city: text('city'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    latLngIdx: index('idx_garages_lat_lng').on(t.lat, t.lng),
    activeIdx: index('idx_garages_active').on(t.isActive),
    featuredIdx: index('idx_garages_featured').on(t.isFeatured),
    cityIdx: index('idx_garages_city').on(t.city),
  })
);

export const feedbacks = pgTable(
  'feedbacks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    diagnosticId: integer('diagnostic_id').references(() => diagnostics.id),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_feedbacks_user_id').on(t.userId),
    diagnosticIdx: index('idx_feedbacks_diagnostic_id').on(t.diagnosticId),
  })
);
