/**
 * Prints a React ref element using a hidden iframe — no popup blocker issues.
 * Works with any element that uses inline styles (ReceiptTemplate, LabelTemplate).
 */
export function printElement(ref, title = 'Print') {
  if (!ref?.current) {
    console.warn('printElement: ref is null, nothing to print')
    return
  }

  const content = ref.current.outerHTML

  const iframe = document.createElement('iframe')
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    border: '0',
    visibility: 'hidden',
  })
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; background: white; }
    @page { margin: 4mm; size: auto; }
  </style>
</head>
<body>${content}</body>
</html>`)
  doc.close()

  // Give the browser time to render SVGs (barcodes) before printing
  setTimeout(() => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } finally {
      // Remove iframe after print dialog closes
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      }, 1000)
    }
  }, 400)
}
