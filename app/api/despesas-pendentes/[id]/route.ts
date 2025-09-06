import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    const despesa = db.prepare(`
      SELECT * FROM despesas_pendentes WHERE id = ?
    `).get(id)
    
    if (!despesa) {
      return NextResponse.json({ error: 'Despesa pendente não encontrada' }, { status: 404 })
    }
    
    return NextResponse.json(despesa)
  } catch (error) {
    console.error('Error fetching despesa pendente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    
    // Check if despesa exists
    const existingDespesa = db.prepare('SELECT id FROM despesas_pendentes WHERE id = ?').get(id)
    if (!existingDespesa) {
      return NextResponse.json({ error: 'Despesa pendente não encontrada' }, { status: 404 })
    }
    
    // Build update query dynamically
    const updateFields = []
    const values = []
    
    const allowedFields = [
      'descricao', 'valor', 'data_vencimento', 'tipo', 'participanteId', 
      'observacoes', 'status', 'usedInAcertoId'
    ]
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`)
        values.push(body[field])
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }
    
    // Add updated_at
    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    
    const query = `UPDATE despesas_pendentes SET ${updateFields.join(', ')} WHERE id = ?`
    db.prepare(query).run(...values)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating despesa pendente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // Check if despesa exists
    const existingDespesa = db.prepare('SELECT id FROM despesas_pendentes WHERE id = ?').get(id)
    if (!existingDespesa) {
      return NextResponse.json({ error: 'Despesa pendente não encontrada' }, { status: 404 })
    }
    
    db.prepare('DELETE FROM despesas_pendentes WHERE id = ?').run(id)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting despesa pendente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}