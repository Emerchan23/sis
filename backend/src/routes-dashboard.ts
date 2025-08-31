import type { FastifyInstance } from "fastify"
import { getDb } from "./db.js"
import { 
  withCache, 
  CACHE_KEYS, 
  CACHE_TTL, 
  invalidateDashboardCache 
} from "./cache.js"

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

function totalPedido(itens: any[]) {
  return itens.reduce((acc, i) => acc + Number(i.precoUnitario) * Number(i.quantidade), 0)
}
function impostosPedido(itens: any[]) {
  return itens.reduce((acc, i) => acc + Number(i.precoUnitario) * Number(i.quantidade) * Number(i.taxaImposto), 0)
}
function lucroPedido(itens: any[]) {
  return itens.reduce(
    (acc, i) =>
      acc +
      (Number(i.precoUnitario) - Number(i.custoUnitario) - Number(i.precoUnitario) * Number(i.taxaImposto)) *
        Number(i.quantidade),
    0,
  )
}

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/totals", async (req) => {
    const companyId = getCurrentCompanyId(req)
    if (!companyId) {
      return { totalRecebido: 0, totalAReceber: 0, lucroTotal: 0, impostosTotais: 0, totalVendas: 0, pendentes: 0 }
    }

    return withCache(
      CACHE_KEYS.dashboardTotals(companyId),
      CACHE_TTL.DASHBOARD_TOTALS,
      async () => {
        const db = getDb()
        
        // Use linhas_venda table for calculations - filter only by specific company
        const totalsQuery = `
          SELECT 
            COALESCE(SUM(valorVenda), 0) as totalVendas,
            COALESCE(SUM(taxaImpostoVl), 0) as impostosTotais,
            COALESCE(SUM(lucroValor), 0) as lucroTotal
          FROM linhas_venda
          WHERE companyId = ?
        `
        
        const totals = db.prepare(totalsQuery).get(companyId) as any
        
        // Get total received from linhas_venda where dataRecebimento is not null
        const totalRecebido = db.prepare(
          "SELECT COALESCE(SUM(valorVenda), 0) as total FROM linhas_venda WHERE companyId = ? AND dataRecebimento IS NOT NULL"
        ).get(companyId) as any
        
        // Get total pending sales (where dataRecebimento is null or paymentStatus is not 'Pago')
        const pendentesQuery = `
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(valorVenda), 0) as totalPendente
          FROM linhas_venda
          WHERE companyId = ?
          AND (dataRecebimento IS NULL OR paymentStatus != 'Pago')
        `
        
        const pendentes = db.prepare(pendentesQuery).get(companyId) as any
        
        const totalVendas = Number(totals.totalVendas || 0)
        const totalRecebidoValue = Number(totalRecebido.total || 0)
        const totalAReceber = Number(pendentes.totalPendente || 0)
        
        return {
          totalRecebido: totalRecebidoValue,
          totalAReceber,
          lucroTotal: Number(totals.lucroTotal || 0),
          impostosTotais: Number(totals.impostosTotais || 0),
          totalVendas,
          pendentes: Number(pendentes.count || 0)
        }
      }
    )
  })

  app.get("/dashboard/series", async (req) => {
    const companyId = getCurrentCompanyId(req)
    if (!companyId) {
      return []
    }

    return withCache(
      CACHE_KEYS.dashboardSeries(companyId),
      CACHE_TTL.DASHBOARD_SERIES,
      async () => {
        const db = getDb()
        
        // Use linhas_venda table for monthly aggregation - filter only by specific company
        const seriesQuery = `
          SELECT 
            strftime('%Y-%m', dataPedido) as month,
            COALESCE(SUM(valorVenda), 0) as vendas,
            COALESCE(SUM(taxaImpostoVl), 0) as impostos,
            COALESCE(SUM(lucroValor), 0) as lucros
          FROM linhas_venda
          WHERE companyId = ?
          GROUP BY strftime('%Y-%m', dataPedido)
          ORDER BY month ASC
        `
        
        const results = db.prepare(seriesQuery).all(companyId) as any[]
        
        return results.map(row => {
          const [year, month] = row.month.split('-')
          return {
            name: `${month}/${year}`,
            vendas: Number(row.vendas || 0),
            lucros: Number(row.lucros || 0),
            impostos: Number(row.impostos || 0)
          }
        })
      }
    )
  })

  app.get("/dashboard/summary", async (req) => {
    const companyId = getCurrentCompanyId(req)
    if (!companyId) {
      return { totalClientes: 0, totalPedidos: 0, pedidosPendentes: 0 }
    }

    const db = getDb()
    
    // Count total clients for the company
    const totalClientes = db.prepare(
      "SELECT COUNT(*) as count FROM clientes WHERE companyId = ?"
    ).get(companyId) as any
    
    // Count total unique orders for the company (using numeroOF as identifier)
    const totalPedidos = db.prepare(
      "SELECT COUNT(DISTINCT numeroOF) as count FROM linhas_venda WHERE companyId = ? AND numeroOF IS NOT NULL"
    ).get(companyId) as any
    
    // Count pending orders (where dataRecebimento is null or paymentStatus is not 'pago')
    const pedidosPendentes = db.prepare(
      "SELECT COUNT(*) as count FROM linhas_venda WHERE companyId = ? AND (dataRecebimento IS NULL OR paymentStatus != 'pago')"
    ).get(companyId) as any
    
    return {
      totalClientes: Number(totalClientes.count || 0),
      totalPedidos: Number(totalPedidos.count || 0),
      pedidosPendentes: Number(pedidosPendentes.count || 0)
    }
  })

  app.get("/dashboard/alerts", async (req) => {
    const companyId = getCurrentCompanyId(req)
    if (!companyId) {
      return []
    }

    const db = getDb()
    
    // Get pending sales with details for alerts
    const alertsQuery = `
      SELECT 
        numeroOF,
        dataPedido,
        SUM(valorVenda) as total,
        COUNT(*) as items
      FROM linhas_venda 
      WHERE companyId = ? 
        AND (dataRecebimento IS NULL OR paymentStatus != 'pago')
        AND numeroOF IS NOT NULL
      GROUP BY numeroOF, dataPedido
      ORDER BY dataPedido DESC
      LIMIT 5
    `
    
    const alerts = db.prepare(alertsQuery).all(companyId) as any[]
    
    return alerts.map(alert => ({
      id: alert.numeroOF,
      tipo: 'Pendente',
      descricao: `Pedido #${alert.numeroOF} • ${new Date(alert.dataPedido).toLocaleDateString('pt-BR')} • Total R$ ${Number(alert.total).toFixed(2)}`,
      data: alert.dataPedido,
      valor: Number(alert.total)
    }))
  })
}
