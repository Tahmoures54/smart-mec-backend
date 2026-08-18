import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  bigint,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
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
});

export const goldenUsage = pgTable('golden_usage', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  yearMonth: text('year_month').notNull(),
  count: integer('count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const otps = pgTable('otps', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull(),
  code: text('code').notNull(),
  // 🔧 تغییر از integer به bigint
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const diagnostics = pgTable('diagnostics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  carId: text('car_id').notNull(),
  description: text('description').notNull(),
  result: text('result').notNull(),
  audioUrl: text('audio_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  productId: text('product_id').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').default('pending').notNull(),
  authority: text('authority').unique(),
  refId: text('ref_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const withdrawals = pgTable('withdrawals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  amount: integer('amount').notNull(),
  cardNumber: text('card_number').notNull(),
  fullName: text('full_name').notNull(),
  status: text('status').default('pending').notNull(),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
