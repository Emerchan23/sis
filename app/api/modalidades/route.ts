import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

// Criar tabela modalidades se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS modalidades (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export async function GET(request: NextRequest) {
  try {
    const modalidades = db.prepare(`
      SELECT * FROM modalidades 
      WHERE ativo = 1 
      ORDER BY nome
    `).all()
    
    return NextResponse.json(modalidades)
  } catch (error) {
    console.error('Error fetching modalidades:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome } = body
    
    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    
    const id = uuidv4()
    
    db.prepare(`
      INSERT INTO modalidades (id, nome, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(
      id,
      nome,
      new Date().toISOString(),
      new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating modalidade:', error)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Modalidade já existe' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}