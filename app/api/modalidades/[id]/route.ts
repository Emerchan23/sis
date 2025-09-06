import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Check if modalidade exists
    const existingModalidade = db.prepare('SELECT id FROM modalidades WHERE id = ?').get(id)
    if (!existingModalidade) {
      return NextResponse.json({ error: 'Modalidade não encontrada' }, { status: 404 })
    }
    
    // Soft delete - mark as inactive instead of hard delete
    db.prepare('UPDATE modalidades SET ativo = 0, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      id
    )
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting modalidade:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nome } = body
    
    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    
    // Check if modalidade exists
    const existingModalidade = db.prepare('SELECT id FROM modalidades WHERE id = ?').get(id)
    if (!existingModalidade) {
      return NextResponse.json({ error: 'Modalidade não encontrada' }, { status: 404 })
    }
    
    db.prepare(`
      UPDATE modalidades 
      SET nome = ?, updated_at = ?
      WHERE id = ?
    `).run(
      nome,
      new Date().toISOString(),
      id
    )
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating modalidade:', error)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Modalidade já existe' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}