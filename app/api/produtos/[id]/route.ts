import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

// Helper function to get current company ID from user preferences
function getCurrentCompanyId(): string | null {
  const row = db.prepare("SELECT json FROM user_prefs WHERE userId=?").get("default") as { json: string } | undefined
  if (!row) return null
  
  try {
    const prefs = JSON.parse(row.json)
    return prefs.currentEmpresaId || null
  } catch {
    return null
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = getCurrentCompanyId()
    if (!companyId) {
      return NextResponse.json({ error: 'Empresa não selecionada' }, { status: 400 })
    }
    
    const body = await request.json()
    const { id } = params
    
    db.prepare(`
      UPDATE produtos 
      SET nome=?, preco=?, categoria=?, updated_at=?
      WHERE id=? AND empresa_id=?
    `).run(
      body.nome,
      body.preco,
      body.categoria || null,
      new Date().toISOString(),
      id,
      companyId
    )
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating produto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const companyId = getCurrentCompanyId()
    if (!companyId) {
      return NextResponse.json({ error: 'Empresa não selecionada' }, { status: 400 })
    }
    
    const { id } = params
    
    db.prepare("DELETE FROM produtos WHERE id = ? AND empresa_id = ?").run(id, companyId)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting produto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}