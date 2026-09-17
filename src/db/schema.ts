import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  bigint,
  doublePrecision,
  jsonb,
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
    /** رضایت پیامک‌های بازیابی/پیشنهاد — فقط با رضایت کاربر */
    marketingOptIn: boolean('marketing_opt_in').default(false).notNull(),
    recoverySmsAt: timestamp('recovery_sms_at', { withTimezone: true }),
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
    year: integer('year'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_diagnostics_user_id').on(t.userId),
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
    authority: text('authority'),
    refId: text('ref_id'),
    garageId: integer('garage_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_purchases_user_id').on(t.userId),
    authorityIdx: index('idx_purchases_authority').on(t.authority),
  })
);

export const withdrawals = pgTable(
  'withdrawals',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    amount: integer('amount').notNull(),
    cardNumber: text('card_number'),
    fullName: text('full_name'),
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
    ownerUserId: integer('owner_user_id').references(() => users.id),
    chatStatus: text('chat_status').default('none').notNull(),
    showInChat: boolean('show_in_chat').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    latLngIdx: index('idx_garages_lat_lng').on(t.lat, t.lng),
    activeIdx: index('idx_garages_active').on(t.isActive),
    featuredIdx: index('idx_garages_featured').on(t.isFeatured),
    cityIdx: index('idx_garages_city').on(t.city),
    ownerIdx: index('idx_garages_owner').on(t.ownerUserId),
    chatIdx: index('idx_garages_show_chat').on(t.showInChat),
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

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: serial('id').primaryKey(),
    event: text('event').notNull(),
    sessionId: text('session_id'),
    userId: integer('user_id'),
    path: text('path'),
    props: jsonb('props').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    eventIdx: index('idx_analytics_event').on(t.event),
    createdIdx: index('idx_analytics_created').on(t.createdAt),
  })
);
