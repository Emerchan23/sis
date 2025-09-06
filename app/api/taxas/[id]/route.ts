import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { nome, percentual } = body
    
    if (!nome || percentual === undefined) {
      return NextResponse.json({ error: 'Nome e percentual são obrigatórios' }, { status: 400 })
    }
    
    // Check if taxa exists
    const existingTaxa = db.prepare('SELECT id FROM taxas WHERE id = ?').get(id)
    if (!existingTaxa) {
      return NextResponse.json({ error: 'Taxa não encontrada' }, { status: 404 })
    }
    
    db.prepare(`
      UPDATE taxas 
      SET nome = ?, percentual = ?, updated_at = ?
      WHERE id = ?
    `).run(
      nome,
      percentual,
      new Date().toISOString(),
      id
    )
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating taxa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // Check if taxa exists
    const existingTaxa = db.prepare('SELECT id FROM taxas WHERE id = ?').get(id)
    if (!existingTaxa) {
      return NextResponse.json({ error: 'Taxa não encontrada' }, { status: 404 })
    }
    
    // Soft delete - mark as inactive instead of hard delete
    db.prepare('UPDATE taxas SET ativo = 0, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      id
    )
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting taxa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}