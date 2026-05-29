export default function StatCard({ icon: Icon, value, label, sub, color = 'bg-black' }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center mb-4`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}
