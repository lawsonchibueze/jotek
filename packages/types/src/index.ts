// ─── Enums ───────────────────────────────────────────────────────────────────

export type ProductCondition = 'NEW' | 'REFURBISHED' | 'OPEN_BOX';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'PAYSTACK_CARD'
  | 'PAYSTACK_TRANSFER'
  | 'PAYSTACK_USSD'
  | 'PAY_ON_DELIVERY';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

export type DeliveryMethod = 'COURIER_GIG' | 'COURIER_KWIK' | 'COURIER_SENDBOX' | 'PICKUP' | 'STANDARD';

export type ShipmentStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';

export type ShipmentCarrier = 'GIG' | 'KWIK' | 'SENDBOX' | 'DHL' | 'SELF';

export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

export type AddressLabel = 'HOME' | 'WORK' | 'OTHER';

export type AdminRole = 'super_admin' | 'manager' | 'inventory_clerk' | 'support';

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  children?: Category[];
}

// ─── Brand ───────────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  variantId: string | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  color: string | null;
  colorHex: string | null;
  storage: string | null;
  ram: string | null;
  price: string;
  compareAtPrice: string | null;
  weightKg: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  inventory?: {
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  brand: Brand | null;
  category: Category | null;
  condition: ProductCondition;
  warrantyMonths: number;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  variants: ProductVariant[];
  images: ProductImage[];
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  primaryImage: string | null;
  minPrice: string;
  maxPrice: string;
  compareAtPrice: string | null;
  isInStock: boolean;
  rating: number;
  reviewCount: number;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  condition: ProductCondition;
  warrantyMonths: number;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  priceAtAdd: string;
  product: {
    name: string;
    slug: string;
    primaryImage: string | null;
  };
  variant: {
    sku: string;
    color: string | null;
    storage: string | null;
    ram: string | null;
    price: string;
    compareAtPrice: string | null;
    availableQuantity: number;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: string;
  itemCount: number;
  coupon: AppliedCoupon | null;
  discountAmount: string;
  total: string;
}

export interface AppliedCoupon {
  code: string;
  type: CouponType;
  value: string;
  discountAmount: string;
}

// ─── Address ─────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  label: AddressLabel;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  isDefault: boolean;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  variantId: string;
  productName: string;
  variantDescription: string;
  variantLabel: string;    // alias for variantDescription — populated by API
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string;
  discountAmount: string;
  shippingFee: string;
  taxAmount: string;
  total: string;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  shippingAddress: Address;
  items: OrderItem[];
  // Populated on admin endpoints
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  payment: {
    id?: string;
    reference: string;
    channel: string | null;
    status: PaymentStatus;
    amountKobo?: string;
    verifiedAt: string | null;
    createdAt?: string;
  } | null;
  shipment: {
    carrier: ShipmentCarrier;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: ShipmentStatus;
    estimatedDelivery: string | null;
    deliveredAt: string | null;
  } | null;
  notes: string | null;
  adminNotes?: string | null;
  cancelledReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Shipping ────────────────────────────────────────────────────────────────

export interface ShippingOption {
  zoneId: string;
  name: string;
  carrier: ShipmentCarrier;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  cost: string;
  isPodAvailable: boolean;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  adminReplied: string | null;
  user: {
    name: string;
    avatarInitials: string;
  };
  createdAt: string;
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export interface CheckoutTotals {
  subtotal: string;
  discountAmount: string;
  shippingFee: string;
  total: string;
}

export interface CreateOrderPayload {
  cartId: string;
  addressId?: string;
  guestAddress?: Omit<Address, 'id' | 'isDefault'>;
  shippingZoneId: string;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  couponCode?: string;
  notes?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface InitializePaymentResponse {
  authorizationUrl: string;
  reference: string;
  orderId: string;
  orderNumber: string;
}

// ─── User / Auth ─────────────────────────────────────────────────────────────

export interface CustomerUser {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  image: string | null;
  emailVerified: boolean;
  phoneNumberVerified: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  image: string | null;
  createdAt: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchFilters {
  query?: string;
  categorySlug?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: ProductCondition;
  inStockOnly?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}

export interface SearchFacets {
  categories: Array<{ value: string; label: string; count: number }>;
  brands: Array<{ value: string; label: string; count: number }>;
  priceRanges: Array<{ min: number; max: number; label: string; count: number }>;
  conditions: Array<{ value: ProductCondition; count: number }>;
}

export interface SearchResponse {
  products: ProductCard[];
  facets: SearchFacets;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    query: string | null;
  };
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  revenue30d: number;
  orders30d: number;
  totalCustomers: number;
  lowStockCount: number;
  pendingFulfillment: number;
  revenueChangePercent: number;
}

export interface SalesReport {
  date: string;
  revenue: string;
  orders: number;
  aov: string;
}

export interface TopProduct {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: string;
}
