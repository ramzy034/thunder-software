import { useState, useEffect, Component } from 'react'
import { isConfigured } from './lib/supabase'
import useStore from './store/useStore'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import Toast from './components/UI/Toast'
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

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100 max-w-md w-full text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
            <p className="text-sm text-gray-500">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-100 font-sans">
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
        <Toast />
      </div>
    </ErrorBoundary>
  )
}
