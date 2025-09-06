import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { merge = false } = body
    
    // Verificar se o body é um backup válido
    if (!body || !body.data || !body.version) {
      return NextResponse.json({ error: 'Dados de backup inválidos' }, { status: 400 })
    }
    
    const { data } = body
    
    // Se não for merge, limpar dados existentes
    if (!merge) {
      // Limpar todas as tabelas (exceto user_prefs se não estiver no backup)
      const tables = [
        'orcamento_itens',
        'orcamentos', 
        'produtos',
        'clientes',
        'linhas_venda',
        'acertos',
        'participantes',
        'despesas_pendentes',
        'modalidades',
        'taxas',
        'outros_negocios'
      ]
      
      for (const table of tables) {
        try {
          db.prepare(`DELETE FROM ${table}`).run()
        } catch (e) {
          console.warn(`Tabela ${table} não existe:`, e)
        }
      }
      
      // Tentar deletar tabelas opcionais que podem não existir
      const optionalTables = ['pagamentos_parciais', 'vale_movimentos']
      for (const table of optionalTables) {
        try {
          db.prepare(`DELETE FROM ${table}`).run()
        } catch (e) {
          console.warn(`Tabela opcional ${table} não existe:`, e)
        }
      }
      
      // Limpar empresas apenas se houver dados de empresas no backup
      if (data.empresas && data.empresas.length > 0) {
        db.prepare('DELETE FROM empresas').run()
      }
    }
    
    // Função helper para inserir dados
    const insertData = (tableName: string, records: any[]) => {
      if (!records || records.length === 0) return
      
      const firstRecord = records[0]
      const columns = Object.keys(firstRecord)
      const placeholders = columns.map(() => '?').join(', ')
      const columnNames = columns.join(', ')
      
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${tableName} (${columnNames}) VALUES (${placeholders})`)
      
      for (const record of records) {
        const values = columns.map(col => record[col])
        try {
          stmt.run(...values)
        } catch (error) {
          console.warn(`Erro ao inserir registro na tabela ${tableName}:`, error)
        }
      }
    }
    
    // Importar dados na ordem correta (respeitando dependências)
    if (data.empresas) insertData('empresas', data.empresas)
    if (data.clientes) insertData('clientes', data.clientes)
    if (data.produtos) insertData('produtos', data.produtos)
    if (data.orcamentos) insertData('orcamentos', data.orcamentos)
    if (data.orcamentoItens) insertData('orcamento_itens', data.orcamentoItens)
    if (data.linhasVenda) insertData('linhas_venda', data.linhasVenda)
    if (data.acertos) insertData('acertos', data.acertos)
    if (data.participantes) insertData('participantes', data.participantes)
    if (data.despesasPendentes) insertData('despesas_pendentes', data.despesasPendentes)
    if (data.modalidades) insertData('modalidades', data.modalidades)
    if (data.taxas) insertData('taxas', data.taxas)
    if (data.outrosNegocios) insertData('outros_negocios', data.outrosNegocios)
    if (data.pagamentosParciais) insertData('pagamentos_parciais', data.pagamentosParciais)
    if (data.valeMovimentos) insertData('vale_movimentos', data.valeMovimentos)
    
    // Importar preferências do usuário
    if (data.userPrefs) {
      for (const pref of data.userPrefs) {
        db.prepare('INSERT OR REPLACE INTO user_prefs (userId, json) VALUES (?, ?)').run(
          pref.userId,
          pref.json
        )
      }
    }
    
    // Restaurar configuração da empresa atual se disponível
    if (data.config && data.config.currentEmpresaId) {
      const currentPrefs = {
        currentEmpresaId: data.config.currentEmpresaId
      }
      
      db.prepare('INSERT OR REPLACE INTO user_prefs (userId, json) VALUES (?, ?)').run(
        'default',
        JSON.stringify(currentPrefs)
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      message: merge ? 'Dados mesclados com sucesso' : 'Backup restaurado com sucesso'
    })
    
  } catch (error) {
    console.error('Error importing backup:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}