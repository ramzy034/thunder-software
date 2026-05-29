import { User, WifiOff, Menu } from 'lucide-react'
import useStore from '../../store/useStore'
import { isConfigured } from '../../lib/supabase'

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  pos: 'POS Terminal',
  products: 'Products',
  wholesale: 'Wholesale Orders',
  labels: 'Labels & Barcodes',
  receipts: 'Receipts',
  expenses: 'Expenses',
  reports: 'Reports & Analytics',
  cash: 'Cash Management',
  settings: 'Settings',
  sales: 'Sales',
}

export default function Header({ page, syncError, onMenuClick }) {
  const settings = useStore((s) => s.settings)

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg lg:text-2xl font-bold text-gray-900 truncate">
          {PAGE_TITLES[page] || 'Thunder POS'}
        </h1>
      </div>

      <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
        {isConfigured && (
          <div
            className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              syncError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`}
            title={syncError || 'Syncing with cloud'}
          >
            {syncError ? (
              <><WifiOff size={11} /> Sync error</>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> Live sync</>
            )}
          </div>
        )}
        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-black flex items-center justify-center flex-shrink-0">
          <User size={16} className="text-white" />
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-900">Admin</p>
          <p className="text-xs text-gray-500 max-w-[120px] truncate">{settings.storeName}</p>
        </div>
      </div>
    </header>
  )
}
