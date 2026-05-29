import { User, WifiOff } from 'lucide-react'
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
}

export default function Header({ page, syncError }) {
  const settings = useStore((s) => s.settings)

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900">{PAGE_TITLES[page] || 'Thunder POS'}</h1>
      <div className="flex items-center gap-3">
        {isConfigured && (
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
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
        <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
          <User size={18} className="text-white" />
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">Admin</p>
          <p className="text-xs text-gray-500">{settings.storeName}</p>
        </div>
      </div>
    </header>
  )
}
