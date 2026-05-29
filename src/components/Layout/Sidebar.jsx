import {
  LayoutDashboard, ShoppingCart, Package, Truck, Tag, Receipt,
  TrendingDown, BarChart2, Wallet, Settings, Barcode, ShoppingBag,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'POS Terminal', icon: ShoppingCart },
  { key: 'sales', label: 'Sales', icon: ShoppingBag },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'wholesale', label: 'Wholesale', icon: Truck },
  { key: 'labels', label: 'Labels & Barcodes', icon: Barcode },
  { key: 'receipts', label: 'Receipts', icon: Receipt },
  { key: 'expenses', label: 'Expenses', icon: TrendingDown },
  { key: 'reports', label: 'Reports', icon: BarChart2 },
  { key: 'cash', label: 'Cash Management', icon: Wallet },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ page, setPage, open }) {
  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen w-60 bg-black flex flex-col z-30',
        'transition-transform duration-300 ease-in-out',
        // Mobile: hide by default, slide in when open
        open ? 'translate-x-0' : '-translate-x-full',
        // Desktop: always visible
        'lg:translate-x-0',
      )}
    >
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/10 flex-shrink-0">
        <span className="text-white font-extrabold text-2xl tracking-tight">thunder</span>
        <span className="block text-gray-500 text-xs mt-0.5">Point of Sale</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        {NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={clsx(
              'w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors text-left',
              page === key
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      {/* Version */}
      <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
        <p className="text-gray-600 text-xs">Thunder POS v1.0</p>
      </div>
    </aside>
  )
}
