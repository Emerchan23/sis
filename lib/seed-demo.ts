import { db } from './db'
import { uid } from './util'

// Get or create default company for demo data
function getDefaultCompanyId(): string {
  const row = db.prepare(`SELECT id FROM empresas LIMIT 1`).get() as any
  if (row?.id) return row.id
  
  // Create a default company if none exists
  const companyId = uid()
  db.prepare(`INSERT INTO empresas (id, nome, created_at) VALUES (?, ?, ?)`).run(
    companyId, 
    "Empresa Demo", 
    new Date().toISOString()
  )
  return companyId
}

const defaultCompanyId = getDefaultCompanyId()

function ensureCliente(nome: string, documento: string) {
  const row = db.prepare(`SELECT id FROM clientes WHERE nome=? AND empresa_id=?`).get(nome, defaultCompanyId) as any
  if (row?.id) return row.id
  
  const id = uid()
  db.prepare(`
    INSERT INTO clientes (id, nome, cpf_cnpj, empresa_id, created_at) 
    VALUES (?, ?, ?, ?, ?)
  `).run(
    id,
    nome,
    documento,
    defaultCompanyId,
    new Date().toISOString()
  )
  return id
}

function ensureProduto(nome: string, preco: number, categoria: string) {
  const row = db.prepare(`SELECT id FROM produtos WHERE nome=? AND empresa_id=?`).get(nome, defaultCompanyId) as any
  if (row?.id) return row.id
  
  const id = uid()
  db.prepare(`
    INSERT INTO produtos (id, nome, preco, categoria, empresa_id, created_at) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    nome,
    preco,
    categoria,
    defaultCompanyId,
    new Date().toISOString()
  )
  return id
}

function main() {
  console.log('🌱 Seeding demo data...')
  
  // Create demo clients
  const cliente1 = ensureCliente('João Silva', '123.456.789-00')
  const cliente2 = ensureCliente('Maria Santos', '987.654.321-00')
  const cliente3 = ensureCliente('Pedro Oliveira', '456.789.123-00')
  
  // Create demo products
  const produto1 = ensureProduto('Notebook Dell', 2500.00, 'Eletrônicos')
  const produto2 = ensureProduto('Mouse Logitech', 89.90, 'Acessórios')
  const produto3 = ensureProduto('Teclado Mecânico', 299.99, 'Acessórios')
  const produto4 = ensureProduto('Monitor 24"', 899.00, 'Eletrônicos')
  
  console.log('✅ Demo data seeded successfully!')
  console.log(`📊 Company ID: ${defaultCompanyId}`)
  console.log(`👥 Clients: ${[cliente1, cliente2, cliente3].length}`)
  console.log(`📦 Products: ${[produto1, produto2, produto3, produto4].length}`)
}

if (require.main === module) {
  main()
}