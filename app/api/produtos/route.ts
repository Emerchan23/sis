import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { uid } from '../../../lib/util'

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

export async function GET() {
  try {
    const companyId = getCurrentCompanyId()
    if (!companyId) {
      return NextResponse.json([])
    }
    
    const produtos = db.prepare("SELECT * FROM produtos WHERE empresa_id = ? ORDER BY created_at DESC").all(companyId)
    return NextResponse.json(produtos)
  } catch (error) {
    console.error('Error fetching produtos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = getCurrentCompanyId()
    if (!companyId) {
      return NextResponse.json({ error: 'Empresa não selecionada' }, { status: 400 })
    }
    
    const body = await request.json()
    const id = uid()
    
    db.prepare(`
      INSERT INTO produtos (id, empresa_id, nome, preco, categoria, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      companyId,
      body.nome,
      body.preco,
      body.categoria || null,
      new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating produto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}