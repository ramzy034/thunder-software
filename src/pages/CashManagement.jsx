import { useState } from 'react'
import { Plus, DollarSign, ArrowUpCircle, ArrowDownCircle, Lock, Unlock } from 'lucide-react'
import useStore from '../store/useStore'
import Modal from '../components/UI/Modal'
import { formatCurrency, formatDateTime, formatDate } from '../utils/format'

export default function CashManagement() {
  const currentCashSession = useStore((s) => s.currentCashSession)
  const cashSessions = useStore((s) => s.cashSessions)
  const sales = useStore((s) => s.sales)
  const openCashSession = useStore((s) => s.openCashSession)
  const closeCashSession = useStore((s) => s.closeCashSession)
  const addCashMovement = useStore((s) => s.addCashMovement)
  const settings = useStore((s) => s.settings)
  const currency = settings.currency

  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [movementModal, setMovementModal] = useState(false)
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [moveType, setMoveType] = useState('in')
  const [moveAmount, setMoveAmount] = useState('')
  const [moveNote, setMoveNote] = useState('')

  // Calculate expected cash in drawer
  const getExpectedCash = (session) => {
    if (!session) return 0
    const cashSales = sales
      .filter((s) => !s.voided && s.paymentMethod === 'cash' && new Date(s.createdAt) >= new Date(session.openedAt))
      .reduce((a, s) => a + s.total, 0)
    const movements = session.movements.reduce((a, m) => a + (m.type === 'in' ? m.amount : -m.amount), 0)
    return session.openingBalance + cashSales + movements
  }

  const expectedCash = getExpectedCash(currentCashSession)

  const todaySales = sales.filter((s) => {
    if (!currentCashSession || s.voided) return false
    return new Date(s.createdAt) >= new Date(currentCashSession.openedAt)
  })
  const cashSalesTotal = todaySales.filter((s) => s.paymentMethod === 'cash').reduce((a, s) => a + s.total, 0)
  const cardSalesTotal = todaySales.filter((s) => s.paymentMethod === 'card').reduce((a, s) => a + s.total, 0)
  const totalSales = todaySales.reduce((a, s) => a + s.total, 0)

  return (
    <div className="space-y-6">
      {/* Session Status */}
      <div className={`rounded-2xl p-6 flex items-center justify-between ${currentCashSession ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${currentCashSession ? 'bg-green-600' : 'bg-gray-400'}`}>
            {currentCashSession ? <Unlock size={24} className="text-white" /> : <Lock size={24} className="text-white" />}
          </div>
          <div>
            <div className={`font-bold text-lg ${currentCashSession ? 'text-green-800' : 'text-gray-600'}`}>
              {currentCashSession ? 'Cash Drawer Open' : 'Cash Drawer Closed'}
            </div>
            {currentCashSession && (
              <div className="text-sm text-green-600">
                Opened at {formatDateTime(currentCashSession.openedAt)} • Opening balance: {formatCurrency(currentCashSession.openingBalance, currency)}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {!currentCashSession ? (
            <button onClick={() => setOpenModal(true)} className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 flex items-center gap-2">
              <Unlock size={15} /> Open Drawer
            </button>
          ) : (
            <>
              <button onClick={() => setMovementModal(true)} className="border border-gray-300 bg-white text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                <Plus size={15} /> Cash Movement
              </button>
              <button onClick={() => setCloseModal(true)} className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 flex items-center gap-2">
                <Lock size={15} /> Close Drawer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Current Session Stats */}
      {currentCashSession && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Opening Balance', value: formatCurrency(currentCashSession.openingBalance, currency), icon: DollarSign, color: 'bg-black' },
              { label: 'Cash Sales', value: formatCurrency(cashSalesTotal, currency), icon: ArrowUpCircle, color: 'bg-green-600' },
              { label: 'Card Sales', value: formatCurrency(cardSalesTotal, currency), icon: ArrowUpCircle, color: 'bg-blue-600' },
              { label: 'Expected in Drawer', value: formatCurrency(expectedCash, currency), icon: DollarSign, color: 'bg-amber-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 ${s.color} rounded-full flex items-center justify-center mb-3`}>
                  <s.icon size={18} className="text-white" />
                </div>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Today's orders in session */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3">Session Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Orders</span><span className="font-semibold">{todaySales.length}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Revenue</span><span className="font-semibold">{formatCurrency(totalSales, currency)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Cash Revenue</span><span className="font-semibold">{formatCurrency(cashSalesTotal, currency)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Card Revenue</span><span className="font-semibold">{formatCurrency(cardSalesTotal, currency)}</span></div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                  <span>Expected Cash</span><span>{formatCurrency(expectedCash, currency)}</span>
                </div>
              </div>
            </div>

            {/* Cash movements */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3">Cash Movements</h3>
              {currentCashSession.movements.length === 0 ? (
                <p className="text-gray-400 text-sm">No manual movements recorded</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentCashSession.movements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.type === 'in' ? <ArrowUpCircle size={14} className="text-green-500" /> : <ArrowDownCircle size={14} className="text-red-500" />}
                        <div>
                          <div className="text-sm">{m.note || (m.type === 'in' ? 'Cash In' : 'Cash Out')}</div>
                          <div className="text-xs text-gray-400">{formatDateTime(m.createdAt)}</div>
                        </div>
                      </div>
                      <span className={`font-semibold text-sm ${m.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                        {m.type === 'in' ? '+' : '-'}{formatCurrency(m.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Session History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Session History</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Opened</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Closed</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Opening</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Closing</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cashSessions.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No closed sessions yet</td></tr>
            ) : (
              [...cashSessions].reverse().map((s) => {
                const diff = (s.closingBalance || 0) - (s.openingBalance || 0)
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">{formatDate(s.openedAt)}</td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDateTime(s.openedAt)}</td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDateTime(s.closedAt)}</td>
                    <td className="px-5 py-3.5 text-right">{formatCurrency(s.openingBalance, currency)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{formatCurrency(s.closingBalance, currency)}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff, currency)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Open Drawer Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Open Cash Drawer">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Opening Balance ({currency})</label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
              placeholder="0.00"
              min={0}
            />
            <p className="text-xs text-gray-400 mt-1">Enter the amount of cash currently in the drawer</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setOpenModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => {
                openCashSession(parseFloat(openingBalance) || 0)
                setOpenModal(false)
                setOpeningBalance('')
              }}
              className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800"
            >
              Open Drawer
            </button>
          </div>
        </div>
      </Modal>

      {/* Close Drawer Modal */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Close Cash Drawer">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Expected Cash:</span><span className="font-bold">{formatCurrency(expectedCash, currency)}</span></div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Actual Closing Balance ({currency})</label>
            <input
              type="number"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
              placeholder={expectedCash.toFixed(2)}
              min={0}
            />
            {closingBalance && (
              <div className={`mt-1 text-xs font-medium ${parseFloat(closingBalance) >= expectedCash ? 'text-green-600' : 'text-red-500'}`}>
                Difference: {parseFloat(closingBalance) >= expectedCash ? '+' : ''}{formatCurrency(parseFloat(closingBalance) - expectedCash, currency)}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black resize-none"
              rows={2}
              placeholder="Optional end-of-day notes..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCloseModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => {
                closeCashSession(parseFloat(closingBalance) || 0, closeNotes)
                setCloseModal(false)
                setClosingBalance('')
                setCloseNotes('')
              }}
              className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-700"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </Modal>

      {/* Cash Movement Modal */}
      <Modal open={movementModal} onClose={() => setMovementModal(false)} title="Record Cash Movement">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'in', label: '+ Cash In', color: 'bg-green-600' },
                { value: 'out', label: '− Cash Out', color: 'bg-red-500' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setMoveType(t.value)}
                  className={`py-3 rounded-xl font-medium text-sm transition-colors ${moveType === t.value ? `${t.color} text-white` : 'bg-gray-100 text-gray-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Amount ({currency})</label>
            <input
              type="number"
              value={moveAmount}
              onChange={(e) => setMoveAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Reason</label>
            <input
              type="text"
              value={moveNote}
              onChange={(e) => setMoveNote(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
              placeholder="e.g. Change float, petty cash, safe drop..."
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMovementModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => {
                if (!moveAmount || parseFloat(moveAmount) <= 0) return alert('Enter a valid amount')
                addCashMovement(moveType, parseFloat(moveAmount), moveNote)
                setMovementModal(false)
                setMoveAmount('')
                setMoveNote('')
              }}
              className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800"
            >
              Record Movement
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
