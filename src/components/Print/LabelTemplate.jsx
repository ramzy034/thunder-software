import { forwardRef, useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

const LABEL_SIZES = {
  small: { width: '40mm', height: '20mm', fontSize: '7px', barcodeHeight: 20 },
  medium: { width: '60mm', height: '30mm', fontSize: '9px', barcodeHeight: 28 },
  large: { width: '80mm', height: '40mm', fontSize: '11px', barcodeHeight: 36 },
}

function SingleLabel({ product, size, currency = 'MAD', labelSize = 'medium' }) {
  const svgRef = useRef(null)
  const dim = LABEL_SIZES[labelSize] || LABEL_SIZES.medium

  useEffect(() => {
    if (svgRef.current && product?.barcode) {
      try {
        JsBarcode(svgRef.current, product.barcode, {
          format: 'CODE128',
          height: dim.barcodeHeight,
          width: 1.2,
          displayValue: true,
          fontSize: 7,
          margin: 2,
        })
      } catch (e) {
        console.warn('Barcode render error', e)
      }
    }
  }, [product, dim.barcodeHeight])

  return (
    <div
      style={{
        width: dim.width,
        height: dim.height,
        border: '1px solid #ccc',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2mm',
        margin: '1mm',
        pageBreakInside: 'avoid',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: dim.fontSize, fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {product?.name}
      </div>
      {size && (
        <div style={{ fontSize: dim.fontSize, color: '#555' }}>Size: {size}</div>
      )}
      <svg ref={svgRef} style={{ maxWidth: '100%' }} />
      <div style={{ fontSize: dim.fontSize, fontWeight: 'bold', marginTop: '1px' }}>
        {product?.sellPrice} {currency}
      </div>
    </div>
  )
}

const LabelTemplate = forwardRef(({ product, selectedSize, quantity = 1, labelSize = 'medium', currency = 'MAD' }, ref) => {
  if (!product) return null
  const labels = Array.from({ length: quantity })

  return (
    <div ref={ref} className="print-area bg-white" style={{ padding: '4mm' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {labels.map((_, i) => (
          <SingleLabel key={i} product={product} size={selectedSize} currency={currency} labelSize={labelSize} />
        ))}
      </div>
    </div>
  )
})

LabelTemplate.displayName = 'LabelTemplate'
export { SingleLabel }
export default LabelTemplate
