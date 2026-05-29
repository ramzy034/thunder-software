import { useState } from 'react'
import { Plus, Trash2, Edit2, TrendingDown } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import useStore from '../store/useStore'
import Modal from '../components/UI/Modal'
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from '../utils/format'

const COLORS = ['#111', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f59e0b', '#ef4444', '#3b82f6', '#10b981']

const emptyForm = { date: new Date().toISOString().slice(0, 10), category: '', description: '', amount: '' }

export default function Expenses() {
  const expenses = useStore((s) => s.expenses)
  const addExpense = useStore((s) => s.addExpense)
  const updateExpense = useStore((s) => s.updateExpense)
  const deleteExpense = useStore((s) => s.deleteExpense)
  const settings = useStore((s) => s.settings)
  const currency = settings.currency

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [filterCat, setFilterCat] = useState('All')

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (e) => {
    setEditingId(e.id)
    setForm({ date: e.date, category: e.category, description: e.description, amount: e.amount })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.category) return alert('Category is required')
    if (!form.amount || parseFloat(form.amount) <= 0) return alert('Amount must be greater than 0')
    const data = { ...form, amount: parseFloat(form.amount) }
    if (editingId) updateExpense(editingId, data)
    else addExpense(data)
    setModalOpen(false)
  }

  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0)

  // Category breakdown
  const byCat = EXPENSE_CATEGORIES.map((cat) => {
    const total = expenses.filter((e) => e.category === cat).reduce((a, e) => a + e.amount, 0)
    return { name: cat, value: total }
  }).filter((c) => c.value > 0)

  const filtered = [...expenses]
    .filter((e) => filterCat === 'All' || e.category === filterCat)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  // Monthly totals
  const monthlyTotals = expenses.reduce((acc, e) => {
    const month = e.date.slice(0, 7)
    acc[month] = (acc[month] || 0) + e.amount
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="w-10 h-10 bg-red-500 rounded-full mb-3" />
          <div className="text-2xl font-bold">{formatCurrency(totalExpenses, currency)}</div>
          <div className="text-sm text-gray-500">Total Expenses</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold">{expenses.length}</div>
          <div className="text-sm text-gray-500">Total Records</div>
          <div className="mt-2 text-xs text-gray-400">Across {byCat.length} categories</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold">
            {formatCurrency(Object.values(monthlyTotals).reduce((a, b) => Math.max(a, b), 0), currency)}
          </div>
          <div className="text-sm text-gray-500">Highest Monthly</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">By Category</h3>
          {byCat.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v, currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none"
              >
                <option>All</option>
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button
              onClick={openAdd}
              className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <Plus size={15} /> Add Expense
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      <TrendingDown size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400 text-sm">No expenses recorded</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-500">{formatDate(e.date)}</td>
                      <td className="px-5 py-3.5">
                        <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">{e.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">{e.description || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-red-600">{formatCurrency(e.amount, currency)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this expense?')) deleteExpense(e.id) }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black bg-white"
            >
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Amount *</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
              placeholder="What was this expense for?"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800">
              {editingId ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
