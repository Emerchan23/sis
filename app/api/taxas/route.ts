import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

// Criar tabela taxas se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS taxas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    percentual REAL NOT NULL,
    tipo TEXT NOT NULL, -- 'capital' ou 'imposto'
    ativo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    
    let query = 'SELECT * FROM taxas WHERE ativo = 1'
    const params: any[] = []
    
    if (tipo) {
      query += ' AND tipo = ?'
      params.push(tipo)
    }
    
    query += ' ORDER BY nome'
    
    const taxas = db.prepare(query).all(...params)
    
    return NextResponse.json(taxas)
  } catch (error) {
    console.error('Error fetching taxas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, percentual, tipo } = body
    
    if (!nome || percentual === undefined || !tipo) {
      return NextResponse.json({ error: 'Nome, percentual e tipo são obrigatórios' }, { status: 400 })
    }
    
    const id = uuidv4()
    
    db.prepare(`
      INSERT INTO taxas (id, nome, percentual, tipo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      nome,
      percentual,
      tipo,
      new Date().toISOString(),
      new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating taxa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}