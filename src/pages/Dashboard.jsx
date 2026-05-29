import { useMemo } from 'react'
import { Package, DollarSign, TrendingUp, ShoppingCart, TrendingDown, AlertTriangle, Users, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import useStore from '../store/useStore'
import StatCard from '../components/UI/StatCard'
import { formatCurrency, totalStock } from '../utils/format'

export default function Dashboard() {
  const products = useStore((s) => s.products)
  const sales = useStore((s) => s.sales)
  const expenses = useStore((s) => s.expenses)
  const settings = useStore((s) => s.settings)
  const currency = settings.currency

  const activeSales = useMemo(
    () => sales.filter((s) => s.status === 'confirmed' || (!s.status && !s.voided)),
    [sales]
  )

  // Today's stats
  const todayStart = startOfDay(new Date())
  const todayEnd = endOfDay(new Date())
  const todaySales = activeSales.filter((s) => new Date(s.createdAt) >= todayStart && new Date(s.createdAt) <= todayEnd)
  const todayRevenue = todaySales.reduce((a, s) => a + s.total, 0)
  const todayProfit = todaySales.reduce((a, s) => {
    const profit = s.items.reduce((ip, item) => ip + (item.unitPrice - (item.costPrice || 0)) * item.quantity, 0)
    return a + profit - (s.discount || 0)
  }, 0)

  // All-time
  const totalRevenue = activeSales.reduce((a, s) => a + s.total, 0)
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0)
  const totalCost = activeSales.reduce((a, s) => a + s.items.reduce((ip, i) => ip + (i.costPrice || 0) * i.quantity, 0), 0)
  const netProfit = totalRevenue - totalCost - totalExpenses

  // Low stock products
  const lowStock = products.filter((p) => totalStock(p.stock) < 5 && totalStock(p.stock) > 0)
  const outOfStock = products.filter((p) => totalStock(p.stock) === 0)

  // Last 7 days chart
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      const daySales = activeSales.filter(
        (s) => new Date(s.createdAt) >= dayStart && new Date(s.createdAt) <= dayEnd
      )
      return {
        day: format(date, 'EEE'),
        revenue: daySales.reduce((a, s) => a + s.total, 0),
        orders: daySales.length,
      }
    })
  }, [activeSales])

  // Recent sales
  const recentSales = [...activeSales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)

  // Top products
  const productSales = useMemo(() => {
    const map = {}
    activeSales.forEach((s) => {
      s.items.forEach((item) => {
        map[item.productName] = (map[item.productName] || 0) + item.quantity
      })
    })
    return Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [activeSales])

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Package} value={products.length} label="Total Products" />
        <StatCard icon={DollarSign} value={formatCurrency(totalRevenue, currency)} label="Total Revenue" />
        <StatCard icon={TrendingUp} value={formatCurrency(netProfit, currency)} label="Net Profit" />
        <StatCard icon={ShoppingCart} value={activeSales.length} label="Total Orders" />
      </div>

      {/* Today row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BarChart2} value={todaySales.length} label="Today's Orders" color="bg-blue-600" />
        <StatCard icon={DollarSign} value={formatCurrency(todayRevenue, currency)} label="Today's Revenue" color="bg-blue-600" />
        <StatCard icon={TrendingUp} value={formatCurrency(todayProfit, currency)} label="Today's Profit" color="bg-green-600" />
        <StatCard icon={TrendingDown} value={formatCurrency(totalExpenses, currency)} label="Total Expenses" color="bg-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Revenue — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => formatCurrency(v, currency)} />
              <Bar dataKey="revenue" fill="#111111" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Orders — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#111111" strokeWidth={2} dot={{ r: 4, fill: '#111' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent sales */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Recent Sales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No sales yet</td>
                  </tr>
                ) : (
                  recentSales.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium">{s.receiptNumber}</td>
                      <td className="px-6 py-3 text-gray-600">{s.items.reduce((a, i) => a + i.quantity, 0)}</td>
                      <td className="px-6 py-3 font-semibold">{formatCurrency(s.total, currency)}</td>
                      <td className="px-6 py-3 capitalize text-gray-600">{s.paymentMethod}</td>
                      <td className="px-6 py-3 text-gray-400">{format(new Date(s.createdAt), 'HH:mm')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & top products */}
        <div className="space-y-4">
          {/* Low stock */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="font-bold text-gray-900 text-sm">Stock Alerts</h3>
            </div>
            {outOfStock.length === 0 && lowStock.length === 0 ? (
              <p className="text-gray-400 text-sm">All products well stocked</p>
            ) : (
              <div className="space-y-2">
                {outOfStock.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate flex-1">{p.name}</span>
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-2">Out</span>
                  </div>
                ))}
                {lowStock.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate flex-1">{p.name}</span>
                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full ml-2">Low</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top products */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Top Selling Products</h3>
            {productSales.length === 0 ? (
              <p className="text-gray-400 text-sm">No sales data</p>
            ) : (
              <div className="space-y-2">
                {productSales.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate flex-1">{p.name}</span>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full ml-2">{p.qty} sold</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
