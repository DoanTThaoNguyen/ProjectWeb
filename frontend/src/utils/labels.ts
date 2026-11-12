import type { BookingStatus } from '../api/types'

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: string; hint: string }> = {
  NEW: { label: 'Yêu cầu mới', tone: 'info', hint: 'Chúng tôi đã nhận yêu cầu và sẽ liên hệ tư vấn trong giờ làm việc.' },
  CONSULTING: { label: 'Đang tư vấn', tone: 'info', hint: 'Điều phối viên đang trao đổi với bạn để hoàn thiện thông tin tiệc.' },
  QUOTED: { label: 'Đã gửi báo giá', tone: 'warn', hint: 'Báo giá đã sẵn sàng. Vui lòng xem và chấp nhận trước ngày hết hiệu lực.' },
  AWAITING_DEPOSIT: { label: 'Chờ cọc', tone: 'warn', hint: 'Bạn đã chấp nhận báo giá. Lịch tiệc được giữ khi chúng tôi xác nhận đã nhận cọc.' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'ok', hint: 'Tiệc đã được xác nhận, đội ngũ đang chuẩn bị.' },
  IN_PROGRESS: { label: 'Đang thực hiện', tone: 'ok', hint: 'Đội bếp đang chuẩn bị/phục vụ tiệc của bạn.' },
  COMPLETED: { label: 'Hoàn tất', tone: 'done', hint: 'Cảm ơn bạn đã tin chọn chúng tôi!' },
  CANCELLED: { label: 'Đã hủy', tone: 'muted', hint: 'Đơn đã hủy. Việc hoàn tiền (nếu có) được xử lý và ghi nhận riêng.' },
}

export const STATUS_FLOW: BookingStatus[] = ['NEW', 'CONSULTING', 'QUOTED', 'AWAITING_DEPOSIT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']

export const PAYMENT_STATUS: Record<string, { label: string; tone: string }> = {
  UNPAID: { label: 'Chưa thanh toán', tone: 'muted' },
  DEPOSIT_PAID: { label: 'Đã thu một phần', tone: 'warn' },
  PAID: { label: 'Đã thanh toán đủ', tone: 'ok' },
  REFUNDED: { label: 'Có hoàn tiền', tone: 'danger' },
}

export const ASSIGNMENT_STATUS: Record<string, { label: string; tone: string }> = {
  UNASSIGNED: { label: 'Chưa phân công', tone: 'muted' },
  ASSIGNED: { label: 'Đã phân công', tone: 'info' },
  DONE: { label: 'Nhân sự xong việc', tone: 'ok' },
}

export const TASK_STATUS: Record<string, { label: string; tone: string }> = {
  ASSIGNED: { label: 'Được giao', tone: 'info' },
  CONFIRMED: { label: 'Đã nhận việc', tone: 'info' },
  IN_PROGRESS: { label: 'Đang làm', tone: 'warn' },
  DONE: { label: 'Hoàn thành', tone: 'ok' },
  CANCELLED: { label: 'Đã hủy', tone: 'muted' },
}

export const SKILLS: Record<string, string> = {
  CHEF: 'Đầu bếp',
  ASSISTANT_CHEF: 'Phụ bếp',
  SERVER: 'Phục vụ',
  SETUP: 'Setup',
  DRIVER: 'Vận chuyển',
}

export const PAYMENT_TYPE: Record<string, string> = { DEPOSIT: 'Thu cọc', BALANCE: 'Thu phần còn lại', REFUND: 'Hoàn tiền' }
export const PAYMENT_METHOD: Record<string, string> = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', CARD: 'Thẻ', OTHER: 'Khác' }
export const ROLE_LABEL: Record<string, string> = { CUSTOMER: 'Khách hàng', COORDINATOR: 'Điều phối', STAFF: 'Nhân viên', ADMIN: 'Quản trị' }
export const QUOTE_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: 'Bản nháp', tone: 'muted' },
  SENT: { label: 'Đang chờ chấp nhận', tone: 'warn' },
  ACCEPTED: { label: 'Đã chấp nhận', tone: 'ok' },
  SUPERSEDED: { label: 'Đã thay thế', tone: 'muted' },
}
