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
        vendas: [],
        lucros: [],
        impostos: [],
      })
    }
    
    // Gerar dados dos últimos 6 meses baseados em dados reais
    const months = []
    const vendas: number[] = []
    const lucros: number[] = []
    const impostos: number[] = []
    const despesas: number[] = []
    const lucroLiquido: number[] = []
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      
      months.push(monthName)
      
      // Dados reais das vendas tradicionais para o mês
      let vendasMes = { valorVendas: 0 }
      try {
        vendasMes = db.prepare(`
          SELECT 
            COALESCE(SUM(total), 0) as valorVendas
          FROM vendas 
          WHERE empresa_id = ? 
            AND strftime('%Y', data_venda) = ? 
            AND strftime('%m', data_venda) = ?
        `).get(companyId, year.toString(), month.toString().padStart(2, '0')) as { valorVendas: number }
      } catch (e) {
        console.warn('Tabela vendas não existe:', e)
      }
      
      // Dados reais das linhas de venda para o mês
       const linhasMes = db.prepare(`
         SELECT 
           COALESCE(SUM(valorVenda), 0) as valorLinhas,
           COALESCE(SUM(lucroValor), 0) as lucroLinhas,
           COALESCE(SUM(taxaImpostoVl), 0) as impostosLinhas
         FROM linhas_venda 
         WHERE (companyId = ? OR companyId IS NULL)
           AND strftime('%Y', dataPedido) = ? 
           AND strftime('%m', dataPedido) = ?
       `).get(companyId, year.toString(), month.toString().padStart(2, '0')) as { 
         valorLinhas: number; 
         lucroLinhas: number; 
         impostosLinhas: number 
       }
      
      // Dados de outros negócios para o mês
      let outrosMes = { receitasOutros: 0 }
      try {
        outrosMes = db.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as receitasOutros
          FROM outros_negocios 
          WHERE status = 'ativo'
            AND strftime('%Y', data_transacao) = ? 
            AND strftime('%m', data_transacao) = ?
        `).get(year.toString(), month.toString().padStart(2, '0')) as { receitasOutros: number }
      } catch (e) {
        console.warn('Tabela outros_negocios não existe:', e)
      }
      
      // Dados de despesas dos acertos para o mês
      let despesasAcertosMes = { totalDespesasRateio: 0, totalDespesasIndividuais: 0 }
      try {
        despesasAcertosMes = db.prepare(`
          SELECT 
            COALESCE(SUM(totalDespesasRateio), 0) as totalDespesasRateio,
            COALESCE(SUM(totalDespesasIndividuais), 0) as totalDespesasIndividuais
          FROM acertos 
          WHERE strftime('%Y', data) = ? 
            AND strftime('%m', data) = ?
        `).get(year.toString(), month.toString().padStart(2, '0')) as { totalDespesasRateio: number, totalDespesasIndividuais: number }
      } catch (e) {
        console.warn('Tabela acertos não existe:', e)
      }
      
      // Dados de despesas de outros negócios para o mês
      let despesasOutrosMes = { despesasOutros: 0 }
      try {
        despesasOutrosMes = db.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as despesasOutros
          FROM outros_negocios 
          WHERE status = 'ativo'
            AND strftime('%Y', data_transacao) = ? 
            AND strftime('%m', data_transacao) = ?
        `).get(year.toString(), month.toString().padStart(2, '0')) as { despesasOutros: number }
      } catch (e) {
        console.warn('Tabela outros_negocios não existe:', e)
      }
      
      // Consolidar dados do mês
      const totalVendasMes = vendasMes.valorVendas + linhasMes.valorLinhas + outrosMes.receitasOutros
      const totalDespesasMes = despesasAcertosMes.totalDespesasRateio + despesasAcertosMes.totalDespesasIndividuais + despesasOutrosMes.despesasOutros
      const lucroLiquidoMes = linhasMes.lucroLinhas - totalDespesasMes
      
      vendas.push(Math.round(totalVendasMes))
      lucros.push(Math.round(linhasMes.lucroLinhas))
      impostos.push(Math.round(linhasMes.impostosLinhas))
      despesas.push(Math.round(totalDespesasMes))
      lucroLiquido.push(Math.round(lucroLiquidoMes))
    }
    
    // Transformar os dados no formato esperado pelo frontend
    const chartData = months.map((month, index) => ({
      name: month,
      vendas: vendas[index],
      lucros: lucros[index],
      impostos: impostos[index],
      despesas: despesas[index],
      lucroLiquido: lucroLiquido[index]
    }))
    
    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Error fetching dashboard series:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}