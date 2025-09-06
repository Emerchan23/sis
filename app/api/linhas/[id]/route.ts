import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    
    // Build dynamic update query based on provided fields
    const fields = Object.keys(body).filter(key => key !== 'id')
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => body[field])
    values.push(id) // for WHERE clause
    
    const query = `UPDATE linhas_venda SET ${setClause} WHERE id = ?`
    
    const result = db.prepare(query).run(...values)
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Linha not found' }, { status: 404 })
    }
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating linha:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    const result = db.prepare('DELETE FROM linhas_venda WHERE id = ?').run(id)
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Linha not found' }, { status: 404 })
    }
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting linha:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}