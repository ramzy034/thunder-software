import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Plus, Minus, Trash2, Printer, CheckCircle, XCircle,
  ScanLine, LayoutGrid, Eye, Package, Camera, Wifi,
} from 'lucide-react'
import useStore from '../store/useStore'
import Modal from '../components/UI/Modal'
import ReceiptTemplate from '../components/Print/ReceiptTemplate'
import CameraScanner from '../components/Scanner/CameraScanner'
import { formatCurrency, totalStock } from '../utils/format'
import { printElement } from '../utils/printUtils'
import { supabase, isConfigured } from '../lib/supabase'

const PAYMENT_METHODS = ['cash', 'card', 'bank transfer', 'mixed']

export default function POS() {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const settings = useStore((s) => s.settings)
  const createSale = useStore((s) => s.createSale)
  const addToast = useStore((s) => s.addToast)
  const currency = settings.currency
  const [clearConfirm, setClearConfirm] = useState(false)

  // ── Cart state ────────────────────────────────────────────────
  const [cart, setCart] = useState([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState('fixed')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')

  // ── Modal state ───────────────────────────────────────────────
  const [sizeModal, setSizeModal] = useState(null)
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerCategory, setPickerCategory] = useState('All')
  const [previewModal, setPreviewModal] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [receiptModal, setReceiptModal] = useState(false)
  const [autoPrint, setAutoPrint] = useState(false)

  const barcodeRef = useRef(null)
  const previewReceiptRef = useRef(null)
  const receiptRef = useRef(null)

  // ── Shared cart sync across devices ──────────────────────────
  const channelRef = useRef(null)
  const receivingRef = useRef(false)
  const mountedRef = useRef(false)   // skip broadcast on first render

  useEffect(() => {
    if (!isConfigured || !supabase) return

    const channel = supabase
      .channel('pos-shared-cart', { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'cart' }, ({ payload }) => {
        receivingRef.current = true
        setCart(payload.cart || [])
        setDiscount(payload.discount ?? 0)
        setDiscountType(payload.discountType || 'fixed')
        setPaymentMethod(payload.paymentMethod || 'cash')
      })
      .subscribe()

    channelRef.current = channel
    return () => { try { supabase.removeChannel(channel) } catch {} }
  }, [])

  // Broadcast cart to all other open POS terminals on any change.
  // Skip mount (mountedRef) and skip when the change came from a remote broadcast (receivingRef).
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (receivingRef.current) { receivingRef.current = false; return }
    if (!channelRef.current) return
    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cart',
        payload: { cart, discount, discountType, paymentMethod },
      })
    } catch {}
  }, [cart, discount, discountType, paymentMethod])

  // Always keep barcode input focused so hardware scanners work at any time
  useEffect(() => { barcodeRef.current?.focus() }, [])
  useEffect(() => {
    const noModalOpen = !sizeModal && !showCameraScanner && !showProductPicker && !previewModal && !receiptModal
    if (noModalOpen) {
      const refocus = (e) => {
        // Re-focus after clicking anywhere that isn't an input/select/button
        if (!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)) {
          barcodeRef.current?.focus()
        }
      }
      document.addEventListener('click', refocus)
      return () => document.removeEventListener('click', refocus)
    }
  }, [sizeModal, showCameraScanner, showProductPicker, previewModal, receiptModal])

  const handlePrint = () => printElement(receiptRef, `Receipt ${lastSale?.receiptNumber || ''}`)

  // Auto-print when receipt modal opens and autoPrint flag is set
  useEffect(() => {
    if (autoPrint && receiptModal) {
      const t = setTimeout(() => {
        printElement(receiptRef, `Receipt ${lastSale?.receiptNumber || ''}`)
        setAutoPrint(false)
      }, 500)
      return () => clearTimeout(t)
    }
  }, [autoPrint, receiptModal, lastSale])

  // ── Calculations ──────────────────────────────────────────────
  const subtotal = cart.reduce((a, i) => a + i.unitPrice * i.quantity, 0)
  const discountAmount = discountType === 'percent' ? (subtotal * discount) / 100 : parseFloat(discount) || 0
  const taxRate = settings.taxRate || 0
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100
  const total = Math.max(0, subtotal - discountAmount + taxAmount)
  const change = paymentMethod === 'cash' ? Math.max(0, (parseFloat(amountPaid) || 0) - total) : 0

  // Build a preview sale object from current cart (not saved)
  const previewSaleData = useMemo(() => ({
    receiptNumber: 'PREVIEW',
    createdAt: new Date().toISOString(),
    items: cart,
    subtotal,
    discount: discountAmount,
    taxAmount,
    total,
    paymentMethod,
    amountPaid: parseFloat(amountPaid) || total,
    change,
  }), [cart, subtotal, discountAmount, taxAmount, total, paymentMethod, amountPaid, change])

  // ── Barcode scanner ───────────────────────────────────────────
  const lookupBarcode = useCallback((code) => {
    const trimmed = code.trim()
    const product = products.find((p) => p.barcode === trimmed)
    if (product) {
      // Always show size modal — lets user see stock per size + total before adding
      setSizeModal({ product })
    } else {
      addToast(`No product found for barcode: ${trimmed}`, 'error')
    }
    setBarcodeInput('')
  }, [products, addToast])

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) lookupBarcode(barcodeInput)
  }

  // ── Product search (header bar) ───────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowSearch(false); return }
    const q = searchQuery.toLowerCase()
    setSearchResults(products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q)
    ))
    setShowSearch(true)
  }, [searchQuery, products])

  // ── Product picker grid ───────────────────────────────────────
  const pickerProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase())
      const matchCat = pickerCategory === 'All' || p.category === pickerCategory
      return matchSearch && matchCat
    })
  }, [products, pickerSearch, pickerCategory])

  // ── Cart helpers ──────────────────────────────────────────────
  const addToCart = (product, size) => {
    const maxStock = product.stock?.[size] || 0
    // Check stock OUTSIDE setCart — never call side effects inside a state updater
    const existing = cart.find((i) => i.productId === product.id && i.size === size)
    if (existing && existing.quantity >= maxStock) {
      addToast(`Only ${maxStock} in stock for size ${size}`, 'error')
      return
    }
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === product.id && i.size === size)
      if (ex) {
        if (ex.quantity >= maxStock) return prev
        return prev.map((i) => i.productId === product.id && i.size === size ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        size,
        quantity: 1,
        unitPrice: product.sellPrice,
        costPrice: product.costPrice || 0,
      }]
    })
    setSizeModal(null)
    setShowProductPicker(false)
    setSearchQuery('')
    setShowSearch(false)
    barcodeRef.current?.focus()
  }

  const handlePickProduct = (product) => {
    const sizesWithStock = Object.entries(product.stock || {}).filter(([, q]) => q > 0)
    if (sizesWithStock.length === 0) { addToast(`${product.name} is out of stock`, 'error'); return }
    if (sizesWithStock.length === 1) addToCart(product, sizesWithStock[0][0])
    else setSizeModal({ product })
  }

  const updateQty = (productId, size, delta) =>
    setCart((prev) => prev.map((i) => i.productId === productId && i.size === size ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0))

  const removeFromCart = (productId, size) =>
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.size === size)))

  const updatePrice = (productId, size, newPrice) =>
    setCart((prev) => prev.map((i) => i.productId === productId && i.size === size ? { ...i, unitPrice: parseFloat(newPrice) || 0 } : i))

  const clearCart = () => {
    if (cart.length === 0) return
    if (clearConfirm) {
      setCart([]); setDiscount(0); setAmountPaid(''); setClearConfirm(false)
    } else {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 3000)
    }
  }

  // ── Complete sale ─────────────────────────────────────────────
  const openPreview = () => {
    if (cart.length === 0) { addToast('Cart is empty', 'error'); return }
    if (paymentMethod === 'cash' && parseFloat(amountPaid) > 0 && parseFloat(amountPaid) < total) {
      addToast('Amount paid is less than the total', 'error'); return
    }
    setPreviewModal(true)
  }

  const confirmSale = (andPrint = false) => {
    const sale = createSale({
      items: cart,
      subtotal,
      discount: discountAmount,
      taxAmount,
      total,
      paymentMethod,
      amountPaid: parseFloat(amountPaid) || total,
      change,
    })
    setLastSale(sale)
    setCart([]); setDiscount(0); setAmountPaid('')
    setPreviewModal(false)
    if (andPrint) {
      setReceiptModal(true)
      setAutoPrint(true)
    } else {
      addToast(`Sale ${sale.receiptNumber} saved`)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-88px)]">
      {/* ── Left: Scanner + Search + Cart ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-y-auto">

        {/* Barcode Scanner */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex gap-3">
            <div className="flex items-center gap-2 flex-1 bg-gray-50 rounded-xl px-4 py-3">
              <ScanLine size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={barcodeRef}
                type="text"
                placeholder="Scan or type barcode — Enter"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <button
              onClick={() => setShowCameraScanner(true)}
              title="Scan with camera"
              className="border border-gray-200 text-gray-600 px-4 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex-shrink-0 flex items-center gap-2"
            >
              <Camera size={16} />
            </button>
            <button
              onClick={() => barcodeInput.trim() && lookupBarcode(barcodeInput)}
              className="bg-black text-white px-5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        {/* Search + Browse button */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search by name, SKU or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              {showSearch && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePickProduct(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.image
                          ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                          : <Package size={14} className="m-auto mt-2 text-gray-300" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500">Stock: {totalStock(p.stock)}</div>
                      </div>
                      <div className="font-semibold text-sm flex-shrink-0">{formatCurrency(p.sellPrice, currency)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Browse Products button */}
            <button
              onClick={() => { setShowProductPicker(true); setPickerSearch(''); setPickerCategory('All') }}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              <LayoutGrid size={16} />
              Browse
            </button>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">
              Cart{cart.length > 0 && <span className="ml-2 bg-black text-white text-xs px-2 py-0.5 rounded-full">{cart.reduce((a, i) => a + i.quantity, 0)}</span>}
                {isConfigured && <span className="ml-2 flex items-center gap-1 text-xs text-green-600 font-normal" title="Cart is shared across all open POS terminals"><Wifi size={11} />Shared</span>}
            </h3>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className={`text-sm flex items-center gap-1 transition-colors ${clearConfirm ? 'text-red-600 font-semibold' : 'text-red-400 hover:text-red-600'}`}
              >
                <XCircle size={14} /> {clearConfirm ? 'Tap again to clear' : 'Clear'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <ScanLine size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Scan a barcode or browse products</p>
              </div>
            ) : (
              cart.map((item) => {
                const product = products.find((p) => p.id === item.productId)
                return (
                  <div key={`${item.productId}-${item.size}`} className="flex items-center gap-3 px-5 py-3">
                    {/* Product thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {product?.image
                        ? <img src={product.image} alt={item.productName} className="w-full h-full object-cover" />
                        : <Package size={14} className="m-auto mt-3 text-gray-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{item.productName}</div>
                      <div className="text-xs text-gray-500">Size: {item.size}</div>
                    </div>
                    {/* Editable price */}
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updatePrice(item.productId, item.size, e.target.value)}
                      className="w-20 text-sm text-center border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-black"
                      min={0}
                    />
                    {/* Qty controls */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.productId, item.size, -1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.size, 1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="w-24 text-right font-semibold text-sm">
                      {formatCurrency(item.unitPrice * item.quantity, currency)}
                    </div>
                    <button onClick={() => removeFromCart(item.productId, item.size)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Payment Panel ── */}
      <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 flex-1">
          <h3 className="font-bold text-gray-900">Payment</h3>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(subtotal, currency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>-{formatCurrency(discountAmount, currency)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({taxRate}%)</span><span>{formatCurrency(taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2 mt-2">
              <span>Total</span><span>{formatCurrency(total, currency)}</span>
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Discount</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
                min={0}
                placeholder="0"
              />
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none bg-white"
              >
                <option value="fixed">{currency}</option>
                <option value="percent">%</option>
              </select>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-xl text-sm font-medium capitalize transition-colors ${paymentMethod === m ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Cash received */}
          {paymentMethod === 'cash' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Amount Received</label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
                placeholder={total.toFixed(2)}
                min={0}
              />
              {parseFloat(amountPaid) >= total && total > 0 && (
                <div className="mt-1.5 text-sm font-semibold text-green-600">
                  Change: {formatCurrency(change, currency)}
                </div>
              )}
            </div>
          )}

          <div className="mt-auto space-y-2">
            {/* Preview button */}
            {cart.length > 0 && (
              <button
                onClick={() => setPreviewModal(true)}
                className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 text-sm transition-colors"
              >
                <Eye size={15} />
                Preview Receipt
              </button>
            )}
            {/* Complete Sale */}
            <button
              onClick={openPreview}
              disabled={cart.length === 0}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle size={18} />
              Complete Sale
            </button>
            {/* Reprint last */}
            {lastSale && (
              <button
                onClick={() => setReceiptModal(true)}
                className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 text-sm transition-colors"
              >
                <Printer size={15} />
                Reprint Last Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Size Selection Modal ── */}
      <Modal open={!!sizeModal} onClose={() => setSizeModal(null)} title="Stock & Size">
        {sizeModal && (() => {
          const p = sizeModal.product
          const stockEntries = Object.entries(p.stock || {})
          const total = stockEntries.reduce((a, [, q]) => a + q, 0)
          const cartQty = cart
            .filter((i) => i.productId === p.id)
            .reduce((a, i) => a + i.quantity, 0)
          return (
            <div>
              {/* Product info */}
              <div className="flex items-center gap-3 mb-4">
                {p.image && <img src={p.image} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt={p.name} />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(p.sellPrice, currency)}</p>
                </div>
                {/* Total stock badge */}
                <div className="text-center flex-shrink-0">
                  <div className={`text-2xl font-bold ${total === 0 ? 'text-red-500' : total < 5 ? 'text-amber-500' : 'text-green-600'}`}>
                    {total}
                  </div>
                  <div className="text-xs text-gray-400">total</div>
                </div>
              </div>

              {/* Already in cart indicator */}
              {cartQty > 0 && (
                <div className="mb-3 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">
                  {cartQty} already in cart
                </div>
              )}

              {/* Out of stock message */}
              {total === 0 && (
                <div className="mb-3 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl font-medium">
                  All sizes are out of stock
                </div>
              )}

              {/* Size grid */}
              <div className="grid grid-cols-3 gap-2.5">
                {stockEntries.map(([sz, qty]) => (
                  <button
                    key={sz}
                    onClick={() => qty > 0 && addToCart(p, sz)}
                    disabled={qty === 0}
                    className={`py-3 px-2 rounded-xl font-semibold transition-all text-center ${
                      qty === 0
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                        : 'bg-black text-white hover:bg-gray-800 active:scale-95'
                    }`}
                  >
                    <span className="block text-sm">{sz}</span>
                    <span className={`block text-xs font-normal mt-0.5 ${qty === 0 ? 'text-gray-300' : 'text-white/70'}`}>
                      {qty === 0 ? 'out' : `${qty} left`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── Product Picker Modal ── */}
      <Modal
        open={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title="Browse Products"
        width="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Search & Category filter */}
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
              <Search size={15} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search products..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="bg-transparent outline-none text-sm flex-1"
                autoFocus
              />
            </div>
            <select
              value={pickerCategory}
              onChange={(e) => setPickerCategory(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-black"
            >
              <option>All</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {pickerProducts.length === 0 ? (
              <div className="col-span-4 py-16 text-center text-gray-400">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p>No products found</p>
              </div>
            ) : (
              pickerProducts.map((p) => {
                const stock = totalStock(p.stock)
                const outOfStock = stock === 0
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePickProduct(p)}
                    disabled={outOfStock}
                    className={`group relative flex flex-col bg-white border-2 rounded-2xl overflow-hidden text-left transition-all ${
                      outOfStock
                        ? 'border-gray-100 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-black hover:shadow-md cursor-pointer'
                    }`}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={28} className="text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 flex-1 flex flex-col gap-1">
                      <div className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{p.name}</div>
                      <div className="text-sm font-bold text-gray-900 mt-auto">{formatCurrency(p.sellPrice, currency)}</div>
                      {p.category && (
                        <div className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full self-start truncate max-w-full">{p.category}</div>
                      )}
                      <div className={`text-xs font-medium self-start px-2 py-0.5 rounded-full ${
                        outOfStock ? 'bg-red-100 text-red-600' : stock < 5 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {outOfStock ? 'Out of stock' : `${stock} in stock`}
                      </div>
                    </div>

                    {/* Hover add badge */}
                    {!outOfStock && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Plus size={16} className="text-white" />
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">{pickerProducts.length} product{pickerProducts.length !== 1 ? 's' : ''} shown</p>
        </div>
      </Modal>

      {/* ── Receipt Preview Modal (before confirming) ── */}
      <Modal open={previewModal} onClose={() => setPreviewModal(false)} title="Receipt Preview" width="max-w-2xl">
        <div className="flex gap-6">
          {/* Receipt */}
          <div className="flex-shrink-0">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <ReceiptTemplate ref={previewReceiptRef} sale={previewSaleData} settings={settings} />
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Receipt preview</p>
          </div>

          {/* Summary + actions */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900">Sale Summary</h4>

              <div className="space-y-2 text-sm bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between"><span className="text-gray-500">Items</span><span className="font-medium">{cart.reduce((a, i) => a + i.quantity, 0)} pcs</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discountAmount, currency)}</span></div>}
                {taxAmount > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatCurrency(taxAmount, currency)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-1">
                  <span>Total</span><span>{formatCurrency(total, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-500 capitalize"><span>Payment</span><span>{paymentMethod}</span></div>
                {paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between"><span className="text-gray-500">Received</span><span>{formatCurrency(parseFloat(amountPaid) || total, currency)}</span></div>
                    <div className="flex justify-between text-green-600 font-medium"><span>Change</span><span>{formatCurrency(change, currency)}</span></div>
                  </>
                )}
              </div>

              {/* Item list */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-700 truncate flex-1">{item.productName} <span className="text-gray-400">({item.size})</span></span>
                    <span className="ml-2 font-medium flex-shrink-0">{item.quantity} × {formatCurrency(item.unitPrice, currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <button
                onClick={() => confirmSale(true)}
                className="w-full bg-black text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
              >
                <Printer size={16} />
                Confirm & Print
              </button>
              <button
                onClick={() => confirmSale(false)}
                className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 text-sm transition-colors"
              >
                <CheckCircle size={15} />
                Confirm (No Print)
              </button>
              <button
                onClick={() => setPreviewModal(false)}
                className="w-full text-gray-400 py-2 text-sm hover:text-gray-600 transition-colors"
              >
                ← Back to Edit
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Camera Barcode Scanner ── */}
      {showCameraScanner && (
        <CameraScanner
          onScan={(code) => {
            try {
              setShowCameraScanner(false)
              lookupBarcode(code)
            } catch (err) {
              addToast('Scan error — try again', 'error')
              console.error('[POS scan]', err)
            }
          }}
          onClose={() => setShowCameraScanner(false)}
        />
      )}

      {/* ── Post-Sale Receipt Modal ── */}
      <Modal open={receiptModal} onClose={() => setReceiptModal(false)} title="Print Receipt" width="max-w-sm">
        {lastSale && (
          <div>
            <div className="flex justify-center mb-4 bg-gray-50 rounded-xl p-4">
              <ReceiptTemplate ref={receiptRef} sale={lastSale} settings={settings} />
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
