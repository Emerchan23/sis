import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../../lib/db'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { cor } = await request.json()
    
    const result = db.prepare('UPDATE linhas_venda SET cor = ? WHERE id = ?').run(cor, id)
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Linha not found' }, { status: 404 })
    }
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating linha color:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}