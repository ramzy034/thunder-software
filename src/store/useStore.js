import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase, isConfigured } from '../lib/supabase'

const generateReceiptNumber = (counter) => `RCP-${String(counter).padStart(5, '0')}`

const generateBarcode = () => {
  let num = ''
  for (let i = 0; i < 12; i++) num += Math.floor(Math.random() * 10)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += parseInt(num[i]) * (i % 2 === 0 ? 1 : 3)
  return num + ((10 - (sum % 10)) % 10)
}

const generateSKU = () => `PR${String(Math.floor(Math.random() * 9000) + 1000)}`

const DEFAULT_SETTINGS = {
  storeName: 'Thunder Store',
  storeAddress: '',
  storePhone: '',
  storeEmail: '',
  currency: 'MAD',
  taxRate: 0,
  receiptHeader: 'Thank you for your purchase!',
  receiptFooter: 'No exchange without receipt.',
  websiteUrl: '',
  apiKey: '',
  labelSize: 'medium',
}

const DEFAULT_CATEGORIES = [
  'Shirts and Tops',
  'Sweatshirts and Zippers',
  'Pants',
  'Shorts',
  'Jackets',
  'Accessories',
]

// Fire-and-forget Supabase write — shows a toast on failure
const syncDB = (fn) => {
  if (!isConfigured || !supabase) return
  fn().catch((err) => {
    console.error('[POS Sync]', err)
    try { useStore.getState().addToast('Sync error — data may not have saved. Check your connection.', 'error') } catch {}
  })
}

const useStore = create((set, get) => ({
  // ─── Data ────────────────────────────────────────────
  products: [],
  sales: [],
  expenses: [],
  wholesaleOrders: [],
  cashSessions: [],
  currentCashSession: null,
  categories: DEFAULT_CATEGORIES,
  settings: { ...DEFAULT_SETTINGS },
  receiptCounter: 1,

  // ─── Status ──────────────────────────────────────────
  loading: true,
  syncError: null,

  // ─── Toasts ──────────────────────────────────────────
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Date.now() + Math.random()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3500)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ─── Initialization ──────────────────────────────────
  init: async () => {
    if (!isConfigured || !supabase) {
      set({ loading: false })
      return
    }

    try {
      await get()._fetchAll()
      get()._subscribe()
      get()._startPolling()
    } catch (err) {
      console.error('[POS Init]', err)
      set({ loading: false, syncError: err.message })
    }
  },

  // Fetch all data from Supabase and update state
  _fetchAll: async () => {
    const [pRes, sRes, eRes, wRes, cRes, stRes] = await Promise.all([
      supabase.from('products').select('id, data').order('created_at', { ascending: false }),
      supabase.from('sales').select('id, data').order('created_at', { ascending: false }),
      supabase.from('expenses').select('id, data').order('created_at', { ascending: false }),
      supabase.from('wholesale_orders').select('id, data').order('created_at', { ascending: false }),
      supabase.from('cash_sessions').select('id, data').order('created_at', { ascending: false }),
      supabase.from('app_state').select('state').eq('id', 1).maybeSingle(),
    ])

    const st = stRes.data?.state || {}

    set({
      products: (pRes.data || []).map((r) => r.data),
      sales: (sRes.data || []).map((r) => r.data),
      expenses: (eRes.data || []).map((r) => r.data),
      wholesaleOrders: (wRes.data || []).map((r) => r.data),
      cashSessions: (cRes.data || []).map((r) => r.data),
      currentCashSession: st.currentCashSession ?? null,
      categories: st.categories || DEFAULT_CATEGORIES,
      settings: { ...DEFAULT_SETTINGS, ...(st.settings || {}) },
      receiptCounter: st.receiptCounter || 1,
      loading: false,
      syncError: null,
    })
  },

  // Manual refresh — pull latest from Supabase right now
  refresh: async () => {
    if (!isConfigured || !supabase) return
    try {
      await get()._fetchAll()
    } catch (err) {
      console.error('[POS Refresh]', err)
    }
  },

  // Poll every 30s + refresh on page visibility as real-time fallback
  _startPolling: () => {
    // Periodic poll every 30 seconds
    const interval = setInterval(() => {
      if (!document.hidden) get().refresh()
    }, 30000)

    // Instant refresh when switching back to the tab/app
    const onVisible = () => {
      if (!document.hidden) get().refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    // Store cleanup handles so they can be removed if needed
    window._posCleanup = () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  },

  _subscribe: () => {
    // Real-time subscriptions — wrapped in try-catch to handle failures gracefully
    try {
      supabase
        .channel('pos-products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          set((s) => {
            if (payload.eventType === 'INSERT') {
              if (s.products.some((p) => p.id === payload.new.id)) return s
              return { products: [payload.new.data, ...s.products] }
            }
            if (payload.eventType === 'UPDATE') {
              return { products: s.products.map((p) => (p.id === payload.new.id ? payload.new.data : p)) }
            }
            if (payload.eventType === 'DELETE') {
              return { products: s.products.filter((p) => p.id !== payload.old.id) }
            }
            return s
          })
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') console.log('[POS] Real-time subscribed: products')
          else if (status === 'CHANNEL_ERROR') console.warn('[POS] Real-time error: products')
        })
    } catch (err) {
      console.warn('[POS] Real-time setup failed (app will still work, just no live sync):', err.message)
    }

    try {
      supabase
        .channel('pos-sales')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
          set((s) => {
            if (payload.eventType === 'INSERT') {
              if (s.sales.some((x) => x.id === payload.new.id)) return s
              return { sales: [payload.new.data, ...s.sales] }
            }
            if (payload.eventType === 'UPDATE') {
              return { sales: s.sales.map((x) => (x.id === payload.new.id ? payload.new.data : x)) }
            }
            return s
          })
        })
        .subscribe()
    } catch (err) {
      console.warn('[POS] Real-time setup failed: sales', err.message)
    }

    try {
      supabase
        .channel('pos-expenses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
          set((s) => {
            if (payload.eventType === 'INSERT') {
              if (s.expenses.some((e) => e.id === payload.new.id)) return s
              return { expenses: [payload.new.data, ...s.expenses] }
            }
            if (payload.eventType === 'UPDATE') {
              return { expenses: s.expenses.map((e) => (e.id === payload.new.id ? payload.new.data : e)) }
            }
            if (payload.eventType === 'DELETE') {
              return { expenses: s.expenses.filter((e) => e.id !== payload.old.id) }
            }
            return s
          })
        })
        .subscribe()
    } catch (err) {
      console.warn('[POS] Real-time setup failed: expenses', err.message)
    }

    try {
      supabase
        .channel('pos-wholesale')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wholesale_orders' }, (payload) => {
          set((s) => {
            if (payload.eventType === 'INSERT') {
              if (s.wholesaleOrders.some((o) => o.id === payload.new.id)) return s
              return { wholesaleOrders: [payload.new.data, ...s.wholesaleOrders] }
            }
            if (payload.eventType === 'UPDATE') {
              return {
                wholesaleOrders: s.wholesaleOrders.map((o) =>
                  o.id === payload.new.id ? payload.new.data : o
                ),
              }
            }
            if (payload.eventType === 'DELETE') {
              return { wholesaleOrders: s.wholesaleOrders.filter((o) => o.id !== payload.old.id) }
            }
            return s
          })
        })
        .subscribe()
    } catch (err) {
      console.warn('[POS] Real-time setup failed: wholesale', err.message)
    }

    try {
      supabase
        .channel('pos-cash')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions' }, (payload) => {
          set((s) => {
            if (payload.eventType === 'INSERT') {
              if (s.cashSessions.some((x) => x.id === payload.new.id)) return s
              return { cashSessions: [payload.new.data, ...s.cashSessions] }
            }
            if (payload.eventType === 'UPDATE') {
              return {
                cashSessions: s.cashSessions.map((x) =>
                  x.id === payload.new.id ? payload.new.data : x
                ),
              }
            }
            return s
          })
        })
        .subscribe()
    } catch (err) {
      console.warn('[POS] Real-time setup failed: cash sessions', err.message)
    }

    try {
      supabase
        .channel('pos-state')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state' }, (payload) => {
          const st = payload.new?.state
          if (!st) return
          set((s) => ({
            categories: st.categories || s.categories,
            settings: st.settings ? { ...DEFAULT_SETTINGS, ...st.settings } : s.settings,
            receiptCounter: st.receiptCounter ?? s.receiptCounter,
            currentCashSession: st.currentCashSession !== undefined ? st.currentCashSession : s.currentCashSession,
          }))
        })
        .subscribe()
    } catch (err) {
      console.warn('[POS] Real-time setup failed: app state', err.message)
    }
  },

  _saveAppState: () => {
    const s = get()
    const state = {
      settings: s.settings,
      categories: s.categories,
      receiptCounter: s.receiptCounter,
      currentCashSession: s.currentCashSession,
    }
    syncDB(() => supabase.from('app_state').upsert({ id: 1, state }))
  },

  // ─── Products ────────────────────────────────────────
  addProduct: (product) => {
    const newProduct = {
      id: uuidv4(),
      sku: generateSKU(),
      barcode: product.barcode || generateBarcode(),
      stock: (product.sizes || []).reduce((a, sz) => ({ ...a, [sz]: 0 }), {}),
      costPrice: 0,
      createdAt: new Date().toISOString(),
      ...product,
    }
    set((s) => ({ products: [newProduct, ...s.products] }))
    syncDB(() =>
      supabase.from('products').insert({ id: newProduct.id, data: newProduct, created_at: newProduct.createdAt })
    )
    get().addToast(`"${newProduct.name}" added`)
  },

  updateProduct: (id, updates) => {
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))
    const updated = get().products.find((p) => p.id === id)
    if (updated) syncDB(() => supabase.from('products').update({ data: updated }).eq('id', id))
    get().addToast('Product saved')
  },

  deleteProduct: (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
    syncDB(() => supabase.from('products').delete().eq('id', id))
    get().addToast('Product deleted')
  },

  bulkUpdateProducts: (ids, updates) => {
    set((s) => ({
      products: s.products.map((p) => (ids.includes(p.id) ? { ...p, ...updates } : p)),
    }))
    const affected = get().products.filter((p) => ids.includes(p.id))
    affected.forEach((p) => syncDB(() => supabase.from('products').update({ data: p }).eq('id', p.id)))
    get().addToast(`${ids.length} product${ids.length !== 1 ? 's' : ''} updated`)
  },

  bulkDeleteProducts: (ids) => {
    set((s) => ({ products: s.products.filter((p) => !ids.includes(p.id)) }))
    ids.forEach((id) => syncDB(() => supabase.from('products').delete().eq('id', id)))
    get().addToast(`${ids.length} product${ids.length !== 1 ? 's' : ''} deleted`)
  },

  // ─── Categories ──────────────────────────────────────
  addCategory: (cat) => {
    set((s) => ({ categories: [...s.categories, cat] }))
    get()._saveAppState()
  },

  // ─── Wholesale Orders ─────────────────────────────────
  addWholesaleOrder: (order) => {
    const newOrder = {
      id: uuidv4(),
      status: 'waiting',
      createdAt: new Date().toISOString(),
      ...order,
    }
    set((s) => ({ wholesaleOrders: [newOrder, ...s.wholesaleOrders] }))
    syncDB(() =>
      supabase
        .from('wholesale_orders')
        .insert({ id: newOrder.id, data: newOrder, created_at: newOrder.createdAt })
    )
    get().addToast('Wholesale order added')
  },

  updateWholesaleOrderStatus: (id, status) => {
    const s = get()
    const order = s.wholesaleOrders.find((o) => o.id === id)
    if (!order) return

    let products = s.products

    if (status === 'reached' && order.status !== 'reached') {
      products = s.products.map((product) => {
        const items = order.items.filter((i) => i.productId === product.id)
        if (!items.length) return product
        const newStock = { ...product.stock }
        let latestCost = product.costPrice
        items.forEach((item) => {
          newStock[item.size] = (newStock[item.size] || 0) + item.quantity
          latestCost = item.costPrice
        })
        return { ...product, stock: newStock, costPrice: latestCost }
      })
    }

    const updatedOrder = { ...order, status, updatedAt: new Date().toISOString() }

    set({
      products,
      wholesaleOrders: s.wholesaleOrders.map((o) => (o.id === id ? updatedOrder : o)),
    })

    const statusLabels = { waiting: 'Waiting', shipped: 'In Shipping', reached: 'Arrived' }
    get().addToast(`Order marked as ${statusLabels[status] || status}`)

    syncDB(() => supabase.from('wholesale_orders').update({ data: updatedOrder }).eq('id', id))

    if (status === 'reached') {
      const affected = products.filter((p) => order.items.some((i) => i.productId === p.id))
      if (affected.length) {
        syncDB(() =>
          Promise.all(affected.map((p) => supabase.from('products').update({ data: p }).eq('id', p.id)))
        )
      }
    }
  },

  deleteWholesaleOrder: (id) => {
    set((s) => ({ wholesaleOrders: s.wholesaleOrders.filter((o) => o.id !== id) }))
    syncDB(() => supabase.from('wholesale_orders').delete().eq('id', id))
    get().addToast('Order deleted')
  },

  // ─── Sales ────────────────────────────────────────────
  createSale: (saleData) => {
    const s = get()
    const receiptNumber = generateReceiptNumber(s.receiptCounter)
    const id = uuidv4()

    let products = s.products
    saleData.items.forEach((item) => {
      products = products.map((p) => {
        if (p.id !== item.productId) return p
        return {
          ...p,
          stock: {
            ...p.stock,
            [item.size]: Math.max(0, (p.stock[item.size] || 0) - item.quantity),
          },
        }
      })
    })

    const sale = {
      ...saleData,
      id,
      receiptNumber,
      createdAt: new Date().toISOString(),
      source: 'pos',
      status: 'pending',
      customerName: saleData.customerName || '',
      customerContact: saleData.customerContact || '',
    }

    set({ products, sales: [sale, ...s.sales], receiptCounter: s.receiptCounter + 1 })

    syncDB(() =>
      supabase.from('sales').insert({ id: sale.id, data: sale, created_at: sale.createdAt })
    )
    const affected = products.filter((p) => saleData.items.some((i) => i.productId === p.id))
    if (affected.length) {
      syncDB(() =>
        Promise.all(affected.map((p) => supabase.from('products').update({ data: p }).eq('id', p.id)))
      )
    }
    get()._saveAppState()

    return sale
  },

  confirmSale: (id) => {
    const s = get()
    const sale = s.sales.find((x) => x.id === id)
    if (!sale || sale.status === 'confirmed') return
    const updated = { ...sale, status: 'confirmed', confirmedAt: new Date().toISOString() }
    set({ sales: s.sales.map((x) => (x.id === id ? updated : x)) })
    syncDB(() => supabase.from('sales').update({ data: updated }).eq('id', id))
    get().addToast(`Sale ${sale.receiptNumber} confirmed`)
  },

  rejectSale: (id) => {
    const s = get()
    const sale = s.sales.find((x) => x.id === id)
    if (!sale || sale.status === 'rejected' || sale.voided) return

    let products = s.products
    sale.items.forEach((item) => {
      products = products.map((p) => {
        if (p.id !== item.productId) return p
        return {
          ...p,
          stock: { ...p.stock, [item.size]: (p.stock[item.size] || 0) + item.quantity },
        }
      })
    })

    const rejected = { ...sale, status: 'rejected', voided: true, voidedAt: new Date().toISOString() }
    set({ products, sales: s.sales.map((x) => (x.id === id ? rejected : x)) })
    syncDB(() => supabase.from('sales').update({ data: rejected }).eq('id', id))
    const affected = products.filter((p) => sale.items.some((i) => i.productId === p.id))
    if (affected.length) {
      syncDB(() =>
        Promise.all(affected.map((p) => supabase.from('products').update({ data: p }).eq('id', p.id)))
      )
    }
    get().addToast(`Sale ${sale.receiptNumber} voided`)
  },

  // Legacy — now calls rejectSale
  voidSale: (id) => get().rejectSale(id),

  addManualSale: (saleData) => {
    const s = get()
    const receiptNumber = generateReceiptNumber(s.receiptCounter)
    const id = uuidv4()

    let products = s.products
    saleData.items.forEach((item) => {
      products = products.map((p) => {
        if (p.id !== item.productId) return p
        return {
          ...p,
          stock: {
            ...p.stock,
            [item.size]: Math.max(0, (p.stock[item.size] || 0) - item.quantity),
          },
        }
      })
    })

    const createdAt = saleData.date
      ? new Date(saleData.date + 'T12:00:00').toISOString()
      : new Date().toISOString()

    const sale = {
      id,
      receiptNumber,
      createdAt,
      source: 'manual',
      status: 'pending',
      items: saleData.items,
      subtotal: saleData.subtotal,
      discount: saleData.discount || 0,
      taxAmount: 0,
      total: saleData.total,
      paymentMethod: saleData.paymentMethod || 'cash',
      amountPaid: saleData.total,
      change: 0,
      customerName: saleData.customerName || '',
      customerContact: saleData.customerContact || '',
      notes: saleData.notes || '',
    }

    set({ products, sales: [sale, ...s.sales], receiptCounter: s.receiptCounter + 1 })
    syncDB(() =>
      supabase.from('sales').insert({ id: sale.id, data: sale, created_at: sale.createdAt })
    )
    const affected = products.filter((p) => saleData.items.some((i) => i.productId === p.id))
    if (affected.length) {
      syncDB(() =>
        Promise.all(affected.map((p) => supabase.from('products').update({ data: p }).eq('id', p.id)))
      )
    }
    get()._saveAppState()
    get().addToast(`Sale ${sale.receiptNumber} added`)
    return sale
  },

  syncProductToWebsite: (id) => {
    set((s) => ({
      products: s.products.map((p) =>
        p.id === id ? { ...p, websiteSynced: true, websiteSyncedAt: new Date().toISOString() } : p
      ),
    }))
    const product = get().products.find((p) => p.id === id)
    if (product) syncDB(() => supabase.from('products').update({ data: product }).eq('id', id))
  },

  // ─── Expenses ─────────────────────────────────────────
  addExpense: (expense) => {
    const newExpense = { id: uuidv4(), createdAt: new Date().toISOString(), ...expense }
    set((s) => ({ expenses: [newExpense, ...s.expenses] }))
    syncDB(() =>
      supabase
        .from('expenses')
        .insert({ id: newExpense.id, data: newExpense, created_at: newExpense.createdAt })
    )
    get().addToast('Expense added')
  },

  updateExpense: (id, updates) => {
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))
    const updated = get().expenses.find((e) => e.id === id)
    if (updated) syncDB(() => supabase.from('expenses').update({ data: updated }).eq('id', id))
    get().addToast('Expense updated')
  },

  deleteExpense: (id) => {
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
    syncDB(() => supabase.from('expenses').delete().eq('id', id))
    get().addToast('Expense deleted')
  },

  // ─── Cash Sessions ────────────────────────────────────
  openCashSession: (openingBalance) => {
    const session = {
      id: uuidv4(),
      openingBalance,
      movements: [],
      status: 'open',
      openedAt: new Date().toISOString(),
    }
    set({ currentCashSession: session })
    get()._saveAppState()
    get().addToast('Cash session opened')
    return session
  },

  closeCashSession: (closingBalance, notes) => {
    const s = get()
    if (!s.currentCashSession) return
    const closed = {
      ...s.currentCashSession,
      closingBalance,
      notes,
      status: 'closed',
      closedAt: new Date().toISOString(),
    }
    set({ cashSessions: [closed, ...s.cashSessions], currentCashSession: null })
    syncDB(() =>
      supabase
        .from('cash_sessions')
        .insert({ id: closed.id, data: closed, created_at: closed.openedAt })
    )
    get()._saveAppState()
    get().addToast('Cash session closed')
    return closed
  },

  addCashMovement: (type, amount, note) => {
    const s = get()
    if (!s.currentCashSession) return
    set({
      currentCashSession: {
        ...s.currentCashSession,
        movements: [
          ...s.currentCashSession.movements,
          { id: uuidv4(), type, amount, note, createdAt: new Date().toISOString() },
        ],
      },
    })
    get()._saveAppState()
    get().addToast(`${type === 'in' ? 'Cash in' : 'Cash out'} recorded`)
  },

  // ─── Settings ─────────────────────────────────────────
  updateSettings: (updates) => {
    set((s) => ({ settings: { ...s.settings, ...updates } }))
    get()._saveAppState()
    get().addToast('Settings saved')
  },
}))

export default useStore
