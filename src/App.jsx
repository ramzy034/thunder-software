import { useState, useEffect } from 'react'
import { isConfigured } from './lib/supabase'
import useStore from './store/useStore'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import SetupScreen from './components/Setup/SetupScreen'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Wholesale from './pages/Wholesale'
import Labels from './pages/Labels'
import Receipts from './pages/Receipts'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import CashManagement from './pages/CashManagement'
import Settings from './pages/Settings'
import Sales from './pages/Sales'

const PAGES = {
  dashboard: Dashboard,
  pos: POS,
  products: Products,
  wholesale: Wholesale,
  labels: Labels,
  receipts: Receipts,
  expenses: Expenses,
  reports: Reports,
  cash: CashManagement,
  settings: Settings,
  sales: Sales,
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Connecting to database…</p>
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const init = useStore((s) => s.init)
  const loading = useStore((s) => s.loading)
  const syncError = useStore((s) => s.syncError)

  useEffect(() => { init() }, [init])

  const navigate = (p) => { setPage(p); setSidebarOpen(false) }

  if (!isConfigured) return <SetupScreen />
  if (loading) return <LoadingScreen />

  const PageComponent = PAGES[page] || Dashboard

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar page={page} setPage={navigate} open={sidebarOpen} />

      <div className="flex-1 flex flex-col lg:ml-60 min-w-0">
        <Header page={page} syncError={syncError} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <PageComponent />
        </main>
      </div>
    </div>
  )
}
