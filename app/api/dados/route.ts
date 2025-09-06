import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    
    switch (tipo) {
      case 'dashboard':
        // Dados consolidados para o dashboard
        const totalVendas = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM vendas').get() as any
        const totalClientes = db.prepare('SELECT COUNT(*) as count FROM clientes').get() as any
        const totalProdutos = db.prepare('SELECT COUNT(*) as count FROM produtos').get() as any
        
        // Vendas por mês (últimos 6 meses)
        const vendasMensais = db.prepare(`
          SELECT 
            strftime('%Y-%m', data_venda) as mes,
            COUNT(*) as quantidade,
            COALESCE(SUM(total), 0) as valor
          FROM vendas 
          WHERE data_venda >= date('now', '-6 months')
          GROUP BY strftime('%Y-%m', data_venda)
          ORDER BY mes
        `).all()
        
        return NextResponse.json({
          totais: {
            vendas: totalVendas.count,
            valorVendas: totalVendas.total,
            clientes: totalClientes.count,
            produtos: totalProdutos.count
          },
          vendasMensais
        })
        
      case 'relatorios':
        // Dados para relatórios
        const produtosMaisVendidos = db.prepare(`
          SELECT 
            p.nome,
            COUNT(v.id) as quantidade_vendas,
            COALESCE(SUM(v.quantidade), 0) as quantidade_total,
            COALESCE(SUM(v.total), 0) as valor_total
          FROM produtos p
          LEFT JOIN vendas v ON p.id = v.produto_id
          GROUP BY p.id, p.nome
          ORDER BY quantidade_vendas DESC
          LIMIT 10
        `).all()
        
        const clientesAtivos = db.prepare(`
          SELECT 
            c.nome,
            COUNT(v.id) as total_compras,
            COALESCE(SUM(v.total), 0) as valor_total
          FROM clientes c
          LEFT JOIN vendas v ON c.id = v.cliente_id
          GROUP BY c.id, c.nome
          HAVING total_compras > 0
          ORDER BY valor_total DESC
          LIMIT 10
        `).all()
        
        return NextResponse.json({
          produtosMaisVendidos,
          clientesAtivos
        })
        
      default:
        // Dados gerais
        const empresas = db.prepare('SELECT * FROM empresas ORDER BY nome').all()
        const clientes = db.prepare('SELECT * FROM clientes ORDER BY nome').all()
        const produtos = db.prepare('SELECT * FROM produtos ORDER BY nome').all()
        
        return NextResponse.json({
          empresas,
          clientes,
          produtos
        })
    }
  } catch (error) {
    console.error('Error fetching dados:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}