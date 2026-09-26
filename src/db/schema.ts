import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  real,
  index,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    phone: text('phone').unique().notNull(),
    credits: integer('credits').default(0).notNull(),
    isGolden: integer('is_golden', { mode: 'boolean' }).default(false).notNull(),
    goldenExpiresAt: text('golden_expires_at'),
    monthlyLimit: integer('monthly_limit').default(200),
    referralCode: text('referral_code').unique(),
    referredBy: integer('referred_by').references((): AnySQLiteColumn => users.id),
    earnings: integer('earnings').default(0).notNull(),
    /** رضایت پیامک‌های بازیابی/پیشنهاد — فقط با رضایت کاربر */
    marketingOptIn: integer('marketing_opt_in', { mode: 'boolean' }).default(false).notNull(),
    recoverySmsAt: integer('recovery_sms_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    referredByIdx: index('idx_users_referred_by').on(t.referredBy),
  })
);

export const goldenUsage = sqliteTable(
  'golden_usage',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    yearMonth: text('year_month').notNull(),
    count: integer('count').default(0).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    userMonth: uniqueIndex('idx_golden_usage_user_month').on(t.userId, t.yearMonth),
  })
);

export const monthlyFreeUsage = sqliteTable(
  'monthly_free_usage',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    yearMonth: text('year_month').notNull(),
    freeCount: integer('free_count').default(0).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    userMonth: uniqueIndex('idx_monthly_free_usage_user_month').on(
      t.userId,
      t.yearMonth
    ),
  })
);

export const otps = sqliteTable(
  'otps',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    phone: text('phone').notNull(),
    code: text('code').notNull(),
    expiresAt: integer('expires_at').notNull(),
    isUsed: integer('is_used', { mode: 'boolean' }).default(false).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    phoneIdx: index('idx_otps_phone').on(t.phone),
    expiryIdx: index('idx_otps_expires_at').on(t.expiresAt),
  })
);

export const diagnostics = sqliteTable(
  'diagnostics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    carId: text('car_id').notNull(),
    description: text('description').notNull(),
    result: text('result').notNull(),
    /** Client-generated idempotency key; prevents duplicate billing after retries/timeouts. */
    requestId: text('request_id'),
    year: integer('year'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    userIdx: index('idx_diagnostics_user_id').on(t.userId),
    requestIdIdx: uniqueIndex('idx_diagnostics_request_id').on(t.requestId),
  })
);

export const purchases = sqliteTable(
  'purchases',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    productId: text('product_id').notNull(),
    amount: integer('amount').notNull(),
    status: text('status').default('pending').notNull(),
    authority: text('authority'),
    refId: text('ref_id'),
    garageId: integer('garage_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    userIdx: index('idx_purchases_user_id').on(t.userId),
    authorityIdx: index('idx_purchases_authority').on(t.authority),
  })
);

export const withdrawals = sqliteTable(
  'withdrawals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    amount: integer('amount').notNull(),
    cardNumber: text('card_number'),
    fullName: text('full_name'),
    status: text('status').default('pending').notNull(),
    adminNote: text('admin_note'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    userIdx: index('idx_withdrawals_user_id').on(t.userId),
    statusIdx: index('idx_withdrawals_status').on(t.status),
  })
);

export const garages = sqliteTable(
  'garages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    address: text('address'),
    phone: text('phone'),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    rating: real('rating'),
    reviewsCount: integer('reviews_count').default(0),
    specialties: text('specialties'),
    photoUrl: text('photo_url'),
    website: text('website'),
    description: text('description'),
    isOpen: integer('is_open', { mode: 'boolean' }).default(true),
    isFeatured: integer('is_featured', { mode: 'boolean' }).default(false).notNull(),
    isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    subscriptionTier: text('subscription_tier').default('free').notNull(),
    subscriptionExpiresAt: text('subscription_expires_at'),
    city: text('city'),
    ownerUserId: integer('owner_user_id').references(() => users.id),
    chatStatus: text('chat_status').default('none').notNull(),
    showInChat: integer('show_in_chat', { mode: 'boolean' }).default(false).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
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

export const feedbacks = sqliteTable(
  'feedbacks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    diagnosticId: integer('diagnostic_id').references(() => diagnostics.id),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    userIdx: index('idx_feedbacks_user_id').on(t.userId),
    diagnosticIdx: index('idx_feedbacks_diagnostic_id').on(t.diagnosticId),
  })
);

export const analyticsEvents = sqliteTable(
  'analytics_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    event: text('event').notNull(),
    sessionId: text('session_id'),
    userId: integer('user_id'),
    path: text('path'),
    props: text('props', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => ({
    eventIdx: index('idx_analytics_event').on(t.event),
    createdIdx: index('idx_analytics_created').on(t.createdAt),
  })
);
