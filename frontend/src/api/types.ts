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

// ---------- Dieu phoi / quan tri / nhan vien ----------

export type Skill = 'CHEF' | 'ASSISTANT_CHEF' | 'SERVER' | 'SETUP' | 'DRIVER'

export interface QuoteItemInput {
  itemType: QuoteItem['itemType']
  description: string
  quantity: number
  unit: string
  unitPrice: number
}

export interface QuoteInput {
  items: QuoteItemInput[]
  depositAmount: number | null
  validUntil: string
  notes: string | null
  terms: string | null
  send: boolean
}

export interface ScheduleConflict {
  assignmentId: number
  bookingId: number
  bookingCode: string
  task: string
  shiftStart: string
  shiftEnd: string
}

export interface StaffSuggestion {
  staffId: number
  fullName: string
  phone: string | null
  skills: Skill[]
  hasSkill: boolean
  free: boolean
  conflicts: ScheduleConflict[]
  shiftsThisWeek: number
  alreadyOnBooking: boolean
}

export interface DefaultShift {
  shiftStart: string
  shiftEnd: string
  prepMinutes: number
  teardownMinutes: number
}

export interface AssignmentFull {
  id: number
  bookingId: number
  bookingCode: string
  bookingStatus: BookingStatus
  serviceName: string
  menuName: string
  address: string
  contactName: string
  contactPhone: string
  guestCount: number
  tableCount: number | null
  partyStart: string
  partyEnd: string
  staffId: number
  staffName: string
  staffPhone: string | null
  taskRole: Skill
  task: string
  shiftStart: string
  shiftEnd: string
  status: string
  note: string | null
  bookingNote: string | null
  teammates: { name: string; phone: string | null; taskRole: Skill; task: string }[]
  nextStatuses: string[]
}

export interface StaffMember {
  id: number
  fullName: string
  phone: string | null
  email: string | null
  active: boolean
  note: string | null
  skills: Skill[]
  userId: number | null
  accountEmail: string | null
  accountActive: boolean | null
}

export interface Dashboard {
  from: string
  to: string
  newRequests: number
  pendingNew: number
  pendingCancelRequests: number
  awaitingDeposit: number
  eventsInRange: number
  statusCounts: Record<BookingStatus, number>
  orderValue: number
  completedRevenue: number
  collected: number
  depositCollected: number
  balanceCollected: number
  refunded: number
  netCollected: number
  receivable: number
  granularity: 'day' | 'month'
  series: { label: string; orderValue: number; collected: number; events: number }[]
  upcoming: {
    id: number
    code: string
    serviceName: string
    contactName: string
    startTime: string
    endTime: string
    address: string
    guestCount: number
    status: BookingStatus
    paymentStatus: string
    assignmentStatus: string
    staffCount: number
  }[]
}

export interface UserRow {
  id: number
  email: string
  phone: string | null
  fullName: string
  role: Role
  active: boolean
  createdAt: string
  staffId: number | null
}

export interface Setting {
  key: string
  value: string
  description: string | null
}

export interface AuditRow {
  id: number
  actorName: string | null
  actorEmail: string | null
  action: string
  entity: string
  entityId: number | null
  detail: string | null
  createdAt: string
}

export interface DishCategory {
  id: number
  name: string
  sortOrder: number
  active: boolean
  dishCount: number
}
