import { NextResponse } from 'next/server'
import { db } from '../../../../lib/db'
import { uid } from '../../../../lib/util'

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
      return NextResponse.json([])
    }
    
    const alerts = []
    
    // Alertas baseados em dados reais
    
    // 1. Alerta de pagamentos pendentes
    const pagamentosPendentes = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(valorVenda), 0) as valor
      FROM linhas_venda 
      WHERE (companyId = ? OR companyId IS NULL) 
        AND paymentStatus = 'PENDENTE'
    `).get(companyId) as { count: number; valor: number }
    
    if (pagamentosPendentes.count > 0) {
      alerts.push({
        id: '1',
        type: 'warning' as const,
        title: 'Pagamentos Pendentes',
        message: `${pagamentosPendentes.count} vendas pendentes totalizando R$ ${pagamentosPendentes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        timestamp: new Date().toISOString(),
      })
    }
    
    // 2. Alerta de orçamentos pendentes
    const orcamentosPendentes = db.prepare(`
      SELECT COUNT(*) as count
      FROM orcamentos 
      WHERE status = 'pendente'
    `).get() as { count: number }
    
    if (orcamentosPendentes.count > 0) {
      alerts.push({
        id: '2',
        type: 'info' as const,
        title: 'Orçamentos Pendentes',
        message: `${orcamentosPendentes.count} orçamentos aguardando aprovação.`,
        timestamp: new Date().toISOString(),
      })
    }
    
    // 3. Alerta de vendas sem lucro definido
    const vendasSemLucro = db.prepare(`
      SELECT COUNT(*) as count
      FROM linhas_venda 
      WHERE (companyId = ? OR companyId IS NULL) 
        AND (lucroValor IS NULL OR lucroValor = 0)
    `).get(companyId) as { count: number }
    
    if (vendasSemLucro.count > 0) {
      alerts.push({
        id: '3',
        type: 'warning' as const,
        title: 'Vendas sem Lucro Definido',
        message: `${vendasSemLucro.count} vendas não têm lucro calculado. Verifique os dados.`,
        timestamp: new Date().toISOString(),
      })
    }
    
    // 4. Alerta de base de clientes pequena
    const clientesCount = db.prepare("SELECT COUNT(*) as count FROM clientes WHERE empresa_id = ?").get(companyId) as { count: number }
    
    if (clientesCount.count < 5) {
      alerts.push({
        id: '4',
        type: 'info' as const,
        title: 'Base de Clientes',
        message: `Você tem ${clientesCount.count} clientes cadastrados. Considere expandir sua base de clientes.`,
        timestamp: new Date().toISOString(),
      })
    }
    
    // 5. Alerta de poucos produtos
    const produtosCount = db.prepare("SELECT COUNT(*) as count FROM produtos WHERE empresa_id = ?").get(companyId) as { count: number }
    
    if (produtosCount.count < 3) {
      alerts.push({
        id: '5',
        type: 'info' as const,
        title: 'Catálogo de Produtos',
        message: `Apenas ${produtosCount.count} produtos cadastrados. Adicione mais produtos ao seu catálogo.`,
        timestamp: new Date().toISOString(),
      })
    }
    
    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching dashboard alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}