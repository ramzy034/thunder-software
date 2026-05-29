import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export const formatCurrency = (amount, currency = 'MAD') => {
  const num = parseFloat(amount) || 0
  return `${num.toFixed(2)} ${currency}`
}

export const formatDate = (date) => {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy')
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

export const formatTime = (date) => {
  if (!date) return '—'
  return format(new Date(date), 'HH:mm')
}

export const getDateRange = (period) => {
  const now = new Date()
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    default:
      return { start: startOfDay(now), end: endOfDay(now) }
  }
}

export const isInRange = (date, start, end) => {
  const d = new Date(date)
  return d >= start && d <= end
}

export const calcProfit = (sellPrice, costPrice) => {
  const profit = sellPrice - costPrice
  const pct = costPrice > 0 ? (profit / costPrice) * 100 : 0
  return { profit, pct }
}

export const totalStock = (stockObj) =>
  Object.values(stockObj || {}).reduce((a, b) => a + b, 0)

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Staff / Wages',
  'Marketing',
  'Shipping',
  'Packaging',
  'Equipment',
  'Wholesale',
  'Other',
]

export const STATUS_COLORS = {
  waiting: 'bg-amber-100 text-amber-700',
  shipped: 'bg-blue-100 text-blue-700',
  reached: 'bg-green-100 text-green-700',
}

export const STATUS_LABELS = {
  waiting: 'Waiting for Shipping',
  shipped: 'Shipped',
  reached: 'Reached',
}
