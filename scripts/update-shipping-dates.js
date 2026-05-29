// Run: node scripts/update-shipping-dates.js
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf8')
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('='); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

// Maps shipping date → array of product name substrings (lowercase match)
const DATES = {
  '2025-03-12': [
    'cusb pink','cusb red','cusb green set','cusb black pants','cusb pants mix',
    'dw black wings','dw grj',
    'dershitz','essentials roman','essentials set black','essentials hoodie black',
    'cerrucci compression sport','starkmen makarov',
    'giesto beige','giesto navy','giesto brown','giesto design',
  ],
  '2025-03-27': [
    'dw double waist','m50 super jean','scuffers hoodie','denim cerrucci mix','nofblac',
  ],
  '2025-04-03': [
    'dw gr jean','dw jersey','time go32c','cole buxton','gust carhartt',
    'acne studios','dickies t-shirt','nude project','dickies pants black',
    't-shirt cerrucci','nofblac',
  ],
  '2025-04-10': [
    'n50 reternity','dion jean dark','dion jean camo',
  ],
  '2025-04-17': [
    'dw peso shirts','dw demand','dw bohoo',
    'grind syna shorts mix','grind syna shorts',
    'grind long sleeves','m50 organic long','jaded painted jean',
  ],
  '2025-04-24': [
    'barrier boys night','barstorm',
    'plain pink','plain black tee','black tee with print',
    'short sleeved gomlek','camo sleeved shirt',
    '1/2 model long sleeved','gomlek basic',
    't-shirts mix export','pull mark stanford','legends white',
    'polo jersey','camo jersey','brasil long',
    'florida gomleks','compression shirt',
    'henly white','henly black short','blue long sleeved gomlek',
    'dw carno jorts','n50 daily paper',
    'forest jeans','cerrucci light blue jean','cerrucci long sleeved shirt',
    'kani jean jacket','dw gr jeans','dw 3 model long sleeved',
    'dion jeans','craftsman jean',
  ],
  '2025-05-22': [
    'n50 black studs','divine blue jean jorts',
  ],
  '2026-01-06': [
    'urban derchtuze shorts','urban chestly hoodies','urban cold culture',
    'grind jeans','grind innovation',
  ],
  '2026-01-07': [
    'rho cerrucci zip','rho more money',
  ],
  '2026-01-12': [
    'dark wolf carhartt jean jacket',
  ],
  '2026-01-19': [
    'dark wolf letaine','dark wolf scuffers hoodie',
    'dark wolf grey zip','dark wolf peno black zip',
  ],
  '2026-01-22': [
    'dark wolf tank top black','dark wolf tank top white',
  ],
  '2026-02-03': [
    'dark wolf t-shirt white','dark wolf t-shirt black',
  ],
  '2026-02-04': [
    'jaded zip','carhartt hoodie long','river island camo',
    'dw trendy hoody','boho blue jean','blue jean model mini',
  ],
  '2026-02-16': [
    'carhartt light brown jacket','carhartt dark brown jacket','charhartt blue jacket',
  ],
  '2026-02-27': [
    'dw dvd jeans','dw dvd black shorts','dw dvd blue shorts',
    'cerrucci zips','mhl full blossom','mhl trendy plain','mhl dechtuze',
    'm50 dechtuze caps','6pm blue jean','protect black jean','svn yellow',
    'reternity blue shorts','propaganda black shorts','cold culture jean',
    'urban cargo jean','shorts black jaded','shorts grey jaded',
    't-shirt pequin','t-shirt burocs','t-shirt cerrucci basic',
    't-shirt cerrucci long sleeved','cerrucci jean','all saree white jean',
    'cusb blue jean','varne hoodie',
  ],
  '2026-03-12': [
    'cusb green set (late)','carmo gm jacket','cusb cherry maroon','cusb brown set',
    'cusb infinity set','cusb dark blue set','tommy supreme','green jersey',
    'nirvana radiohead','carmo zipper','snake belt','clue belt',
  ],
}

// Build name → date lookup
const nameToDate = {}
for (const [date, names] of Object.entries(DATES)) {
  for (const fragment of names) nameToDate[fragment] = date
}

function findDate(productName) {
  const lower = productName.toLowerCase()
  for (const [fragment, date] of Object.entries(nameToDate)) {
    if (lower.includes(fragment)) return date
  }
  return null
}

async function run() {
  const { data: rows, error } = await supabase.from('products').select('id, data')
  if (error) { console.error('Fetch error:', error); return }

  console.log(`Updating ${rows.length} products with shipping dates...`)
  let updated = 0, skipped = 0

  for (const row of rows) {
    const date = findDate(row.data.name)
    if (!date) { skipped++; continue }

    const updatedData = { ...row.data, shippingDate: date }
    const { error: err } = await supabase.from('products').update({ data: updatedData }).eq('id', row.id)
    if (err) console.error(`✗ ${row.data.name}:`, err.message)
    else { console.log(`✓ ${row.data.name} → ${date}`); updated++ }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped (no date found)`)
}

run()
