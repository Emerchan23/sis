import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Check if acerto exists and get its data
    const acerto = db.prepare(`
      SELECT id, linhaIds FROM acertos WHERE id = ?
    `).get(id)
    
    if (!acerto) {
      return NextResponse.json({ error: 'Acerto não encontrado' }, { status: 404 })
    }
    
    // Parse linhaIds
    const linhaIds = (acerto as any).linhaIds ? JSON.parse((acerto as any).linhaIds) : []
    
    // Start transaction
    const transaction = db.transaction(() => {
      // Update all vendas (linhas_venda) back to "Pendente" status
      if (linhaIds.length > 0) {
        const placeholders = linhaIds.map(() => '?').join(',')
        const updateVendasQuery = `
          UPDATE linhas_venda 
          SET settlementStatus = 'Pendente'
          WHERE id IN (${placeholders})
        `
        db.prepare(updateVendasQuery).run(...linhaIds)
      }
      
      // Update despesas pendentes that were used in this acerto back to "pendente"
      db.prepare(`
        UPDATE despesas_pendentes 
        SET status = 'pendente', usedInAcertoId = NULL
        WHERE usedInAcertoId = ?
      `).run(id)
      
      // Delete the acerto
      db.prepare('DELETE FROM acertos WHERE id = ?').run(id)
    })
    
    // Execute transaction
    transaction()
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Acerto cancelado com sucesso',
      vendasRetornadas: linhaIds.length
    })
  } catch (error) {
    console.error('Error canceling acerto:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}