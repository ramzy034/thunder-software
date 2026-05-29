import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import useStore from '../../store/useStore'

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const icons = {
    success: <CheckCircle size={16} className="flex-shrink-0" />,
    error: <AlertCircle size={16} className="flex-shrink-0" />,
    info: <Info size={16} className="flex-shrink-0" />,
  }

  const colors = {
    success: 'bg-gray-900 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
  }

  return (
    <div
      className={`flex items-center gap-2.5 pl-4 pr-3 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all duration-300 ${colors[toast.type] || colors.success} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {icons[toast.type] || icons.success}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default function Toast() {
  const toasts = useStore((s) => s.toasts)
  const removeToast = useStore((s) => s.removeToast)

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={removeToast} />
        </div>
      ))}
    </div>
  )
}
