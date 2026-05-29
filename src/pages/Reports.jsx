import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { format, subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import useStore from '../store/useStore'
import { formatCurrency } from '../utils/format'

const COLORS = ['#111', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f59e0b', '#ef4444', '#3b82f6']

const PERIODS = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
]

export default function Reports() {
  const sales = useStore((s) => s.sales)
  const expenses = useStore((s) => s.expenses)
  const settings = useStore((s) => s.settings)
  const currency = settings.currency

  const [period, setPeriod] = useState('30d')

  const { start, end } = useMemo(() => {
    const now = new Date()
    switch (period) {
      case '7d': return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
      case '30d': return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
      case '3m': return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) }
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) }
      default: return { start: new Date(0), end: endOfDay(now) }
    }
  }, [period])

  const filteredSales = useMemo(
    () => sales.filter((s) => !s.voided && new Date(s.createdAt) >= start && new Date(s.createdAt) <= end),
    [sales, start, end]
  )

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => new Date(e.date) >= start && new Date(e.date) <= end),
    [expenses, start, end]
  )

  // Totals
  const totalRevenue = filteredSales.reduce((a, s) => a + s.total, 0)
  const totalCost = filteredSales.reduce((a, s) => a + s.items.reduce((ip, i) => ip + (i.costPrice || 0) * i.quantity, 0), 0)
  const totalDiscount = filteredSales.reduce((a, s) => a + (s.discount || 0), 0)
  const grossProfit = totalRevenue - totalCost
  const totalExpenseAmt = filteredExpenses.reduce((a, e) => a + e.amount, 0)
  const netProfit = grossProfit - totalExpenseAmt
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  // Daily chart
  const dailyData = useMemo(() => {
    if (period === 'all') {
      // Group by month
      const months = {}
      filteredSales.forEach((s) => {
        const m = format(new Date(s.createdAt), 'MMM yy')
        months[m] = (months[m] || 0) + s.total
      })
      return Object.entries(months).map(([day, revenue]) => ({ day, revenue }))
    }
    const days = eachDayOfInterval({ start, end })
    return days.map((date) => {
      const daySales = filteredSales.filter(
        (s) => new Date(s.createdAt) >= startOfDay(date) && new Date(s.createdAt) <= endOfDay(date)
      )
      return {
        day: format(date, period === '3m' ? 'MMM d' : 'MMM d'),
        revenue: daySales.reduce((a, s) => a + s.total, 0),
        profit: daySales.reduce((a, s) => a + s.items.reduce((ip, i) => ip + (i.unitPrice - (i.costPrice || 0)) * i.quantity, 0) - (s.discount || 0), 0),
        orders: daySales.length,
      }
    })
  }, [filteredSales, start, end, period])

  // Top products
  const topProducts = useMemo(() => {
    const map = {}
    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.productName]) map[item.productName] = { name: item.productName, qty: 0, revenue: 0 }
        map[item.productName].qty += item.quantity
        map[item.productName].revenue += item.unitPrice * item.quantity
      })
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8)
  }, [filteredSales])

  // Payment methods
  const paymentBreakdown = useMemo(() => {
    const map = {}
    filteredSales.forEach((s) => { map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.total })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [filteredSales])

  // Expense categories
  const expenseByCat = useMemo(() => {
    const map = {}
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filteredExpenses])

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${period === p.value ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* P&L Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Profit & Loss Summary</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'Revenue', value: totalRevenue, color: 'text-blue-600', sub: `${filteredSales.length} orders` },
            { label: 'Cost of Goods', value: totalCost, color: 'text-gray-600', sub: `Discounts: ${formatCurrency(totalDiscount, currency)}` },
            { label: 'Gross Profit', value: grossProfit, color: grossProfit >= 0 ? 'text-green-600' : 'text-red-500', sub: `Margin: ${margin.toFixed(1)}%` },
            { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'text-green-600' : 'text-red-500', sub: `After ${formatCurrency(totalExpenseAmt, currency)} expenses` },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-sm text-gray-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{formatCurrency(s.value, currency)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue & Profit Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Revenue & Profit Over Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData.slice(-30)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatCurrency(v, currency)} />
            <Bar dataKey="revenue" fill="#111111" radius={[3, 3, 0, 0]} name="Revenue" />
            <Bar dataKey="profit" fill="#22c55e" radius={[3, 3, 0, 0]} name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Top Products by Revenue</h3>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">No sales data</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 text-xs text-gray-400 font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <span className="text-sm font-semibold ml-2">{formatCurrency(p.revenue, currency)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-black h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (p.revenue / topProducts[0].revenue) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.qty} units sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment & Expense breakdown */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Payment Methods</h3>
            {paymentBreakdown.length === 0 ? (
              <p className="text-gray-400 text-sm">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={paymentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}>
                    {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3">Top Expense Categories</h3>
            {expenseByCat.length === 0 ? (
              <p className="text-gray-400 text-sm">No expenses in this period</p>
            ) : (
              <div className="space-y-2">
                {expenseByCat.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{e.name}</span>
                    <span className="font-semibold text-red-600">{formatCurrency(e.value, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Daily Orders</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={dailyData.slice(-30)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="orders" stroke="#111111" strokeWidth={2} dot={false} name="Orders" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
