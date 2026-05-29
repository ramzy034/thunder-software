import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Package, RefreshCw, Upload, X } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import useStore from '../store/useStore'
import Modal from '../components/UI/Modal'
import { formatCurrency, totalStock, calcProfit } from '../utils/format'
import { compressImage } from '../utils/imageUtils'

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']

const emptyForm = {
  name: '',
  description: '',
  category: '',
  sizes: [],
  colors: [],
  sellPrice: '',
  costPrice: '',
  barcode: '',
  image: '',
}

function BarcodePreview({ barcode }) {
  const svgRef = useRef(null)
  useEffect(() => {
    if (svgRef.current && barcode) {
      try {
        JsBarcode(svgRef.current, barcode, { format: 'CODE128', height: 40, fontSize: 10, margin: 4 })
      } catch {}
    }
  }, [barcode])
  if (!barcode) return null
  return <svg ref={svgRef} className="mt-2 max-w-full" />
}

function ImageUpload({ value, onChange }) {
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const compressed = await compressImage(file)
      onChange(compressed)
    } catch {
      alert('Failed to process image')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        className="relative w-full h-40 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-gray-400 transition-colors group bg-gray-50"
      >
        {value ? (
          <>
            <img src={value} className="w-full h-full object-cover" alt="Product" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">Change Image</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            {loading ? (
              <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={24} className="mb-2 opacity-60" />
                <span className="text-sm">Click to upload image</span>
                <span className="text-xs mt-1 opacity-60">JPG, PNG, WEBP</span>
              </>
            )}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange('') }}
          className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
        >
          <X size={12} /> Remove image
        </button>
      )}
    </div>
  )
}

export default function Products() {
  const products = useStore((s) => s.products)
  const categories = useStore((s) => s.categories)
  const addProduct = useStore((s) => s.addProduct)
  const updateProduct = useStore((s) => s.updateProduct)
  const deleteProduct = useStore((s) => s.deleteProduct)
  const settings = useStore((s) => s.settings)
  const currency = settings.currency

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [colorInput, setColorInput] = useState('#000000')
  const [stockModal, setStockModal] = useState(null)
  const [stockEdits, setStockEdits] = useState({})

  const openAdd = () => { setEditingProduct(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      sizes: product.sizes || [],
      colors: product.colors || [],
      sellPrice: product.sellPrice || '',
      costPrice: product.costPrice || '',
      barcode: product.barcode || '',
      image: product.image || '',
    })
    setModalOpen(true)
  }

  const toggleSize = (sz) =>
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(sz) ? f.sizes.filter((s) => s !== sz) : [...f.sizes, sz],
    }))

  const addColor = () => {
    if (!form.colors.includes(colorInput))
      setForm((f) => ({ ...f, colors: [...f.colors, colorInput] }))
  }

  const handleSave = () => {
    if (!form.name.trim()) return alert('Product name is required')
    if (!form.sellPrice) return alert('Selling price is required')
    const data = { ...form, sellPrice: parseFloat(form.sellPrice), costPrice: parseFloat(form.costPrice) || 0 }
    if (editingProduct) updateProduct(editingProduct.id, data)
    else addProduct(data)
    setModalOpen(false)
  }

  const handleDelete = (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteProduct(id)
  }

  const openStockModal = (product) => { setStockModal(product); setStockEdits({ ...product.stock }) }
  const saveStock = () => {
    if (!stockModal) return
    const newStock = Object.fromEntries(Object.entries(stockEdits).map(([sz, qty]) => [sz, parseInt(qty) || 0]))
    updateProduct(stockModal.id, { stock: newStock })
    setStockModal(null)
  }

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'All' || p.category === filterCat
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
            <Search size={15} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm w-52"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-black"
          >
            <option>All</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button
          onClick={openAdd}
          className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sizes</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Package size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400">No products found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const { profit, pct } = calcProfit(p.sellPrice, p.costPrice)
                  const stock = totalStock(p.stock)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} className="text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{p.name}</div>
                            <div className="text-xs text-gray-400">{p.sku} • {p.barcode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium">{formatCurrency(p.sellPrice, currency)}</td>
                      <td className="px-5 py-3.5 text-gray-500">{formatCurrency(p.costPrice || 0, currency)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(profit, currency)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">({pct.toFixed(0)}%)</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.category && (
                          <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full">{p.category}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{(p.sizes || []).join(', ') || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stock === 0 ? 'bg-red-100 text-red-600' : stock < 5 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openStockModal(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Adjust stock">
                            <RefreshCw size={14} />
                          </button>
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add Product'} width="max-w-2xl">
        <div className="space-y-4">
          {/* Image upload at top */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Product Image</label>
            <ImageUpload value={form.image} onChange={(img) => setForm((f) => ({ ...f, image: img }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Product Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                placeholder="e.g. Florida Shirt"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Selling Price *</label>
              <input
                type="number"
                value={form.sellPrice}
                onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                placeholder="420"
                min={0}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cost Price</label>
              <input
                type="number"
                value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
                placeholder="200"
                min={0}
              />
            </div>

            {form.sellPrice && form.costPrice && (
              <div className="col-span-2 bg-green-50 rounded-xl px-4 py-3 text-sm">
                <span className="text-green-700 font-semibold">
                  Profit: {formatCurrency(parseFloat(form.sellPrice) - parseFloat(form.costPrice), currency)}
                  {' '}({((parseFloat(form.sellPrice) - parseFloat(form.costPrice)) / parseFloat(form.costPrice) * 100).toFixed(0)}%)
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black bg-white"
              >
                <option value="">Select category</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Barcode (auto-generated if empty)</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black font-mono"
                placeholder="Leave empty to auto-generate"
              />
              <BarcodePreview barcode={form.barcode} />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Sizes</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.sizes.includes(sz) ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Colors</label>
              <div className="flex items-center gap-2">
                <input type="color" value={colorInput} onChange={(e) => setColorInput(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                <button type="button" onClick={addColor} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">Add Color</button>
                <div className="flex gap-2 flex-wrap">
                  {form.colors.map((c, i) => (
                    <div key={i} className="relative group">
                      <div style={{ backgroundColor: c }} className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer" />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black resize-none"
                rows={3}
                placeholder="Optional product description..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSave} className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors">
              {editingProduct ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Stock Adjust Modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`Adjust Stock — ${stockModal?.name}`}>
        {stockModal && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Set the current stock quantity per size:</p>
            {Object.entries(stockEdits).map(([sz, qty]) => (
              <div key={sz} className="flex items-center justify-between">
                <span className="font-medium text-sm">{sz}</span>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setStockEdits((prev) => ({ ...prev, [sz]: e.target.value }))}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-black"
                  min={0}
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStockModal(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={saveStock} className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800">Save Stock</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
