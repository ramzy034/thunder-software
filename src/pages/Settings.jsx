import { useState, useEffect } from 'react'
import { Save, Globe, Store, Printer, Link, Trash2, Eye, EyeOff, Download, Monitor, Smartphone } from 'lucide-react'
import useStore from '../store/useStore'
import ReceiptTemplate from '../components/Print/ReceiptTemplate'

const CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP', 'AED', 'SAR', 'TND', 'DZD']

// Sample sale used for the receipt preview
const SAMPLE_SALE = {
  receiptNumber: 'RCP-00001',
  createdAt: new Date().toISOString(),
  voided: false,
  items: [
    { productName: 'Florida Shirt', size: 'M', quantity: 2, unitPrice: 420, costPrice: 200 },
    { productName: 'Vivienne Westwood Hoodie', size: 'L', quantity: 1, unitPrice: 1000, costPrice: 550 },
  ],
  subtotal: 1840,
  discount: 100,
  taxAmount: 0,
  total: 1740,
  paymentMethod: 'cash',
  amountPaid: 2000,
  change: 260,
}

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const categories = useStore((s) => s.categories)
  const addCategory = useStore((s) => s.addCategory)

  const [form, setForm] = useState({ ...settings })
  const [newCategory, setNewCategory] = useState('')
  const [saved, setSaved] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window._cachedPWAPrompt) setInstallPrompt(window._cachedPWAPrompt)
    const handler = (e) => { e.preventDefault(); window._cachedPWAPrompt = e; setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) setIsInstalled(true)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { window._cachedPWAPrompt = null; setInstallPrompt(null); setIsInstalled(true) }
  }

  const handleSave = () => {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const f = (field) => ({
    value: form[field] ?? '',
    onChange: (e) => setForm((prev) => ({ ...prev, [field]: e.target.value })),
  })

  // Build a preview settings object from current form (not yet saved)
  const previewSettings = { ...settings, ...form }

  return (
    <div className="max-w-3xl w-full space-y-6">
      {/* Store Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-5">
          <Store size={18} className="text-gray-700" />
          <h3 className="font-bold text-gray-900">Store Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Store Name</label>
            <input {...f('storeName')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black" placeholder="Thunder Store" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
            <input {...f('storePhone')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black" placeholder="+212 6xx xxx xxx" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <input {...f('storeEmail')} type="email" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black" placeholder="store@email.com" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Address</label>
            <input {...f('storeAddress')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black" placeholder="Store address..." />
          </div>
        </div>
      </div>

      {/* Financial */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-5">
          <Globe size={18} className="text-gray-700" />
          <h3 className="font-bold text-gray-900">Financial Settings</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Currency</label>
            <select {...f('currency')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black bg-white">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tax Rate (%)</label>
            <input
              {...f('taxRate')}
              type="number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
              placeholder="0"
              min={0}
              max={100}
            />
          </div>
        </div>
      </div>

      {/* Receipt Customization */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-gray-700" />
            <h3 className="font-bold text-gray-900">Receipt Customization</h3>
          </div>
          <button
            onClick={() => setShowReceiptPreview((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {showReceiptPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showReceiptPreview ? 'Hide Preview' : 'Preview Receipt'}
          </button>
        </div>

        <div className={`grid gap-6 ${showReceiptPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Receipt Header Message</label>
              <textarea
                {...f('receiptHeader')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black resize-none"
                rows={2}
                placeholder="Message shown at the top of the receipt"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Receipt Footer Message</label>
              <textarea
                {...f('receiptFooter')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black resize-none"
                rows={2}
                placeholder="Message shown at the bottom of the receipt"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Default Label Size</label>
              <select {...f('labelSize')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black bg-white">
                <option value="small">Small (40×20mm)</option>
                <option value="medium">Medium (60×30mm)</option>
                <option value="large">Large (80×40mm)</option>
              </select>
            </div>
          </div>

          {/* Live Receipt Preview */}
          {showReceiptPreview && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-3">Live Preview (with sample data)</p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-auto max-h-[520px]">
                <ReceiptTemplate sale={SAMPLE_SALE} settings={previewSettings} />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Updates live as you edit — changes apply after saving
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Website Integration */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Link size={18} className="text-gray-700" />
          <h3 className="font-bold text-gray-900">Website Integration</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5">Connect to your Thunder website to sync products and stock automatically.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Website URL</label>
            <input {...f('websiteUrl')} type="url" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black font-mono" placeholder="https://your-thunder-website.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">API Key</label>
            <input {...f('apiKey')} type="password" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black font-mono" placeholder="Your API key (will be configured later)" />
          </div>
          {form.websiteUrl && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              Website integration will be activated once the source code is available. The connection settings are saved.
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Product Categories</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
            placeholder="New category name..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCategory.trim()) { addCategory(newCategory.trim()); setNewCategory('') }
            }}
          />
          <button
            onClick={() => { if (newCategory.trim()) { addCategory(newCategory.trim()); setNewCategory('') } }}
            className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full">{c}</span>
          ))}
        </div>
      </div>

      {/* Install App */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-gray-700" />
          <h3 className="font-bold text-gray-900">Install as Desktop App</h3>
        </div>

        {isInstalled ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <Monitor size={20} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Thunder POS is installed</p>
              <p className="text-xs text-green-600">Running as a desktop app — no browser needed</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Install Thunder POS on your computer or phone for faster access — no browser needed.</p>

            {installPrompt ? (
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
              >
                <Download size={16} /> Install Thunder POS
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Manual install steps:</p>
                <div className="grid gap-3">
                  <div className="flex gap-3 items-start bg-gray-50 rounded-xl p-3">
                    <Monitor size={18} className="text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p className="font-semibold text-gray-800 mb-0.5">Chrome / Edge (Desktop)</p>
                      <p>Click the <strong>⊕</strong> icon in the address bar, or go to<br />menu (⋮) → <em>Save and share</em> → <em>Install page as app</em></p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start bg-gray-50 rounded-xl p-3">
                    <Smartphone size={18} className="text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p className="font-semibold text-gray-800 mb-0.5">iPhone / iPad (Safari)</p>
                      <p>Tap the <strong>Share</strong> button → <em>Add to Home Screen</em></p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start bg-gray-50 rounded-xl p-3">
                    <Smartphone size={18} className="text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <p className="font-semibold text-gray-800 mb-0.5">Android (Chrome)</p>
                      <p>Tap menu (⋮) → <em>Add to Home Screen</em> or <em>Install app</em></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={18} className="text-red-500" />
          <h3 className="font-bold text-red-600">Danger Zone</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">These actions are irreversible. All data will be permanently deleted.</p>
        <button
          onClick={() => {
            if (
              confirm('⚠️ This will delete ALL data including products, sales, expenses, and settings.') &&
              prompt('Type DELETE to confirm:') === 'DELETE'
            ) {
              localStorage.removeItem('thunder-pos-v1')
              window.location.reload()
            }
          }}
          className="border border-red-300 text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Reset All Data
        </button>
      </div>

      {/* Save */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${saved ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-gray-800'}`}
        >
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
