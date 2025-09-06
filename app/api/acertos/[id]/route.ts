import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    const acerto = db.prepare(`
      SELECT * FROM acertos WHERE id = ?
    `).get(id)
    
    if (!acerto) {
      return NextResponse.json({ error: 'Acerto não encontrado' }, { status: 404 })
    }
    
    // Parse JSON fields
    const parsedAcerto = {
      ...acerto,
      linhaIds: (acerto as any).linhaIds ? JSON.parse((acerto as any).linhaIds) : [],
      distribuicoes: (acerto as any).distribuicoes ? JSON.parse((acerto as any).distribuicoes) : [],
      despesas: (acerto as any).despesas ? JSON.parse((acerto as any).despesas) : [],
      ultimoRecebimentoBanco: (acerto as any).ultimoRecebimentoBanco ? JSON.parse((acerto as any).ultimoRecebimentoBanco) : null
    }
    
    return NextResponse.json(parsedAcerto)
  } catch (error) {
    console.error('Error fetching acerto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    
    // Check if acerto exists
    const existingAcerto = db.prepare('SELECT id FROM acertos WHERE id = ?').get(id)
    if (!existingAcerto) {
      return NextResponse.json({ error: 'Acerto não encontrado' }, { status: 404 })
    }
    
    // Build update query dynamically
    const updateFields = []
    const values = []
    
    const allowedFields = [
      'data', 'titulo', 'observacoes', 'linhaIds', 'totalLucro', 'totalDespesasRateio',
      'totalDespesasIndividuais', 'totalLiquidoDistribuivel', 'distribuicoes', 'despesas',
      'ultimoRecebimentoBanco', 'status'
    ]
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`)
        if (field === 'linhaIds' || field === 'distribuicoes' || field === 'despesas') {
          values.push(JSON.stringify(body[field]))
        } else if (field === 'ultimoRecebimentoBanco') {
          values.push(body[field] ? JSON.stringify(body[field]) : null)
        } else {
          values.push(body[field])
        }
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }
    
    // Add updated_at
    updateFields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    
    const query = `UPDATE acertos SET ${updateFields.join(', ')} WHERE id = ?`
    db.prepare(query).run(...values)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating acerto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // Check if acerto exists
    const existingAcerto = db.prepare('SELECT id FROM acertos WHERE id = ?').get(id)
    if (!existingAcerto) {
      return NextResponse.json({ error: 'Acerto não encontrado' }, { status: 404 })
    }
    
    db.prepare('DELETE FROM acertos WHERE id = ?').run(id)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting acerto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}