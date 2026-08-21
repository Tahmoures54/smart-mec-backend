import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  bigint,
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
  (table) => [
    index('users_referred_by_idx').on(table.referredBy),
    index('users_is_golden_idx').on(table.isGolden),
  ]
);

export const goldenUsage = pgTable(
  'golden_usage',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    yearMonth: text('year_month').notNull(),
    count: integer('count').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('golden_usage_user_month_uidx').on(table.userId, table.yearMonth),
  ]
);

export const monthlyFreeUsage = pgTable(
  'monthly_free_usage',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    yearMonth: text('year_month').notNull(),
    freeCount: integer('free_count').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('monthly_free_usage_user_month_uidx').on(table.userId, table.yearMonth),
  ]
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
  (table) => [
    index('otps_phone_idx').on(table.phone),
    index('otps_expires_at_idx').on(table.expiresAt),
  ]
);

export const diagnostics = pgTable(
  'diagnostics',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    carId: text('car_id').notNull(),
    description: text('description').notNull(),
    result: text('result').notNull(),
    audioUrl: text('audio_url'),
    /** امتیاز کاربر: 1=بد، 5=عالی — null یعنی هنوز امتیاز نداده */
    rating: integer('rating'),
    feedback: text('feedback'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('diagnostics_user_id_idx').on(table.userId),
    index('diagnostics_created_at_idx').on(table.createdAt),
    index('diagnostics_car_id_idx').on(table.carId),
  ]
);

export const purchases = pgTable(
  'purchases',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    productId: text('product_id').notNull(),
    amount: integer('amount').notNull(),
    status: text('status').default('pending').notNull(),
    authority: text('authority').unique(),
    refId: text('ref_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('purchases_user_id_idx').on(table.userId),
    index('purchases_status_idx').on(table.status),
  ]
);

export const withdrawals = pgTable(
  'withdrawals',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    amount: integer('amount').notNull(),
    cardNumber: text('card_number').notNull(),
    fullName: text('full_name').notNull(),
    status: text('status').default('pending').notNull(),
    adminNote: text('admin_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('withdrawals_user_id_idx').on(table.userId),
    index('withdrawals_status_idx').on(table.status),
  ]
);

/**
 * رویدادهای محصول برای رشد و تحلیل رفتار کاربر
 * مثال: app_open, diagnose_start, diagnose_success, purchase_start,
 *        referral_share, screen_view
 */
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    eventName: text('event_name').notNull(),
    properties: text('properties'), // JSON string
    platform: text('platform'), // android | ios | web
    appVersion: text('app_version'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('events_name_idx').on(table.eventName),
    index('events_user_id_idx').on(table.userId),
    index('events_created_at_idx').on(table.createdAt),
  ]
);
