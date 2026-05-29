import { useState, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer, Search } from 'lucide-react'
import useStore from '../store/useStore'
import LabelTemplate from '../components/Print/LabelTemplate'

const LABEL_SIZES = [
  { value: 'small', label: 'Small (40×20mm)', desc: '3-4 labels per row' },
  { value: 'medium', label: 'Medium (60×30mm)', desc: '2-3 labels per row' },
  { value: 'large', label: 'Large (80×40mm)', desc: '1-2 labels per row' },
]

export default function Labels() {
  const products = useStore((s) => s.products)
  const settings = useStore((s) => s.settings)

  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [labelSize, setLabelSize] = useState('medium')

  const printRef = useRef(null)

  const handlePrint = useReactToPrint({ content: () => printRef.current })

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const selectProduct = (p) => {
    setSelectedProduct(p)
    setSelectedSize('')
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Left: Product Selection */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Select Product</h3>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 mb-3">
            <Search size={15} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm flex-1"
            />
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                  selectedProduct?.id === p.id ? 'bg-black text-white' : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className={`text-xs ${selectedProduct?.id === p.id ? 'text-gray-300' : 'text-gray-400'}`}>
                    {p.sku} • {p.barcode}
                  </div>
                </div>
                <div className={`font-semibold text-sm ${selectedProduct?.id === p.id ? 'text-white' : 'text-gray-700'}`}>
                  {p.sellPrice} {settings.currency}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Label Options */}
        {selectedProduct && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-900">Label Options</h3>

            {/* Size filter */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Size (optional)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSize('')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!selectedSize ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  No Size
                </button>
                {(selectedProduct.sizes || []).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSize === sz ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Label size */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Label Size</label>
              <div className="space-y-2">
                {LABEL_SIZES.map((ls) => (
                  <button
                    key={ls.value}
                    onClick={() => setLabelSize(ls.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                      labelSize === ls.value ? 'border-black bg-black/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{ls.label}</div>
                      <div className="text-xs text-gray-400">{ls.desc}</div>
                    </div>
                    {labelSize === ls.value && <div className="w-4 h-4 bg-black rounded-full" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Number of Labels</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-black"
                  min={1}
                  max={100}
                />
                <span className="text-sm text-gray-500">labels will be printed</span>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <Printer size={18} />
              Print {quantity} Label{quantity > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Right: Preview */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Preview</h3>
        {selectedProduct ? (
          <div>
            <div className="border border-gray-100 rounded-xl p-4 overflow-auto">
              <LabelTemplate
                ref={printRef}
                product={selectedProduct}
                selectedSize={selectedSize}
                quantity={Math.min(quantity, 6)}
                labelSize={labelSize}
                currency={settings.currency}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Preview shows up to 6 labels</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-3">
              <Printer size={24} className="opacity-40" />
            </div>
            <p className="text-sm">Select a product to preview labels</p>
          </div>
        )}
      </div>
    </div>
  )
}
