import { NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

// Helper function to get current company ID from user preferences or first available company
function getCurrentCompanyId(): string | null {
  try {
    // Try to get from user preferences first
    const row = db.prepare("SELECT json FROM user_prefs WHERE userId=?").get("default") as { json: string } | undefined
    if (row) {
      const prefs = JSON.parse(row.json)
      if (prefs.currentCompanyId) {
        return prefs.currentCompanyId
      }
    }
    
    // If no preferences, get the first available company
    const firstCompany = db.prepare("SELECT id FROM empresas LIMIT 1").get() as { id: string } | undefined
    return firstCompany?.id || null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const companyId = getCurrentCompanyId()
    if (!companyId) {
      return NextResponse.json({
        totalClientes: 0,
        totalProdutos: 0,
        totalPedidos: 0,
        pedidosPendentes: 0,
      })
    }
    
    // Calcular contadores reais baseado nas tabelas de dados
    
    // Contadores básicos
    const clientesCount = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE empresa_id = ?").get(companyId) as { count: number }
    const produtosCount = db.prepare("SELECT COUNT(*) as count FROM produtos WHERE empresa_id = ?").get(companyId) as { count: number }
    
    // Contadores de vendas reais
    const vendasCount = db.prepare("SELECT COUNT(*) as count FROM vendas WHERE empresa_id = ?").get(companyId) as { count: number }
    
    // Contadores de linhas de venda
    const linhasVendaCount = db.prepare("SELECT COUNT(*) as count FROM linhas_venda WHERE companyId = ? OR companyId IS NULL").get(companyId) as { count: number }
    
    // Contadores de orçamentos
    const orcamentosData = db.prepare(`
      SELECT 
        COUNT(*) as totalOrcamentos,
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as orcamentosPendentes
      FROM orcamentos
    `).get() as { totalOrcamentos: number; orcamentosPendentes: number }
    
    // Contadores de linhas de venda pendentes
    const linhasPendentes = db.prepare(`
      SELECT COUNT(*) as count 
      FROM linhas_venda 
      WHERE (companyId = ? OR companyId IS NULL) 
        AND paymentStatus = 'PENDENTE'
    `).get(companyId) as { count: number }
    
    // Consolidar totais
    const totalPedidos = vendasCount.count + linhasVendaCount.count + orcamentosData.totalOrcamentos
    const pedidosPendentes = linhasPendentes.count + orcamentosData.orcamentosPendentes
    
    const summary = {
      totalClientes: clientesCount.count,
      totalProdutos: produtosCount.count,
      totalPedidos,
      pedidosPendentes,
    }
    
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}