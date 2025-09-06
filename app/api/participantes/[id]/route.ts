import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { nome, ativo, defaultPercent } = body
    
    // Check if participante exists
    const existingParticipante = db.prepare('SELECT id FROM participantes WHERE id = ?').get(id)
    if (!existingParticipante) {
      return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
    }
    
    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    
    if (nome !== undefined) {
      updates.push('nome = ?')
      values.push(nome)
    }
    
    if (ativo !== undefined) {
      updates.push('ativo = ?')
      values.push(ativo ? 1 : 0)
    }
    
    if (defaultPercent !== undefined) {
      updates.push('defaultPercent = ?')
      values.push(defaultPercent)
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }
    
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    
    const query = `UPDATE participantes SET ${updates.join(', ')} WHERE id = ?`
    db.prepare(query).run(...values)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating participante:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // Check if participante exists
    const existingParticipante = db.prepare('SELECT id FROM participantes WHERE id = ?').get(id)
    if (!existingParticipante) {
      return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
    }
    
    // Soft delete - mark as inactive instead of hard delete
    db.prepare('UPDATE participantes SET ativo = 0, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      id
    )
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting participante:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}