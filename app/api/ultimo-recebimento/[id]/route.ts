import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { nome, valor, data_transacao, banco, observacoes } = body
    
    const now = new Date().toISOString()
    
    db.prepare(`
      UPDATE ultimo_recebimento 
      SET nome = ?, valor = ?, data_transacao = ?, banco = ?, observacoes = ?, updated_at = ?
      WHERE id = ?
    `).run(nome, valor, data_transacao, banco, observacoes, now, id)
    
    return NextResponse.json({ message: 'Último recebimento atualizado com sucesso' })
  } catch (error) {
    console.error('Error updating ultimo recebimento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    db.prepare('DELETE FROM ultimo_recebimento WHERE id = ?').run(id)
    
    return NextResponse.json({ message: 'Último recebimento deletado com sucesso' })
  } catch (error) {
    console.error('Error deleting ultimo recebimento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    const recebimento = db.prepare('SELECT * FROM ultimo_recebimento WHERE id = ?').get(id)
    
    if (!recebimento) {
      return NextResponse.json({ error: 'Último recebimento não encontrado' }, { status: 404 })
    }
    
    return NextResponse.json(recebimento)
  } catch (error) {
    console.error('Error fetching ultimo recebimento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}