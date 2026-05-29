import { useState } from 'react'
import { Plus, Trash2, ChevronRight, Package, CheckCircle } from 'lucide-react'
import useStore from '../store/useStore'
import Modal from '../components/UI/Modal'
import { formatCurrency, formatDate, STATUS_COLORS, STATUS_LABELS, calcProfit } from '../utils/format'

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']

const emptyOrderForm = {
  supplier: '',
  notes: '',
  expectedDate: '',
  items: [],
}

const emptyItem = { productId: '', size: '', quantity: 1, costPrice: '' }

export default function Wholesale() {
  const products = useStore((s) => s.products)
  const wholesaleOrders = useStore((s) => s.wholesaleOrders)
  const addWholesaleOrder = useStore((s) => s.addWholesaleOrder)
  const updateWholesaleOrderStatus = useStore((s) => s.updateWholesaleOrderStatus)
  const deleteWholesaleOrder = useStore((s) => s.deleteWholesaleOrder)
  const settings = useStore((s) => s.settings)
  const currency = settings.currency

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyOrderForm)
  const [detailOrder, setDetailOrder] = useState(null)
  const [filter, setFilter] = useState('all')

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }))

  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const updateItem = (i, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, idx) => {
        if (idx !== i) return item
        const updated = { ...item, [field]: value }
        // Auto-fill cost price from product
        if (field === 'productId') {
          const p = products.find((p) => p.id === value)
          if (p) updated.costPrice = p.costPrice || ''
        }
        return updated
      }),
    }))
  }

  const handleSave = () => {
    if (!form.supplier.trim()) return alert('Supplier name is required')
    if (form.items.length === 0) return alert('Add at least one item')
    const valid = form.items.every((i) => i.productId && i.size && i.quantity > 0 && i.costPrice)
    if (!valid) return alert('All items must have product, size, quantity, and cost price')

    const items = form.items.map((i) => {
      const product = products.find((p) => p.id === i.productId)
      return {
        ...i,
        productName: product?.name || '',
        quantity: parseInt(i.quantity),
        costPrice: parseFloat(i.costPrice),
      }
    })

    const totalCost = items.reduce((a, i) => a + i.costPrice * i.quantity, 0)

    addWholesaleOrder({ ...form, items, totalCost })
    setModalOpen(false)
    setForm(emptyOrderForm)
  }

  const nextStatus = { waiting: 'shipped', shipped: 'reached' }

  const filtered = filter === 'all' ? wholesaleOrders : wholesaleOrders.filter((o) => o.status === filter)
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const stats = {
    total: wholesaleOrders.length,
    waiting: wholesaleOrders.filter((o) => o.status === 'waiting').length,
    shipped: wholesaleOrders.filter((o) => o.status === 'shipped').length,
    reached: wholesaleOrders.filter((o) => o.status === 'reached').length,
    totalCost: wholesaleOrders.filter((o) => o.status === 'reached').reduce((a, o) => a + o.totalCost, 0),
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.total, color: 'bg-black' },
          { label: 'Waiting', value: stats.waiting, color: 'bg-amber-500' },
          { label: 'Shipped', value: stats.shipped, color: 'bg-blue-500' },
          { label: 'Reached', value: stats.reached, color: 'bg-green-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${s.color} rounded-full mb-3`} />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'waiting', 'shipped', 'reached'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === s ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {s === 'all' ? 'All Orders' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setForm(emptyOrderForm); setModalOpen(true) }}
          className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cost</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Package size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-400">No wholesale orders</p>
                </td>
              </tr>
            ) : (
              sorted.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <button onClick={() => setDetailOrder(order)} className="text-blue-600 hover:text-blue-800 font-medium">
                      #{order.id.slice(-6).toUpperCase()}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 font-medium">{order.supplier}</td>
                  <td className="px-5 py-3.5 text-gray-500">{order.items.length} items ({order.items.reduce((a, i) => a + i.quantity, 0)} pcs)</td>
                  <td className="px-5 py-3.5 font-semibold">{formatCurrency(order.totalCost, currency)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {nextStatus[order.status] && (
                        <button
                          onClick={() => {
                            const next = nextStatus[order.status]
                            const label = next === 'reached' ? '✅ Mark as Reached (will add stock to products)' : '📦 Mark as Shipped'
                            if (confirm(label + '?')) updateWholesaleOrderStatus(order.id, next)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                            nextStatus[order.status] === 'reached'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <CheckCircle size={12} />
                          {nextStatus[order.status] === 'reached' ? 'Mark Reached' : 'Mark Shipped'}
                        </button>
                      )}
                      {order.status === 'waiting' && (
                        <button
                          onClick={() => { if (confirm('Delete this order?')) deleteWholesaleOrder(order.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
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

      {/* Order Detail Modal */}
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={`Order #${detailOrder?.id.slice(-6).toUpperCase()}`} width="max-w-2xl">
        {detailOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Supplier:</span> <span className="font-medium ml-2">{detailOrder.supplier}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[detailOrder.status]}`}>{STATUS_LABELS[detailOrder.status]}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="ml-2">{formatDate(detailOrder.createdAt)}</span></div>
              <div><span className="text-gray-500">Total Cost:</span> <span className="font-semibold ml-2">{formatCurrency(detailOrder.totalCost, currency)}</span></div>
              {detailOrder.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="ml-2">{detailOrder.notes}</span></div>}
            </div>
            <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Size</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Cost/unit</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Subtotal</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Sell At</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {detailOrder.items.map((item, i) => {
                  const product = products.find((p) => p.id === item.productId)
                  const { profit, pct } = calcProfit(product?.sellPrice || 0, item.costPrice)
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                      <td className="px-4 py-2.5 text-center">{item.size}</td>
                      <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(item.costPrice, currency)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(item.costPrice * item.quantity, currency)}</td>
                      <td className="px-4 py-2.5 text-right text-blue-600">{product ? formatCurrency(product.sellPrice, currency) : '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        {product ? (
                          <span className={`text-xs font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatCurrency(profit, currency)} ({pct.toFixed(0)}%)
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* New Order Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Wholesale Order" width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Supplier / Source *</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                placeholder="Supplier name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Expected Date</label>
              <input
                type="date"
                value={form.expectedDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Items</label>
              <button onClick={addItem} className="text-xs bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-800">
                <Plus size={12} /> Add Item
              </button>
            </div>

            {form.items.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                Click "Add Item" to add products to this order
              </div>
            )}

            <div className="space-y-2">
              {form.items.map((item, i) => {
                const selectedProduct = products.find((p) => p.id === item.productId)
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-3">
                    <div className="col-span-4">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(i, 'productId', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-black bg-white"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={item.size}
                        onChange={(e) => updateItem(i, 'size', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-black bg-white"
                      >
                        <option value="">Size</option>
                        {(selectedProduct?.sizes || AVAILABLE_SIZES).map((sz) => <option key={sz}>{sz}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-black"
                        placeholder="Qty"
                        min={1}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={item.costPrice}
                        onChange={(e) => updateItem(i, 'costPrice', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-black"
                        placeholder={`Cost (${currency})`}
                        min={0}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {item.productId && item.costPrice && selectedProduct && (
                      <div className="col-span-12 text-xs text-green-600 px-1">
                        Profit: {formatCurrency(selectedProduct.sellPrice - parseFloat(item.costPrice), currency)} per unit
                        ({((selectedProduct.sellPrice - parseFloat(item.costPrice)) / parseFloat(item.costPrice) * 100).toFixed(0)}%)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {form.items.length > 0 && (
              <div className="mt-3 text-right font-semibold text-sm">
                Total Cost: {formatCurrency(form.items.reduce((a, i) => a + (parseFloat(i.costPrice) || 0) * (parseInt(i.quantity) || 0), 0), currency)}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800">Create Order</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
