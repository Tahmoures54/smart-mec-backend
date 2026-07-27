import { sqliteTable, integer, text, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phone: text('phone').unique().notNull(),
  credits: integer('credits').default(0).notNull(),
  isGolden: integer('is_golden', { mode: 'boolean' }).default(false).notNull(),
  goldenExpiresAt: text('golden_expires_at'),
  monthlyLimit: integer('monthly_limit').default(200), // 👈 سقف مصرف
  referralCode: text('referral_code').unique(),
  referredBy: integer('referred_by').references((): AnySQLiteColumn => users.id),
  earnings: integer('earnings').default(0).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 👈 جدول مصرف کاربران طلایی
export const goldenUsage = sqliteTable('golden_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  yearMonth: text('year_month').notNull(), // فرمت: YYYY-MM
  count: integer('count').default(0).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const otps = sqliteTable('otps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phone: text('phone').notNull(),
  code: text('code').notNull(),
  expiresAt: integer('expires_at').notNull(),
  isUsed: integer('is_used', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const diagnostics = sqliteTable('diagnostics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  carId: text('car_id').notNull(),
  description: text('description').notNull(),
  result: text('result').notNull(),
  audioUrl: text('audio_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const purchases = sqliteTable('purchases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  productId: text('product_id').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').default('pending').notNull(),
  authority: text('authority').unique(),
  refId: text('ref_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});