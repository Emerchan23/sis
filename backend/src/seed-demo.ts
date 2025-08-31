import { getDb } from "./db.js"
import { isoNow, uid } from "./util.js"

const db = getDb()

// Get or create default company for demo data
function getDefaultCompanyId(): string {
  const row = db.prepare(`SELECT id FROM empresas LIMIT 1`).get() as any
  if (row?.id) return row.id
  
  // Create a default company if none exists
  const companyId = uid()
  db.prepare(`INSERT INTO empresas (id, nome) VALUES (?, ?)`).run(companyId, "Empresa Demo")
  return companyId
}

const defaultCompanyId = getDefaultCompanyId()

function ensureCliente(nome: string) {
  const row = db.prepare(`SELECT id FROM clientes WHERE nome=? AND companyId=?`).get(nome, defaultCompanyId) as any
  if (row?.id) return row.id
  const id = uid()
  db.prepare(`INSERT INTO clientes (id, nome, documento, createdAt, companyId) VALUES (@id,@nome,@documento,@createdAt,@companyId)`).run({
    id,
    nome,
    documento: `DOC-${Math.floor(Math.random() * 99999)}`,
    createdAt: isoNow(),
    companyId: defaultCompanyId,
  })
  return id
}

function ensureProduto(nome: string, preco: number) {
  const row = db.prepare(`SELECT id FROM produtos WHERE nome=? AND companyId=?`).get(nome, defaultCompanyId) as any
  if (row?.id) return row.id
  const id = uid()
  db.prepare(`INSERT INTO produtos (id, nome, precoVenda, custo, taxaImposto, estoque, createdAt, companyId) VALUES (@id,@nome,@precoVenda,@custo,@taxaImposto,@estoque,@createdAt,@companyId)`).run({
    id,
    nome,
    precoVenda: preco,
    custo: preco * 0.7,
    taxaImposto: 0.1,
    estoque: 100,
    createdAt: isoNow(),
    companyId: defaultCompanyId,
  })
  return id
}

function addPedido(clienteId: string, total: number, diasAtras: number) {
  const id = uid()
  const emissao = new Date(Date.now() - diasAtras * 24 * 3600_000).toISOString()
  db.prepare(
    `INSERT INTO pedidos (id, numero, data, clienteId, tipo, observacoes, companyId)
     VALUES (@id,@numero,@data,@clienteId,@tipo,@observacoes,@companyId)`,
  ).run({
    id,
    numero: Math.floor(Math.random() * 99999),
    data: emissao,
    clienteId,
    tipo: 'venda',
    observacoes: `Pedido de demonstração - Total: R$ ${total}`,
    companyId: defaultCompanyId,
  })
  // recebimento (metade recebido)
  const recId = uid()
  db.prepare(
    `INSERT INTO recebimentos (id, pedidoId, valor, data, formaPagamento, companyId)
     VALUES (@id,@pedidoId,@valor,@data,@formaPagamento,@companyId)`,
  ).run({
    id: recId,
    pedidoId: id,
    valor: total / 2,
    data: emissao,
    formaPagamento: 'pix',
    companyId: defaultCompanyId,
  })
}

function main() {
  const c1 = ensureCliente("Cliente Exemplo")
  ensureProduto("Produto A", 100)
  ensureProduto("Produto B", 80)

  addPedido(c1, 500, 1)
  addPedido(c1, 800, 5)
  addPedido(c1, 300, 10)

  console.log("Seed demo concluído.")
}

main()
