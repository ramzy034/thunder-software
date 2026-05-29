/**
 * Opens the system print dialog for a React ref element.
 * Works with any element that uses inline styles (ReceiptTemplate, LabelTemplate).
 * The new window approach is the most reliable cross-browser print method.
 */
export function printElement(ref, title = 'Print') {
  if (!ref?.current) {
    console.warn('printElement: ref is null, nothing to print')
    return
  }

  const content = ref.current.outerHTML

  const win = window.open('', '_blank', 'width=700,height=900,toolbar=0,menubar=0,scrollbars=1,status=0')
  if (!win) {
    alert('Printing requires pop-ups to be allowed. Please allow pop-ups for this site in your browser settings and try again.')
    return
  }

  win.document.write(`<!DOCTYPE html>
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

  win.document.close()

  // Give the browser time to render SVGs (barcodes) before printing
  setTimeout(() => {
    win.focus()
    win.print()
  }, 400)
}
