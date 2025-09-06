import { NextResponse } from 'next/server'
import { db } from '../../../lib/db'

// Helper function to get current company ID from user preferences
function getCurrentCompanyId(): string | null {
  try {
    const row = db.prepare("SELECT json FROM user_prefs WHERE userId=?").get("default") as { json: string } | undefined
    if (!row) return null
    
    const prefs = JSON.parse(row.json)
    return prefs.currentEmpresaId || null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const companyId = getCurrentCompanyId()
    
    // Buscar todos os dados do sistema
    const empresas = db.prepare("SELECT * FROM empresas ORDER BY created_at DESC").all()
    const clientes = companyId 
      ? db.prepare("SELECT * FROM clientes WHERE empresa_id = ? ORDER BY created_at DESC").all(companyId)
      : db.prepare("SELECT * FROM clientes ORDER BY created_at DESC").all()
    const produtos = companyId
      ? db.prepare("SELECT * FROM produtos WHERE empresa_id = ? ORDER BY created_at DESC").all(companyId)
      : db.prepare("SELECT * FROM produtos ORDER BY created_at DESC").all()
    const orcamentos = companyId
      ? db.prepare("SELECT * FROM orcamentos WHERE empresa_id = ? ORDER BY created_at DESC").all(companyId)
      : db.prepare("SELECT * FROM orcamentos ORDER BY created_at DESC").all()
    const orcamentoItens = db.prepare("SELECT * FROM orcamento_itens ORDER BY created_at DESC").all()
    // Buscar dados das tabelas que existem, com tratamento de erro para tabelas que podem não existir
    let linhasVenda: any[] = []
    try {
      linhasVenda = companyId
        ? db.prepare("SELECT * FROM linhas_venda WHERE companyId = ? ORDER BY createdAt DESC").all(companyId)
        : db.prepare("SELECT * FROM linhas_venda ORDER BY createdAt DESC").all()
    } catch (e) {
      console.warn('Tabela linhas_venda não existe:', e)
    }
    
    let acertos: any[] = []
    try {
      acertos = db.prepare("SELECT * FROM acertos ORDER BY created_at DESC").all()
    } catch (e) {
      console.warn('Tabela acertos não existe:', e)
    }
    
    let participantes: any[] = []
    try {
      participantes = db.prepare("SELECT * FROM participantes ORDER BY created_at DESC").all()
    } catch (e) {
      console.warn('Tabela participantes não existe:', e)
    }
    
    let despesasPendentes: any[] = []
    try {
      despesasPendentes = db.prepare("SELECT * FROM despesas_pendentes ORDER BY created_at DESC").all()
    } catch (e) {
      console.warn('Tabela despesas_pendentes não existe:', e)
    }
    
    let modalidades: any[] = []
    try {
      modalidades = db.prepare("SELECT * FROM modalidades ORDER BY created_at DESC").all()
    } catch (e) {
      console.warn('Tabela modalidades não existe:', e)
    }
    
    let taxas: any[] = []
    try {
      taxas = db.prepare("SELECT * FROM taxas ORDER BY created_at DESC").all()
    } catch (e) {
      console.warn('Tabela taxas não existe:', e)
    }
    
    let outrosNegocios: any[] = []
    try {
      outrosNegocios = db.prepare("SELECT * FROM outros_negocios ORDER BY created_at DESC").all()
    } catch (e) {
      console.warn('Tabela outros_negocios não existe:', e)
    }
    
    let pagamentosParciais: any[] = []
    try {
      pagamentosParciais = db.prepare("SELECT * FROM pagamentos_parciais ORDER by created_at DESC").all()
    } catch (e) {
      console.warn('Tabela pagamentos_parciais não existe:', e)
    }
    
    let valeMovimentos: any[] = []
    try {
      valeMovimentos = db.prepare("SELECT * FROM vale_movimentos ORDER BY created_at DESC").all()
    } catch (e) {
      console.warn('Tabela vale_movimentos não existe:', e)
    }
    const userPrefs = db.prepare("SELECT * FROM user_prefs").all()
    
    // Criar payload de backup
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      companyId,
      data: {
        empresas,
        clientes,
        produtos,
        orcamentos,
        orcamentoItens,
        linhasVenda,
        acertos,
        participantes,
        despesasPendentes,
        modalidades,
        taxas,
        outrosNegocios,
        pagamentosParciais,
        valeMovimentos,
        userPrefs,
        // Configurações da empresa atual
        config: companyId ? {
          currentEmpresaId: companyId
        } : {},
        // Sequência de orçamentos (se existir)
        seqOrcamento: orcamentos.length > 0 ? Math.max(...orcamentos.map((o: any) => o.numero || 0)) : 0
      }
    }
    
    return NextResponse.json(backup)
  } catch (error) {
    console.error('Error exporting backup:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}