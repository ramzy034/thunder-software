import { forwardRef } from 'react'
import { formatCurrency, formatDateTime } from '../../utils/format'

const ReceiptTemplate = forwardRef(({ sale, settings }, ref) => {
  if (!sale) return null
  const currency = settings?.currency || 'MAD'

  return (
    <div ref={ref} className="print-area bg-white" style={{ width: '80mm', padding: '8mm', fontFamily: 'monospace', fontSize: '12px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{settings?.storeName || 'Thunder Store'}</div>
        {settings?.storeAddress && <div>{settings.storeAddress}</div>}
        {settings?.storePhone && <div>{settings.storePhone}</div>}
        {settings?.storeEmail && <div>{settings.storeEmail}</div>}
        <div style={{ marginTop: '4px', fontSize: '11px' }}>{settings?.receiptHeader}</div>
      </div>

      {/* Receipt Info */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Receipt:</span>
          <span style={{ fontWeight: 'bold' }}>{sale.receiptNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Date:</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Payment:</span>
          <span style={{ textTransform: 'capitalize' }}>{sale.paymentMethod}</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', paddingTop: '8px', paddingBottom: '8px', marginBottom: '8px' }}>
        {sale.items.map((item, i) => (
          <div key={i} style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold' }}>{item.productName}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {item.size} × {item.quantity}
              </span>
              <span>{formatCurrency(item.unitPrice * item.quantity, currency)}</span>
            </div>
            <div style={{ color: '#666', fontSize: '11px' }}>
              @{formatCurrency(item.unitPrice, currency)} each
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal, currency)}</span>
        </div>
        {sale.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
            <span>Discount:</span>
            <span>-{formatCurrency(sale.discount, currency)}</span>
          </div>
        )}
        {sale.taxAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tax:</span>
            <span>{formatCurrency(sale.taxAmount, currency)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px' }}>
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total, currency)}</span>
        </div>
        {sale.paymentMethod === 'cash' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cash Paid:</span>
              <span>{formatCurrency(sale.amountPaid, currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Change:</span>
              <span>{formatCurrency(sale.change, currency)}</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '8px', fontSize: '11px', color: '#555' }}>
        <div>{settings?.receiptFooter || 'Thank you!'}</div>
        <div style={{ marginTop: '4px' }}>Items: {sale.items.reduce((a, i) => a + i.quantity, 0)}</div>
        {sale.voided && (
          <div style={{ color: 'red', fontWeight: 'bold', fontSize: '14px', marginTop: '8px' }}>*** VOIDED ***</div>
        )}
      </div>
    </div>
  )
})

ReceiptTemplate.displayName = 'ReceiptTemplate'
export default ReceiptTemplate
