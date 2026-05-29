// Run: node scripts/seed-products.js
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'

const envContent = readFileSync('.env', 'utf8')
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('='); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const genBarcode = () => {
  let n = ''; for (let i = 0; i < 12; i++) n += Math.floor(Math.random() * 10)
  let s = 0; for (let i = 0; i < 12; i++) s += parseInt(n[i]) * (i % 2 === 0 ? 1 : 3)
  return n + ((10 - (s % 10)) % 10)
}
const genSKU = () => `PR${String(Math.floor(Math.random() * 9000) + 1000)}`

// cost and sell are in USD → multiply by 10 for MAD
// stock = total quantity (set as 'One Size', user can redistribute per size via Adjust Stock)
// wholesaleStatus: 'reached' = in stock, 'shipped' = on the way, null = not ordered yet
const PRODUCTS = [
  // ── Cusb sets ──
  { name: 'Cusb Pink Set',             category: 'Shirts and Tops',          cost: 6.5,  sell: 40,  stock: 4,   ws: 'reached' },
  { name: 'Cusb Red Pants',            category: 'Pants',                    cost: 6.5,  sell: 40,  stock: 13,  ws: 'reached' },
  { name: 'Cusb Green Set',            category: 'Shirts and Tops',          cost: 6.5,  sell: 40,  stock: 1,   ws: 'reached' },
  { name: 'Cusb Black Pants',          category: 'Pants',                    cost: 6.5,  sell: 40,  stock: 15,  ws: 'reached' },
  { name: 'Cusb Pants Mix (Grey/Light Grey/Green)', category: 'Pants',       cost: 6.5,  sell: 40,  stock: 31,  ws: 'reached' },
  { name: 'Cusb Blue Jean',            category: 'Pants',                    cost: 17,   sell: 65,  stock: 5,   ws: 'reached' },
  { name: 'Cusb Green Set (Late)',     category: 'Shirts and Tops',          cost: 6.5,  sell: 40,  stock: 4,   ws: 'reached' },
  { name: 'Cusb Cherry Maroon Set',   category: 'Shirts and Tops',          cost: 6.5,  sell: 40,  stock: 20,  ws: 'reached' },
  { name: 'Cusb Brown Set',           category: 'Shirts and Tops',          cost: 6.5,  sell: 40,  stock: 20,  ws: 'reached' },
  { name: 'Cusb Infinity Set',        category: 'Shirts and Tops',          cost: 6.5,  sell: 40,  stock: 5,   ws: 'reached' },
  { name: 'Cusb Dark Blue Set',       category: 'Shirts and Tops',          cost: 6.5,  sell: 40,  stock: 10,  ws: 'reached' },
  // ── DW items ──
  { name: 'DW Black Wings Jean',       category: 'Pants',                    cost: 8.5,  sell: 70,  stock: 0,   ws: 'shipped' },
  { name: 'DW GRJ',                    category: 'Pants',                    cost: 20,   sell: 50,  stock: 0,   ws: 'shipped' },
  { name: 'DW Double Waist Jean',      category: 'Pants',                    cost: 20,   sell: 50,  stock: 0,   ws: 'shipped' },
  { name: 'DW GR Jean',               category: 'Pants',                    cost: 6,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'DW Jersey',                category: 'Shirts and Tops',          cost: 5.5,  sell: 35,  stock: 0,   ws: 'shipped' },
  { name: 'DW Peso Shirts',           category: 'Shirts and Tops',          cost: 5.7,  sell: 35,  stock: 0,   ws: 'shipped' },
  { name: 'DW Demand Shirts',         category: 'Shirts and Tops',          cost: 7,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'DW Bohoo Gomlek',          category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'DW Carno Jorts',           category: 'Shorts',                   cost: 18,   sell: 65,  stock: 0,   ws: 'shipped' },
  { name: 'DW GR Jeans',             category: 'Pants',                    cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'DW 3 Model Long Sleeved',  category: 'Shirts and Tops',          cost: 8.6,  sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'DW DVD Jeans',            category: 'Pants',                    cost: 11.5, sell: 75,  stock: 12,  ws: 'reached' },
  { name: 'DW DVD Black Shorts',     category: 'Shorts',                   cost: 5,    sell: 35,  stock: 4,   ws: 'reached' },
  { name: 'DW DVD Blue Shorts',      category: 'Shorts',                   cost: 5,    sell: 35,  stock: 2,   ws: 'reached' },
  { name: 'DW Trendy Hoody Zip',     category: 'Sweatshirts and Zippers',  cost: 10,   sell: 50,  stock: 10,  ws: 'reached' },
  // ── M50 ──
  { name: 'M50 Super Jean',           category: 'Pants',                    cost: 19,   sell: 50,  stock: 0,   ws: 'shipped' },
  { name: 'M50 Organic Long Sleeves', category: 'Shirts and Tops',          cost: 10.5, sell: 45,  stock: 14,  ws: 'reached' },
  // ── Scuffers / Denim ──
  { name: 'Scuffers Hoodie',          category: 'Sweatshirts and Zippers',  cost: 19,   sell: 60,  stock: 0,   ws: 'shipped' },
  { name: 'Denim Cerrucci Mix',       category: 'Shirts and Tops',          cost: 19.5, sell: 55,  stock: 0,   ws: 'shipped' },
  // ── Shirts ──
  { name: 'Nofblac Shirts',          category: 'Shirts and Tops',          cost: 11,   sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'TIME Go32c Shirt',        category: 'Shirts and Tops',          cost: 14,   sell: 95,  stock: 7,   ws: 'reached' },
  { name: 'Cole Buxton Shirt',       category: 'Shirts and Tops',          cost: 14,   sell: 55,  stock: 0,   ws: 'shipped' },
  { name: 'GUST Carhartt Shirts',    category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 6,   ws: 'reached' },
  { name: 'Acne Studios Shirt',      category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Dickies T-Shirt',         category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Nude Project Hoodie',     category: 'Sweatshirts and Zippers',  cost: 8,    sell: 45,  stock: 0,   ws: 'shipped' },
  { name: 'T-Shirt Cerrucci',        category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Plain Pink Tee',          category: 'Shirts and Tops',          cost: 8,    sell: 35,  stock: 0,   ws: 'shipped' },
  { name: 'Plain Black Tee',         category: 'Shirts and Tops',          cost: 8,    sell: 35,  stock: 0,   ws: 'shipped' },
  { name: 'Black Tee With Print',    category: 'Shirts and Tops',          cost: 8,    sell: 35,  stock: 0,   ws: 'shipped' },
  { name: 'Gomlek Basic',            category: 'Shirts and Tops',          cost: 8.5,  sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'T-Shirts Mix Export',     category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'PULL MARK Stanford Shirts', category: 'Shirts and Tops',        cost: 9,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Legends White Gomleks',   category: 'Shirts and Tops',          cost: 10,   sell: 45,  stock: 0,   ws: 'shipped' },
  { name: 'Polo Jersey',             category: 'Shirts and Tops',          cost: 7,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Camo Jersey',             category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Brasil Long Sleeved',     category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Florida Gomleks',         category: 'Shirts and Tops',          cost: 9,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Compression Shirt',       category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Henly White',             category: 'Shirts and Tops',          cost: 5.6,  sell: 35,  stock: 0,   ws: 'shipped' },
  { name: 'Henly Black Short Sleeved', category: 'Shirts and Tops',        cost: 5.35, sell: 35,  stock: 0,   ws: 'shipped' },
  { name: 'Blue Long Sleeved Gomlek', category: 'Shirts and Tops',         cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: '1/2 Model Long Sleeved Shirt', category: 'Shirts and Tops',     cost: 7,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Short Sleeved Gomlek',    category: 'Shirts and Tops',          cost: 11.5, sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Camo Sleeved Shirt',      category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'N50 Daily Paper Tank Top', category: 'Shirts and Tops',         cost: 10,   sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Cerrucci Long Sleeved Shirt', category: 'Shirts and Tops',      cost: 10.5, sell: 50,  stock: 0,   ws: 'shipped' },
  { name: 'T-Shirt Cerrucci Long Sleeved', category: 'Shirts and Tops',    cost: 9.5,  sell: 45,  stock: 10,  ws: 'reached' },
  { name: 'T-Shirt Pequin',          category: 'Shirts and Tops',          cost: 8.5,  sell: 40,  stock: 10,  ws: 'reached' },
  { name: 'T-Shirt Burocs',          category: 'Shirts and Tops',          cost: 8.5,  sell: 40,  stock: 10,  ws: 'reached' },
  { name: 'T-Shirt Cerrucci Basic',  category: 'Shirts and Tops',          cost: 11.5, sell: 50,  stock: 10,  ws: 'reached' },
  { name: 'Nirvana Radiohead T-Shirts', category: 'Shirts and Tops',       cost: 4.5,  sell: 25,  stock: 10,  ws: 'reached' },
  { name: 'Tommy Supreme',           category: 'Shirts and Tops',          cost: 7,    sell: 35,  stock: 10,  ws: 'reached' },
  { name: 'Green Jersey',            category: 'Shirts and Tops',          cost: 5.5,  sell: 35,  stock: 16,  ws: 'reached' },
  { name: 'River Island Camo',       category: 'Shirts and Tops',          cost: 12,   sell: 50,  stock: 10,  ws: 'reached' },
  { name: 'Boho Blue Jean',          category: 'Pants',                    cost: 8,    sell: 45,  stock: 10,  ws: 'reached' },
  // ── Pants / Jeans ──
  { name: 'Dickies Pants Black',     category: 'Pants',                    cost: 10,   sell: 55,  stock: 0,   ws: 'shipped' },
  { name: 'Dion Jean Dark Blue',     category: 'Pants',                    cost: 16,   sell: 75,  stock: 0,   ws: 'shipped' },
  { name: 'Dion Jean Camo',          category: 'Pants',                    cost: 16,   sell: 75,  stock: 0,   ws: 'shipped' },
  { name: 'Dion Jeans',             category: 'Pants',                    cost: 16,   sell: 75,  stock: 0,   ws: 'shipped' },
  { name: 'Forest Jeans Pack',       category: 'Pants',                    cost: 13.5, sell: 65,  stock: 0,   ws: 'shipped' },
  { name: 'Cerrucci Light Blue Jean', category: 'Pants',                   cost: 11,   sell: 50,  stock: 0,   ws: 'shipped' },
  { name: 'Craftsman Jean Writing Pants', category: 'Pants',               cost: 13,   sell: 60,  stock: 0,   ws: 'shipped' },
  { name: 'Jaded Painted Jean',      category: 'Pants',                    cost: 25,   sell: 100, stock: 8,   ws: 'reached' },
  { name: 'Dershitz Jeans',         category: 'Pants',                    cost: 34,   sell: 80,  stock: 8,   ws: 'reached' },
  { name: 'Cerrucci Jean',          category: 'Pants',                    cost: 17,   sell: 70,  stock: 7,   ws: 'reached' },
  { name: 'All Saree White Jean',    category: 'Pants',                    cost: 13,   sell: 55,  stock: 8,   ws: 'reached' },
  { name: 'MHL Full Blossom Black Jean', category: 'Pants',                cost: 25,   sell: 90,  stock: 5,   ws: 'reached' },
  { name: 'MHL Trendy Plain Black',  category: 'Pants',                    cost: 20,   sell: 75,  stock: 10,  ws: 'reached' },
  { name: 'MHL Dechtuze Black',     category: 'Pants',                    cost: 13,   sell: 55,  stock: 10,  ws: 'reached' },
  { name: '6PM Blue Jean',           category: 'Pants',                    cost: 18,   sell: 85,  stock: 10,  ws: 'reached' },
  { name: 'Protect Black Jean',      category: 'Pants',                    cost: 18,   sell: 75,  stock: 10,  ws: 'reached' },
  { name: 'Cold Culture Jean',       category: 'Pants',                    cost: 18,   sell: 75,  stock: 10,  ws: 'reached' },
  { name: 'Urban Cargo Jean',        category: 'Pants',                    cost: 14,   sell: 70,  stock: 10,  ws: 'reached' },
  { name: 'Shorts Black Jaded',      category: 'Shorts',                   cost: 15,   sell: 55,  stock: 10,  ws: 'reached' },
  { name: 'Shorts Grey Jaded',       category: 'Pants',                    cost: 14,   sell: 55,  stock: 10,  ws: 'reached' },
  { name: 'Blue Jean Model Mini',    category: 'Pants',                    cost: 2,    sell: 25,  stock: 10,  ws: 'reached' },
  // ── Shorts ──
  { name: 'N50 Reternity Short',     category: 'Shorts',                   cost: 14,   sell: 55,  stock: 0,   ws: 'shipped' },
  { name: 'N50 Black Studs Jorts',  category: 'Shorts',                   cost: 11,   sell: 50,  stock: 0,   ws: 'shipped' },
  { name: 'Divine Blue Jean Jorts (3 Models)', category: 'Shorts',         cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Grind Syna Shorts Mix',   category: 'Shorts',                   cost: 12,   sell: 90,  stock: 23,  ws: 'reached' },
  { name: 'Grind Syna Shorts',       category: 'Shorts',                   cost: 12,   sell: 90,  stock: 5,   ws: 'reached' },
  { name: 'Reternity Blue Shorts',   category: 'Shorts',                   cost: 14,   sell: 65,  stock: 10,  ws: 'reached' },
  { name: 'Propaganda Black Shorts', category: 'Shorts',                   cost: 17,   sell: 65,  stock: 10,  ws: 'reached' },
  { name: 'DW DVD Black Shorts Alt', category: 'Shorts',                   cost: 5,    sell: 35,  stock: 4,   ws: 'reached' },
  { name: 'Urban Derchtuze Shorts',  category: 'Shorts',                   cost: 10.5, sell: 45,  stock: 0,   ws: 'shipped' },
  // ── Sweatshirts / Zippers ──
  { name: 'Grind Long Sleeves (2 Models)', category: 'Sweatshirts and Zippers', cost: 14, sell: 55, stock: 14, ws: 'reached' },
  { name: 'BARRIER Boys Night (3 Colors)', category: 'Sweatshirts and Zippers', cost: 9, sell: 45, stock: 15, ws: 'reached' },
  { name: 'Barstorm (3 Colors)',     category: 'Sweatshirts and Zippers',  cost: 9,    sell: 45,  stock: 15,  ws: 'reached' },
  { name: 'Essentials Hoodie Black', category: 'Sweatshirts and Zippers',  cost: 11,   sell: 45,  stock: 45,  ws: 'reached' },
  { name: 'Urban Chestly Hoodies',   category: 'Sweatshirts and Zippers',  cost: 16,   sell: 70,  stock: 18,  ws: 'reached' },
  { name: 'Grind Innovation By Div', category: 'Sweatshirts and Zippers',  cost: 23,   sell: 80,  stock: 15,  ws: 'reached' },
  { name: 'Rho Cerrucci Zip',        category: 'Sweatshirts and Zippers',  cost: 14,   sell: 55,  stock: 0,   ws: 'shipped' },
  { name: 'Rho More Money Zip',      category: 'Sweatshirts and Zippers',  cost: 13,   sell: 55,  stock: 0,   ws: 'shipped' },
  { name: 'Dark Wolf Letaine Zipper', category: 'Sweatshirts and Zippers', cost: 14,   sell: 65,  stock: 0,   ws: 'shipped' },
  { name: 'Dark Wolf Scuffers Hoodie', category: 'Sweatshirts and Zippers',cost: 15.5, sell: 65,  stock: 0,   ws: 'shipped' },
  { name: 'Dark Wolf Grey Zip',      category: 'Sweatshirts and Zippers',  cost: 16,   sell: 65,  stock: 0,   ws: 'shipped' },
  { name: 'Dark Wolf Peno Black Zip', category: 'Sweatshirts and Zippers', cost: 16,   sell: 75,  stock: 0,   ws: 'shipped' },
  { name: 'SVN Yellow Zips',         category: 'Sweatshirts and Zippers',  cost: 18,   sell: 55,  stock: 5,   ws: 'reached' },
  { name: 'Cerrucci Zips',          category: 'Sweatshirts and Zippers',  cost: 13,   sell: 55,  stock: 12,  ws: 'reached' },
  { name: 'Jaded Zip',              category: 'Sweatshirts and Zippers',  cost: 14,   sell: 60,  stock: 10,  ws: 'reached' },
  { name: 'Varne Hoodie',           category: 'Sweatshirts and Zippers',  cost: 20,   sell: 80,  stock: 5,   ws: 'reached' },
  { name: 'Carmo Zipper',           category: 'Sweatshirts and Zippers',  cost: 10.2, sell: 35,  stock: 4,   ws: 'reached' },
  { name: 'Carhartt Hoodie Long',    category: 'Sweatshirts and Zippers',  cost: 48,   sell: 160, stock: 5,   ws: 'reached' },
  // ── Jackets ──
  { name: 'Kani Jean Jacket',        category: 'Jackets',                  cost: 8,    sell: 45,  stock: 0,   ws: 'shipped' },
  { name: 'Giesto Beige Puffer',     category: 'Jackets',                  cost: 20,   sell: 85,  stock: 5,   ws: 'reached' },
  { name: 'Giesto Navy Blue Puffer', category: 'Jackets',                  cost: 20,   sell: 85,  stock: 8,   ws: 'reached' },
  { name: 'Giesto Brown & Black Puffer', category: 'Jackets',              cost: 20,   sell: 85,  stock: 4,   ws: 'reached' },
  { name: 'Giesto Design Puffer',    category: 'Jackets',                  cost: 22,   sell: 85,  stock: 10,  ws: 'reached' },
  { name: 'Dark Wolf Carhartt Jean Jacket', category: 'Jackets',           cost: 9,    sell: 45,  stock: 0,   ws: 'shipped' },
  { name: 'Carhartt Light Brown Jacket', category: 'Jackets',              cost: 48,   sell: 160, stock: 5,   ws: 'reached' },
  { name: 'Carhartt Dark Brown Jacket', category: 'Jackets',               cost: 48,   sell: 160, stock: 10,  ws: 'reached' },
  { name: 'Charhartt Blue Jacket',   category: 'Jackets',                  cost: 11,   sell: 60,  stock: 10,  ws: 'reached' },
  { name: 'Carmo GM Jacket',         category: 'Jackets',                  cost: 6.5,  sell: 35,  stock: 10,  ws: 'reached' },
  // ── Essentials ──
  { name: 'Essentials Roman White',  category: 'Shirts and Tops',          cost: 20,   sell: 65,  stock: 5,   ws: 'reached' },
  { name: 'Essentials Set Black',    category: 'Shirts and Tops',          cost: 20,   sell: 75,  stock: 15,  ws: 'reached' },
  { name: 'Cerrucci Compression Sport', category: 'Shirts and Tops',       cost: 20,   sell: 75,  stock: 10,  ws: 'reached' },
  { name: 'Starkmen Makarov Sport',  category: 'Shirts and Tops',          cost: 22,   sell: 75,  stock: 10,  ws: 'reached' },
  // ── Urban Cold Culture ──
  { name: 'Urban Cold Culture',      category: 'Shirts and Tops',          cost: 16,   sell: 70,  stock: 19,  ws: 'reached' },
  { name: 'Grind Jeans',            category: 'Pants',                    cost: 20,   sell: 65,  stock: 16,  ws: 'reached' },
  // ── Dark Wolf shirts/tops ──
  { name: 'Dark Wolf Tank Top Black', category: 'Shirts and Tops',         cost: 9,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Dark Wolf Tank Top White', category: 'Shirts and Tops',         cost: 10,   sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Dark Wolf T-Shirt White', category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  { name: 'Dark Wolf T-Shirt Black', category: 'Shirts and Tops',          cost: 8,    sell: 40,  stock: 0,   ws: 'shipped' },
  // ── Accessories (non-koztebek) ──
  { name: 'M50 Dechtuze Caps',      category: 'Accessories',              cost: 19,   sell: 47,  stock: 6,   ws: 'reached' },
  { name: 'Clue Belt',              category: 'Accessories',              cost: 5.11, sell: 25,  stock: 15,  ws: 'reached' },
  { name: 'Snake Belt',             category: 'Accessories',              cost: 3.4,  sell: 27,  stock: 6,   ws: 'reached' },
]

async function seed() {
  console.log(`Seeding ${PRODUCTS.length} products...`)
  let ok = 0, fail = 0
  for (const p of PRODUCTS) {
    const id = uuidv4()
    const now = new Date().toISOString()
    const product = {
      id,
      name: p.name,
      sku: genSKU(),
      barcode: genBarcode(),
      category: p.category,
      sellPrice: Math.round(p.sell * 10),   // USD → MAD
      costPrice: Math.round(p.cost * 10),   // USD → MAD
      stock: { 'One Size': p.stock },
      sizes: ['One Size'],
      image: '',
      active: true,
      websiteSynced: false,
      wholesaleStatus: p.ws || null,
      createdAt: now,
    }
    const { error } = await supabase.from('products').insert({ id, data: product, created_at: now })
    if (error) { console.error(`✗ ${p.name}:`, error.message); fail++ }
    else { console.log(`✓ ${p.name}`); ok++ }
  }
  console.log(`\nDone: ${ok} inserted, ${fail} failed`)
}

seed()
