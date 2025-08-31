import type { FastifyInstance } from "fastify"
import { getDb } from "./db.js"

// Helper function to get current company ID from user preferences
function getCurrentCompanyId(req: any): string | null {
  const db = getDb()
  const row = db.prepare("SELECT json FROM user_prefs WHERE userId=?").get("default") as { json: string } | undefined
  if (!row) return null
  
  try {
    const prefs = JSON.parse(row.json)
    return prefs.currentEmpresaId || null
  } catch {
    return null
  }
}

export async function registerBackup(app: FastifyInstance) {
  app.get("/backup/export", async (req) => {
    const d = getDb()
    const companyId = getCurrentCompanyId(req)
    if (!companyId) {
      return { error: "No company selected" }
    }
    const clientes = d.prepare(`SELECT * FROM clientes WHERE companyId = ?`).all(companyId)
    const produtos = d.prepare(`SELECT * FROM produtos WHERE companyId = ?`).all(companyId)
    const pedidos = d.prepare(`SELECT * FROM pedidos WHERE companyId = ?`).all(companyId)
    const itens = d.prepare(`SELECT * FROM itens_pedido WHERE companyId = ?`).all(companyId)
    const recebimentos = d.prepare(`SELECT * FROM recebimentos WHERE companyId = ?`).all(companyId)

    const empresaRow = d.prepare(`SELECT json FROM empresa_config WHERE empresaId=?`).get(companyId) as { json?: string } | undefined
    const empresa = empresaRow ? JSON.parse(empresaRow.json || '{}') : null
    const seq = d.prepare(`SELECT value FROM seqs WHERE key='pedido'`).get() as { value?: number } | undefined
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { clientes, produtos, pedidos, itens, recebimentos, empresa, seqPedido: seq?.value ?? 1 },
    }
  })

  app.post("/backup/import", async (req) => {
    const body = req.body as any
    const merge = String((req.query as any)?.merge ?? "1") !== "0"
    const d = getDb()
    const companyId = getCurrentCompanyId(req)
    if (!companyId) {
      return { error: "No company selected" }
    }
    const tx = d.transaction(() => {
      if (!merge) {
        d.prepare(`DELETE FROM itens_pedido WHERE companyId = ?`).run(companyId)
        d.prepare(`DELETE FROM recebimentos WHERE companyId = ?`).run(companyId)
        d.prepare(`DELETE FROM pedidos WHERE companyId = ?`).run(companyId)
        d.prepare(`DELETE FROM produtos WHERE companyId = ?`).run(companyId)
        d.prepare(`DELETE FROM clientes WHERE companyId = ?`).run(companyId)

      }
      for (const c of body?.data?.clientes ?? []) {
        d.prepare(`
          INSERT INTO clientes (id,nome,documento,endereco,telefone,email,createdAt,companyId)
          VALUES (@id,@nome,@documento,@endereco,@telefone,@email,@createdAt,@companyId)
          ON CONFLICT(id) DO UPDATE SET
            nome=excluded.nome,documento=excluded.documento,endereco=excluded.endereco,
            telefone=excluded.telefone,email=excluded.email,createdAt=excluded.createdAt,companyId=excluded.companyId
        `).run({ ...c, companyId })
      }
      for (const p of body?.data?.produtos ?? []) {
        d.prepare(`
          INSERT INTO produtos (id,nome,descricao,marca,precoVenda,custo,taxaImposto,modalidadeVenda,estoque,linkRef,custoRef,createdAt,companyId)
          VALUES (@id,@nome,@descricao,@marca,@precoVenda,@custo,@taxaImposto,@modalidadeVenda,@estoque,@linkRef,@custoRef,@createdAt,@companyId)
          ON CONFLICT(id) DO UPDATE SET
            nome=excluded.nome,descricao=excluded.descricao,marca=excluded.marca,precoVenda=excluded.precoVenda,
            custo=excluded.custo,taxaImposto=excluded.taxaImposto,modalidadeVenda=excluded.modalidadeVenda,
            estoque=excluded.estoque,linkRef=excluded.linkRef,custoRef=excluded.custoRef,createdAt=excluded.createdAt,companyId=excluded.companyId
        `).run({ ...p, companyId })
      }
      for (const ped of body?.data?.pedidos ?? []) {
        d.prepare(`
          INSERT INTO pedidos (id,numero,data,clienteId,tipo,observacoes,companyId)
          VALUES (@id,@numero,@data,@clienteId,@tipo,@observacoes,@companyId)
          ON CONFLICT(id) DO UPDATE SET
            numero=excluded.numero,data=excluded.data,clienteId=excluded.clienteId,tipo=excluded.tipo,observacoes=excluded.observacoes,companyId=excluded.companyId
        `).run({ ...ped, companyId })
      }
      // Itens: ressincroniza por pedido
      const delItens = d.prepare(`DELETE FROM itens_pedido WHERE pedidoId=? AND companyId=?`)
      const insItem = d.prepare(`
        INSERT INTO itens_pedido (id,pedidoId,produtoId,quantidade,precoUnitario,custoUnitario,taxaImposto,companyId)
        VALUES (@id,@pedidoId,@produtoId,@quantidade,@precoUnitario,@custoUnitario,@taxaImposto,@companyId)
      `)
      const itemsByPedido = new Map<string, any[]>()
      for (const it of body?.data?.itens ?? []) {
        const list = itemsByPedido.get(it.pedidoId) ?? []
        list.push(it)
        itemsByPedido.set(it.pedidoId, list)
      }
      for (const [pedidoId, items] of itemsByPedido.entries()) {
        delItens.run(pedidoId, companyId)
        for (const it of items) insItem.run({ ...it, companyId })
      }

      for (const r of body?.data?.recebimentos ?? []) {
        d.prepare(`
          INSERT INTO recebimentos (id,pedidoId,valor,data,formaPagamento,companyId)
          VALUES (@id,@pedidoId,@valor,@data,@formaPagamento,@companyId)
          ON CONFLICT(id) DO UPDATE SET
            pedidoId=excluded.pedidoId,valor=excluded.valor,data=excluded.data,formaPagamento=excluded.formaPagamento,companyId=excluded.companyId
        `).run({ ...r, companyId })
      }



      if (body?.data?.empresa) {
        const empresaData = JSON.stringify(body.data.empresa)
        d.prepare(`
          INSERT INTO empresa_config (empresaId, json) VALUES (?, ?)
          ON CONFLICT(empresaId) DO UPDATE SET json=excluded.json
        `).run(companyId, empresaData)
      }
      const seq = body?.data?.seqPedido
      if (typeof seq === "number") {
        d.prepare(`
          INSERT INTO seqs (key,value) VALUES ('pedido',@v)
          ON CONFLICT(key) DO UPDATE SET value=excluded.value
        `).run({ v: seq })
      }
    })
    tx()
    return { ok: true }
  })
}
