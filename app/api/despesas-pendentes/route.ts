import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

// Criar tabela despesas_pendentes se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS despesas_pendentes (
    id TEXT PRIMARY KEY,
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    data_vencimento TEXT,
    categoria TEXT,
    tipo TEXT DEFAULT 'individual', -- 'individual' ou 'rateio'
    status TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'cancelado', 'usada'
    observacoes TEXT,
    participanteId TEXT,
    usedInAcertoId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Adicionar colunas se não existirem (para compatibilidade com bancos existentes)
try {
  db.exec(`ALTER TABLE despesas_pendentes ADD COLUMN participanteId TEXT;`);
} catch (e) {
  // Coluna já existe
}
try {
  db.exec(`ALTER TABLE despesas_pendentes ADD COLUMN usedInAcertoId TEXT;`);
} catch (e) {
  // Coluna já existe
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tipo = searchParams.get('tipo')
    
    let query = 'SELECT * FROM despesas_pendentes WHERE 1=1'
    const params: any[] = []
    
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    
    if (tipo) {
      query += ' AND tipo = ?'
      params.push(tipo)
    }
    
    query += ' ORDER BY data_vencimento ASC, created_at DESC'
    
    const despesas = db.prepare(query).all(...params)
    
    return NextResponse.json(despesas)
  } catch (error) {
    console.error('Error fetching despesas pendentes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      descricao,
      valor,
      data_vencimento,
      categoria,
      tipo = 'individual',
      status = 'pendente',
      observacoes,
      participanteId
    } = body
    
    if (!descricao || valor === undefined) {
      return NextResponse.json({ error: 'Descrição e valor são obrigatórios' }, { status: 400 })
    }
    
    const id = uuidv4()
    
    db.prepare(`
      INSERT INTO despesas_pendentes (
        id, descricao, valor, data_vencimento, categoria, tipo, status, observacoes, participanteId, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      descricao,
      valor,
      data_vencimento,
      categoria,
      tipo,
      status,
      observacoes,
      participanteId,
      new Date().toISOString(),
      new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating despesa pendente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}