import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─── Better Auth Core Tables ──────────────────────────────────────────────────
// These match Better Auth's expected schema exactly.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // admin plugin fields
  role: text('role').default('user'), // user | super_admin | manager | inventory_clerk | support
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  // phone number plugin fields
  phoneNumber: text('phone_number').unique(),
  phoneNumberVerified: boolean('phone_number_verified').default(false),
  // two-factor plugin fields
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const twoFactor = pgTable('two_factor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

// ─── Enums ────────────────────────────────────────────────────────────────────

export const productConditionEnum = pgEnum('product_condition', ['NEW', 'REFURBISHED', 'OPEN_BOX']);

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'PAYSTACK_CARD',
  'PAYSTACK_TRANSFER',
  'PAYSTACK_USSD',
  'PAY_ON_DELIVERY',
]);

export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'SUCCESS', 'FAILED', 'REVERSED']);

export const deliveryMethodEnum = pgEnum('delivery_method', [
  'COURIER_GIG',
  'COURIER_KWIK',
  'COURIER_SENDBOX',
  'PICKUP',
  'STANDARD',
]);

export const shipmentStatusEnum = pgEnum('shipment_status', [
  'PENDING',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
]);

export const shipmentCarrierEnum = pgEnum('shipment_carrier', ['GIG', 'KWIK', 'SENDBOX', 'DHL', 'SELF']);

export const couponTypeEnum = pgEnum('coupon_type', ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']);

export const addressLabelEnum = pgEnum('address_label', ['HOME', 'WORK', 'OTHER']);

export const blogPostStatusEnum = pgEnum('blog_post_status', ['DRAFT', 'PUBLISHED']);

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    parentId: uuid('parent_id'),
    imageUrl: varchar('image_url'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    metaTitle: varchar('meta_title', { length: 70 }),
    metaDescription: varchar('meta_description', { length: 160 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_categories_slug').on(t.slug),
    index('idx_categories_parent').on(t.parentId),
  ],
);

// ─── Brands ───────────────────────────────────────────────────────────────────

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    logoUrl: varchar('logo_url'),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_brands_slug').on(t.slug)],
);

// ─── Products ─────────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    sku: varchar('sku', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 280 }).notNull().unique(),
    description: text('description'),
    shortDescription: text('short_description'),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    condition: productConditionEnum('condition').notNull().default('NEW'),
    warrantyMonths: integer('warranty_months').notNull().default(12),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    tags: text('tags').array().default(sql`'{}'::text[]`),
    metaTitle: varchar('meta_title', { length: 70 }),
    metaDescription: varchar('meta_description', { length: 160 }),
    metaKeywords: varchar('meta_keywords', { length: 200 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    uniqueIndex('idx_products_slug_active').on(t.slug).where(sql`${t.deletedAt} IS NULL`),
    index('idx_products_category').on(t.categoryId),
    index('idx_products_brand').on(t.brandId),
    index('idx_products_featured').on(t.isFeatured),
  ],
);

// ─── Product Variants ─────────────────────────────────────────────────────────

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 120 }).notNull().unique(),
    color: varchar('color', { length: 50 }),
    colorHex: char('color_hex', { length: 7 }),
    storage: varchar('storage', { length: 20 }),
    ram: varchar('ram', { length: 20 }),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    weightKg: numeric('weight_kg', { precision: 6, scale: 3 }),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('idx_variants_product').on(t.productId),
    uniqueIndex('idx_variants_sku').on(t.sku),
  ],
);

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    variantId: uuid('variant_id')
      .notNull()
      .unique()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    warehouseLocation: varchar('warehouse_location', { length: 100 }),
    lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('idx_inventory_variant').on(t.variantId)],
);

// ─── Product Images ───────────────────────────────────────────────────────────

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    url: varchar('url').notNull(),
    altText: varchar('alt_text', { length: 200 }),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (t) => [
    index('idx_images_product').on(t.productId),
    index('idx_images_variant').on(t.variantId),
  ],
);

// ─── Carts ────────────────────────────────────────────────────────────────────

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 100 }),
    couponId: uuid('coupon_id'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_carts_user').on(t.userId),
    index('idx_carts_session').on(t.sessionId),
  ],
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    priceAtAdd: numeric('price_at_add', { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    index('idx_cart_items_cart').on(t.cartId),
    uniqueIndex('idx_cart_items_cart_variant').on(t.cartId, t.variantId),
  ],
);

// ─── Addresses ────────────────────────────────────────────────────────────────

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    label: addressLabelEnum('label').notNull().default('HOME'),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    line1: varchar('line1', { length: 255 }).notNull(),
    line2: varchar('line2', { length: 255 }),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    country: char('country', { length: 2 }).notNull().default('NG'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_addresses_user').on(t.userId)],
);

// ─── Shipping Zones ───────────────────────────────────────────────────────────

export const shippingZones = pgTable('shipping_zones', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  states: text('states').array().notNull().default(sql`'{}'::text[]`),
  baseRate: numeric('base_rate', { precision: 10, scale: 2 }).notNull(),
  ratePerKg: numeric('rate_per_kg', { precision: 10, scale: 2 }).notNull().default('0'),
  freeShippingThreshold: numeric('free_shipping_threshold', { precision: 12, scale: 2 }),
  podEnabled: boolean('pod_enabled').notNull().default(false),
  carrier: shipmentCarrierEnum('carrier').notNull().default('SELF'),
  estimatedDaysMin: integer('estimated_days_min').notNull().default(1),
  estimatedDaysMax: integer('estimated_days_max').notNull().default(3),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Coupons ─────────────────────────────────────────────────────────────────

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 50 }).notNull().unique(),
    type: couponTypeEnum('type').notNull(),
    value: numeric('value', { precision: 10, scale: 2 }).notNull(),
    minOrderAmount: numeric('min_order_amount', { precision: 12, scale: 2 }),
    maxDiscountAmount: numeric('max_discount_amount', { precision: 12, scale: 2 }),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    perUserLimit: integer('per_user_limit').notNull().default(1),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').notNull().default(true),
    applicableCategoryIds: uuid('applicable_category_ids').array(),
    applicableProductIds: uuid('applicable_product_ids').array(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('idx_coupons_code').on(t.code)],
);

export const couponUsages = pgTable(
  'coupon_usages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    orderId: uuid('order_id').notNull(),
    discountApplied: numeric('discount_applied', { precision: 12, scale: 2 }).notNull(),
    usedAt: timestamp('used_at').notNull().defaultNow(),
  },
  (t) => [index('idx_coupon_usages_coupon').on(t.couponId)],
);

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    guestEmail: varchar('guest_email', { length: 255 }),
    guestPhone: varchar('guest_phone', { length: 20 }),
    status: orderStatusEnum('status').notNull().default('PENDING_PAYMENT'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    shippingFee: numeric('shipping_fee', { precision: 12, scale: 2 }).notNull().default('0'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    deliveryMethod: deliveryMethodEnum('delivery_method').notNull().default('STANDARD'),
    shippingAddress: jsonb('shipping_address').notNull(),
    shippingZoneId: uuid('shipping_zone_id').references(() => shippingZones.id, {
      onDelete: 'set null',
    }),
    couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
    notes: text('notes'),
    adminNotes: text('admin_notes'),
    cancelledReason: text('cancelled_reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_orders_number').on(t.orderNumber),
    index('idx_orders_user').on(t.userId),
    index('idx_orders_status').on(t.status),
    index('idx_orders_created').on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    productName: varchar('product_name', { length: 255 }).notNull(),
    variantDescription: varchar('variant_description', { length: 200 }),
    imageUrl: varchar('image_url'),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [index('idx_order_items_order').on(t.orderId)],
);

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    paystackReference: varchar('paystack_reference', { length: 100 }).notNull().unique(),
    amountKobo: numeric('amount_kobo').notNull(),
    channel: varchar('channel', { length: 50 }),
    status: paymentStatusEnum('status').notNull().default('PENDING'),
    paystackResponse: jsonb('paystack_response'),
    verifiedAt: timestamp('verified_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_payments_reference').on(t.paystackReference),
    index('idx_payments_order').on(t.orderId),
  ],
);

// ─── Shipments ────────────────────────────────────────────────────────────────

export const shipments = pgTable(
  'shipments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    carrier: shipmentCarrierEnum('carrier').notNull().default('SELF'),
    trackingNumber: varchar('tracking_number', { length: 100 }),
    trackingUrl: varchar('tracking_url'),
    status: shipmentStatusEnum('status').notNull().default('PENDING'),
    estimatedDelivery: timestamp('estimated_delivery'),
    deliveredAt: timestamp('delivered_at'),
    shippingLabel: varchar('shipping_label'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_shipments_order').on(t.orderId)],
);

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    rating: smallint('rating').notNull(),
    title: varchar('title', { length: 150 }),
    body: text('body'),
    isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
    isApproved: boolean('is_approved').notNull().default(false),
    adminReplied: text('admin_replied'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_reviews_product').on(t.productId),
    index('idx_reviews_user').on(t.userId),
    uniqueIndex('idx_reviews_user_product_order').on(t.userId, t.productId, t.orderId),
  ],
);

// ─── Wishlists ────────────────────────────────────────────────────────────────

export const wishlists = pgTable('wishlists', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    wishlistId: uuid('wishlist_id')
      .notNull()
      .references(() => wishlists.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_wishlist_items_wishlist').on(t.wishlistId),
    uniqueIndex('idx_wishlist_items_unique').on(t.wishlistId, t.variantId),
  ],
);

// ─── Flash Sales ─────────────────────────────────────────────────────────────

export const flashSales = pgTable('flash_sales', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const flashSaleItems = pgTable(
  'flash_sale_items',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    flashSaleId: uuid('flash_sale_id')
      .notNull()
      .references(() => flashSales.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    salePrice: numeric('sale_price', { precision: 12, scale: 2 }).notNull(),
    originalPrice: numeric('original_price', { precision: 12, scale: 2 }).notNull(),
    stockLimit: integer('stock_limit').notNull(),
    soldCount: integer('sold_count').notNull().default(0),
  },
  (t) => [
    index('idx_flash_sale_items_sale').on(t.flashSaleId),
    uniqueIndex('idx_flash_sale_items_unique').on(t.flashSaleId, t.variantId),
  ],
);

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull().unique(),
    body: text('body'),
    excerpt: varchar('excerpt', { length: 300 }),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    status: blogPostStatusEnum('status').notNull().default('DRAFT'),
    publishedAt: timestamp('published_at'),
    featuredImageUrl: varchar('featured_image_url'),
    metaTitle: varchar('meta_title', { length: 70 }),
    metaDescription: varchar('meta_description', { length: 160 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_blog_posts_slug').on(t.slug),
    index('idx_blog_posts_status').on(t.status),
  ],
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    adminUserId: text('admin_user_id').references(() => user.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }),
    before: jsonb('before'),
    after: jsonb('after'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_logs_admin').on(t.adminUserId),
    index('idx_audit_logs_entity').on(t.entityType, t.entityId),
    index('idx_audit_logs_created').on(t.createdAt),
  ],
);

// ─── Scheduled Price Changes ─────────────────────────────────────────────────

export const scheduledPriceChanges = pgTable('scheduled_price_changes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  variantId: uuid('variant_id')
    .notNull()
    .references(() => productVariants.id, { onDelete: 'cascade' }),
  newPrice: numeric('new_price', { precision: 12, scale: 2 }).notNull(),
  newCompareAtPrice: numeric('new_compare_at_price', { precision: 12, scale: 2 }),
  scheduledAt: timestamp('scheduled_at').notNull(),
  appliedAt: timestamp('applied_at'),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Stock Alert Subscriptions ────────────────────────────────────────────────

export const stockAlertSubscriptions = pgTable(
  'stock_alert_subscriptions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    notifiedAt: timestamp('notified_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_stock_alerts_unique').on(t.variantId, t.email),
    index('idx_stock_alerts_variant').on(t.variantId),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id] }),
  children: many(categories),
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  images: many(productImages),
  reviews: many(reviews),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  inventory: one(inventory, { fields: [productVariants.id], references: [inventory.variantId] }),
  images: many(productImages),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  wishlistItems: many(wishlistItems),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariants, { fields: [inventory.variantId], references: [productVariants.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(user, { fields: [carts.userId], references: [user.id] }),
  items: many(cartItems),
  coupon: one(coupons, { fields: [carts.couponId], references: [coupons.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
  payment: one(payments, { fields: [orders.id], references: [payments.orderId] }),
  shipment: one(shipments, { fields: [orders.id], references: [shipments.orderId] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  shippingZone: one(shippingZones, { fields: [orders.shippingZoneId], references: [shippingZones.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(user, { fields: [reviews.userId], references: [user.id] }),
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(user, { fields: [wishlists.userId], references: [user.id] }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, { fields: [wishlistItems.wishlistId], references: [wishlists.id] }),
  variant: one(productVariants, {
    fields: [wishlistItems.variantId],
    references: [productVariants.id],
  }),
}));

export const flashSalesRelations = relations(flashSales, ({ many }) => ({
  items: many(flashSaleItems),
}));

export const flashSaleItemsRelations = relations(flashSaleItems, ({ one }) => ({
  sale: one(flashSales, { fields: [flashSaleItems.flashSaleId], references: [flashSales.id] }),
  variant: one(productVariants, {
    fields: [flashSaleItems.variantId],
    references: [productVariants.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  adminUser: one(user, { fields: [auditLogs.adminUserId], references: [user.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  usages: many(couponUsages),
  orders: many(orders),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, { fields: [couponUsages.couponId], references: [coupons.id] }),
  user: one(user, { fields: [couponUsages.userId], references: [user.id] }),
}));
