// Cau hinh tap trung: doi ten thuong hieu / lien he demo tai day.
export const BRAND = {
  name: 'Tiệc Nhà',
  slogan: 'Tiệc ngon tại gia – trọn vẹn từ bếp đến bàn',
  hotline: '1900 0000', // so demo
  hotlineHref: 'tel:19000000',
  email: 'lienhe@tiecnha.vn', // email demo
  address: 'TP. Hồ Chí Minh (dữ liệu demo)',
  serviceArea: 'Nội thành TP.HCM và TP. Thủ Đức',
}

// Rong = cung origin (dev dung proxy Vite). Production: VITE_API_URL=https://api.ten-mien.vn
export const API_URL: string = import.meta.env.VITE_API_URL ?? ''
