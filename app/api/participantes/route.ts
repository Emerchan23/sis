import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

// Criar tabela participantes se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS participantes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT 1,
    defaultPercent REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export async function GET(request: NextRequest) {
  try {
    const participantes = db.prepare(`
      SELECT * FROM participantes 
      WHERE ativo = 1 
      ORDER BY nome
    `).all()
    
    return NextResponse.json(participantes)
  } catch (error) {
    console.error('Error fetching participantes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, ativo = true, defaultPercent = 0 } = body
    
    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    
    const id = uuidv4()
    
    db.prepare(`
      INSERT INTO participantes (id, nome, ativo, defaultPercent, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      nome,
      ativo ? 1 : 0,
      defaultPercent,
      new Date().toISOString(),
      new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating participante:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}