import { useState, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Search, Printer, XCircle, Eye } from 'lucide-react'
import useStore from '../store/useStore'
import Modal from '../components/UI/Modal'
import ReceiptTemplate from '../components/Print/ReceiptTemplate'
import { formatCurrency, formatDateTime } from '../utils/format'

export default function Receipts() {
  const sales = useStore((s) => s.sales)
  const voidSale = useStore((s) => s.voidSale)
  const settings = useStore((s) => s.settings)
  const currency = settings.currency

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [viewSale, setViewSale] = useState(null)

  const receiptRef = useRef(null)
  const handlePrint = useReactToPrint({ content: () => receiptRef.current })

  const filtered = [...sales]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter((s) => {
      const matchSearch = !search || s.receiptNumber.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || (filter === 'voided' ? s.voided : !s.voided)
      return matchSearch && matchFilter
    })

  const totalRevenue = sales.filter((s) => !s.voided).reduce((a, s) => a + s.total, 0)

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Receipts', value: sales.filter((s) => !s.voided).length },
          { label: 'Voided', value: sales.filter((s) => s.voided).length },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue, currency) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold mb-1">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 max-w-sm">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search receipt number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
        {['all', 'active', 'voided'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt #</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-gray-400">No receipts found</td>
              </tr>
            ) : (
              filtered.map((sale) => (
                <tr key={sale.id} className={`hover:bg-gray-50 transition-colors ${sale.voided ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-mono font-medium">{sale.receiptNumber}</td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDateTime(sale.createdAt)}</td>
                  <td className="px-5 py-3.5 text-gray-600">{sale.items.reduce((a, i) => a + i.quantity, 0)} items</td>
                  <td className="px-5 py-3.5 text-green-600">{sale.discount > 0 ? `-${formatCurrency(sale.discount, currency)}` : '—'}</td>
                  <td className="px-5 py-3.5 font-semibold">{formatCurrency(sale.total, currency)}</td>
                  <td className="px-5 py-3.5 capitalize text-gray-600">{sale.paymentMethod}</td>
                  <td className="px-5 py-3.5">
                    {sale.voided ? (
                      <span className="text-xs bg-red-100 text-red-600 font-semibold px-2.5 py-1 rounded-full">Voided</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-600 font-semibold px-2.5 py-1 rounded-full">Completed</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setViewSale(sale) }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                        title="View & Print"
                      >
                        <Eye size={14} />
                      </button>
                      {!sale.voided && (
                        <button
                          onClick={() => { if (confirm('Void this sale? Stock will be restored.')) voidSale(sale.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                          title="Void sale"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      <Modal open={!!viewSale} onClose={() => setViewSale(null)} title="Receipt" width="max-w-sm">
        {viewSale && (
          <div>
            <div className="flex justify-center mb-4 overflow-auto">
              <ReceiptTemplate ref={receiptRef} sale={viewSale} settings={settings} />
            </div>
            <button
              onClick={handlePrint}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <Printer size={18} />
              Print Receipt
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
