import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

// Criar tabela ultimo_recebimento se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS ultimo_recebimento (
    id TEXT PRIMARY KEY,
    nome TEXT,
    valor REAL,
    data_transacao TEXT,
    banco TEXT,
    observacoes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export async function GET() {
  try {
    const recebimentos = db.prepare(`
      SELECT * FROM ultimo_recebimento 
      ORDER BY created_at DESC
    `).all()
    
    return NextResponse.json(recebimentos)
  } catch (error) {
    console.error('Error fetching ultimo recebimento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, valor, data_transacao, banco, observacoes } = body
    
    const id = uuidv4()
    const now = new Date().toISOString()
    
    db.prepare(`
      INSERT INTO ultimo_recebimento (
        id, nome, valor, data_transacao, banco, observacoes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, nome, valor, data_transacao, banco, observacoes, now, now)
    
    return NextResponse.json({ id, message: 'Último recebimento salvo com sucesso' })
  } catch (error) {
    console.error('Error creating ultimo recebimento:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}