import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

// Criar tabela acertos se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS acertos (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    titulo TEXT,
    observacoes TEXT,
    linhaIds TEXT, -- JSON array de IDs
    totalLucro REAL DEFAULT 0,
    totalDespesasRateio REAL DEFAULT 0,
    totalDespesasIndividuais REAL DEFAULT 0,
    totalLiquidoDistribuivel REAL DEFAULT 0,
    distribuicoes TEXT, -- JSON array
    despesas TEXT, -- JSON array
    ultimoRecebimentoBanco TEXT, -- JSON object
    status TEXT DEFAULT 'aberto',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export async function GET(request: NextRequest) {
  try {
    const acertos = db.prepare(`
      SELECT * FROM acertos 
      ORDER BY data DESC
    `).all()
    
    // Parse JSON fields
    const parsedAcertos = acertos.map((acerto: any) => ({
      ...acerto,
      linhaIds: acerto.linhaIds ? JSON.parse(acerto.linhaIds) : [],
      distribuicoes: acerto.distribuicoes ? JSON.parse(acerto.distribuicoes) : [],
      despesas: acerto.despesas ? JSON.parse(acerto.despesas) : [],
      ultimoRecebimentoBanco: acerto.ultimoRecebimentoBanco ? JSON.parse(acerto.ultimoRecebimentoBanco) : null
    }))
    
    return NextResponse.json(parsedAcertos)
  } catch (error) {
    console.error('Error fetching acertos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      data,
      titulo,
      observacoes,
      linhaIds = [],
      totalLucro = 0,
      totalDespesasRateio = 0,
      totalDespesasIndividuais = 0,
      totalLiquidoDistribuivel = 0,
      distribuicoes = [],
      despesas = [],
      ultimoRecebimentoBanco,
      status = 'aberto'
    } = body
    
    if (!data) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }
    
    const id = uuidv4()
    
    db.prepare(`
      INSERT INTO acertos (
        id, data, titulo, observacoes, linhaIds, totalLucro, totalDespesasRateio,
        totalDespesasIndividuais, totalLiquidoDistribuivel, distribuicoes, despesas,
        ultimoRecebimentoBanco, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data,
      titulo,
      observacoes,
      JSON.stringify(linhaIds),
      totalLucro,
      totalDespesasRateio,
      totalDespesasIndividuais,
      totalLiquidoDistribuivel,
      JSON.stringify(distribuicoes),
      JSON.stringify(despesas),
      ultimoRecebimentoBanco ? JSON.stringify(ultimoRecebimentoBanco) : null,
      status,
      new Date().toISOString(),
      new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating acerto:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}