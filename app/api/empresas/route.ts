import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { uid } from '../../../lib/util'

export async function GET() {
  try {
    const empresas = db.prepare("SELECT * FROM empresas ORDER BY created_at DESC").all()
    return NextResponse.json(empresas)
  } catch (error) {
    console.error('Error fetching empresas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = uid()
    
    db.prepare(`
      INSERT INTO empresas (id, nome, created_at) 
      VALUES (?, ?, ?)
    `).run(
      id,
      body.nome,
      new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating empresa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}