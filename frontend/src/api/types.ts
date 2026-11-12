// Kieu du lieu khop voi DTO backend (so tien la number VND).
export type Role = 'CUSTOMER' | 'COORDINATOR' | 'STAFF' | 'ADMIN'

export interface User {
  id: number
  email: string
  phone: string | null
  fullName: string
  role: Role
  active: boolean
  address: string | null
}

export interface AuthResponse {
  token: string
  user: User
}

export interface PartyService {
  id: number
  code: string
  name: string
  tagline: string | null
  description: string | null
  image: string | null
  minGuests: number
  active: boolean
  menuCount: number
  fromPricePerGuest: number | null
}

export type PriceUnit = 'TABLE' | 'GUEST'

export interface MenuSummary {
  id: number
  slug: string
  name: string
  summary: string | null
  image: string | null
  serviceId: number
  serviceCode: string
  serviceName: string
  price: number
  priceUnit: PriceUnit
  guestsPerTable: number | null
  minQuantity: number
  pricePerGuest: number
  featured: boolean
  active: boolean
}

export interface Dish {
  id: number
  name: string
  description: string | null
  image: string | null
  categoryId: number
  categoryName: string
  active: boolean
}

export interface MenuDetail {
  menu: MenuSummary
  description: string | null
  dishGroups: { category: string; dishes: Dish[] }[]
  dishIds: number[]
}

export type ChargeType = 'FIXED' | 'PER_GUEST' | 'PER_TABLE'

export interface Addon {
  id: number
  name: string
  description: string | null
  price: number
  chargeType: ChargeType
  unitLabel: string
  sortOrder: number
  active: boolean
}

export interface EstimateLine {
  type: string
  refId: number
  description: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
}

export interface Estimate {
  lines: EstimateLine[]
  total: number
  tableCount: number | null
  minTables: number
}

export type BookingStatus =
  | 'NEW'
  | 'CONSULTING'
  | 'QUOTED'
  | 'AWAITING_DEPOSIT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export interface BookingSummary {
  id: number
  code: string
  serviceName: string
  menuName: string
  startTime: string
  endTime: string
  address: string
  guestCount: number
  tableCount: number | null
  estimatedTotal: number
  quotedTotal: number | null
  status: BookingStatus
  paymentStatus: string
  assignmentStatus: string
  cancelRequested: boolean
  contactName: string
  contactPhone: string
  customerEmail: string
  createdAt: string
  menuImage: string | null
}

export interface QuoteItem {
  id: number
  itemType: 'MENU' | 'ADDON' | 'FEE' | 'DISCOUNT'
  description: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
}

export interface Quote {
  id: number
  versionNo: number
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'SUPERSEDED'
  subtotal: number
  total: number
  depositAmount: number
  validUntil: string
  expired: boolean
  notes: string | null
  terms: string | null
  sentAt: string | null
  acceptedAt: string | null
  items: QuoteItem[]
}

export interface PaymentSummary {
  total: number | null
  depositRequired: number | null
  paid: number
  refunded: number
  netPaid: number
  remaining: number | null
}

export interface Payment {
  id: number
  type: 'DEPOSIT' | 'BALANCE' | 'REFUND'
  amount: number
  method: string
  referenceCode: string | null
  paidAt: string
  recordedByName: string | null
  note: string | null
}

export interface AssignmentLite {
  id: number
  staffId: number
  staffName: string
  staffPhone: string | null
  taskRole: string
  task: string
  shiftStart: string
  shiftEnd: string
  status: string
  note: string | null
}

export interface BookingDetail {
  summary: BookingSummary
  customerId: number
  customerName: string
  serviceId: number
  menuId: number
  menuSlug: string
  menuPriceSnapshot: number
  menuUnitSnapshot: PriceUnit
  budget: number | null
  note: string | null
  addons: { addonId: number; name: string; quantity: number; unitPrice: number; chargeType: ChargeType }[]
  cancelReason: string | null
  cancelledAt: string | null
  history: { fromStatus: string | null; toStatus: string; changedByName: string | null; note: string | null; createdAt: string }[]
  quotes: Quote[]
  acceptedQuoteId: number | null
  payments: Payment[]
  paymentSummary: PaymentSummary
  assignments: AssignmentLite[]
  allowedActions: string[]
}

export interface PublicConfig {
  brandName: string
  minLeadHours: number
  depositPercent: number
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}
