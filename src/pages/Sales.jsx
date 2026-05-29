import { useState, useMemo } from 'react'
import { Plus, Search, CheckCircle, XCircle, ShoppingBag, User, Phone, Calendar } from 'lucide-react'
import useStore from '../store/useStore'
import Modal from '../components/UI/Modal'
import { formatCurrency, formatDateTime } from '../utils/format'

const SOURCE_COLORS = {
  pos: 'bg-blue-100 text-blue-700',
  manual: 'bg-purple-100 text-purple-700',
  website: 'bg-orange-100 text-orange-700',
}
const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-600',
  rejected: 'bg-red-100 text-red-500',
}

const normalizeStatus = (s) => s.status || (s.voided ? 'rejected' : 'confirmed')

export default function Sales() {
  const sales = useStore((s) => s.sales)
  const products = useStore((s) => s.products)
  const settings = useStore((s) => s.settings)
  const confirmSale = useStore((s) => s.confirmSale)
  const rejectSale = useStore((s) => s.rejectSale)
  const addToast = useStore((s) => s.addToast)
  const addManualSale = useStore((s) => s.addManualSale)
  const currency = settings.currency

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  // Add sale form
  const [items, setItems] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [selProduct, setSelProduct] = useState(null)
  const [selSize, setSelSize] = useState('')
  const [qty, setQty] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [payMethod, setPayMethod] = useState('cash')
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')

  const normalized = useMemo(
    () => sales.map((s) => ({ ...s, _status: normalizeStatus(s) })),
    [sales]
  )

  const counts = useMemo(() => ({
    all: normalized.length,
    pending: normalized.filter((s) => s._status === 'pending').length,
    confirmed: normalized.filter((s) => s._status === 'confirmed').length,
    rejected: normalized.filter((s) => s._status === 'rejected').length,
  }), [normalized])

  const filtered = useMemo(() => {
    let list = tab === 'all' ? normalized : normalized.filter((s) => s._status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.receiptNumber?.toLowerCase().includes(q) ||
          s.customerName?.toLowerCase().includes(q) ||
          s.items?.some((i) => i.productName?.toLowerCase().includes(q))
      )
    }
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [normalized, tab, search])

  const matchedProducts = useMemo(() => {
    if (!productSearch.trim()) return []
    const q = productSearch.toLowerCase()
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
      .slice(0, 6)
  }, [productSearch, products])

  const subtotal = items.reduce((a, i) => a + i.unitPrice * i.quantity, 0)
  const discountAmt = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmt)

  const addItem = () => {
    if (!selProduct) return addToast('Select a product first', 'error')
    if (!selSize) return addToast('Select a size first', 'error')
    const stock = selProduct.stock?.[selSize] || 0
    if (qty < 1 || qty > stock) return addToast(`Only ${stock} in stock for size ${selSize}`, 'error')
    setItems((prev) => {
      const ex = prev.find((i) => i.productId === selProduct.id && i.size === selSize)
      if (ex) return prev.map((i) => i.productId === selProduct.id && i.size === selSize ? { ...i, quantity: i.quantity + qty } : i)
      return [...prev, { productId: selProduct.id, productName: selProduct.name, barcode: selProduct.barcode, size: selSize, quantity: qty, unitPrice: selProduct.sellPrice, costPrice: selProduct.costPrice || 0 }]
    })
    setSelProduct(null); setProductSearch(''); setSelSize(''); setQty(1)
  }

  const resetForm = () => {
    setItems([]); setCustomerName(''); setCustomerContact('')
    setSaleDate(new Date().toISOString().split('T')[0])
    setPayMethod('cash'); setDiscount(0); setNotes('')
  }

  const handleSubmit = () => {
    if (!items.length) return alert('Add at least one product')
    addManualSale({ items, subtotal, discount: discountAmt, total, paymentMethod: payMethod, customerName, customerContact, date: saleDate, notes })
    setShowAdd(false); resetForm()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sales</h2>
          <p className="text-sm text-gray-500">Confirm POS receipts · Add manual sales · Track website orders</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors">
          <Plus size={16} /> Add Sale
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[['all','All'],['pending','Pending'],['confirmed','Confirmed'],['rejected','Rejected']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l} <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${tab === k ? 'bg-gray-100' : 'bg-gray-200'}`}>{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Search size={15} className="text-gray-400" />
          <input type="text" placeholder="Search by receipt, customer, product..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none text-sm w-64" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Receipt','Date','Source','Customer','Items','Total','Status','Actions'].map((h) => (
                  <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center"><ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-400">No sales found</p></td></tr>
              ) : filtered.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{sale.receiptNumber || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-600 text-xs whitespace-nowrap">{formatDateTime(sale.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SOURCE_COLORS[sale.source] || SOURCE_COLORS.pos}`}>
                      {sale.source || 'POS'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {sale.customerName ? (
                      <div><div className="font-medium text-gray-900">{sale.customerName}</div>{sale.customerContact && <div className="text-xs text-gray-400">{sale.customerContact}</div>}</div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-gray-700">{sale.items?.length} item{sale.items?.length !== 1 ? 's' : ''}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[180px]">{sale.items?.map((i) => i.productName).join(', ')}</div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold">{formatCurrency(sale.total, currency)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[sale._status] || STATUS_STYLES.confirmed}`}>{sale._status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {sale._status === 'pending' && (
                        <>
                          <button onClick={() => confirmSale(sale.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                            <CheckCircle size={13} /> Confirm
                          </button>
                          <button onClick={() => { if (confirm('Reject this sale? Stock will be restored.')) rejectSale(sale.id) }} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sale Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm() }} title="Add Manual Sale" width="max-w-2xl">
        <div className="space-y-5">
          {/* Product search */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Add Product</label>
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search product..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black" />
                {matchedProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                    {matchedProducts.map((p) => (
                      <button key={p.id} onClick={() => { setSelProduct(p); setProductSearch(p.name); setSelSize('') }} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-gray-400 text-xs ml-2">{formatCurrency(p.sellPrice, currency)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selProduct && (
                <select value={selSize} onChange={(e) => setSelSize(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black bg-white">
                  <option value="">Size</option>
                  {Object.entries(selProduct.stock || {}).filter(([, q]) => q > 0).map(([sz]) => <option key={sz} value={sz}>{sz}</option>)}
                </select>
              )}
              <input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="w-16 border border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:border-black text-center" />
              <button onClick={addItem} disabled={!selProduct || !selSize} className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors">Add</button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Product','Size','Qty','Price','Total',''].map((h) => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                      <td className="px-4 py-2.5 text-gray-500">{item.size}</td>
                      <td className="px-4 py-2.5 text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-2.5">
                        <input type="number" value={item.unitPrice} onChange={(e) => setItems((prev) => prev.map((x, i) => i === idx ? { ...x, unitPrice: parseFloat(e.target.value) || 0 } : x))} className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-black" />
                      </td>
                      <td className="px-4 py-2.5 font-medium">{formatCurrency(item.unitPrice * item.quantity, currency)}</td>
                      <td className="px-4 py-2.5"><button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><XCircle size={14} /></button></td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="px-4 py-2.5 text-right text-gray-600">Subtotal</td>
                    <td className="px-4 py-2.5">{formatCurrency(subtotal, currency)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Customer Name (optional)</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
                <User size={14} className="text-gray-400" />
                <input type="text" placeholder="Customer name..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Contact / WhatsApp (optional)</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
                <Phone size={14} className="text-gray-400" />
                <input type="text" placeholder="+212..." value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sale Date</label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5">
                <Calendar size={14} className="text-gray-400" />
                <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black bg-white">
                {['cash','card','bank transfer','mixed'].map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Discount ({currency})</label>
              <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notes (optional)</label>
              <input type="text" placeholder="WhatsApp, private client..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black" />
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="text-lg font-bold">
                Total: <span className="text-black">{formatCurrency(total, currency)}</span>
                {discountAmt > 0 && <span className="text-sm text-green-600 ml-2">(−{formatCurrency(discountAmt, currency)})</span>}
              </div>
              <button onClick={handleSubmit} className="bg-black text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors">Save Sale</button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
