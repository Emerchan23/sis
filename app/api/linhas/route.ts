import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { v4 as uuidv4 } from 'uuid'

// Criar tabela linhas_venda se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS linhas_venda (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    dataPedido TEXT NOT NULL,
    numeroOF TEXT,
    numeroDispensa TEXT,
    cliente TEXT,
    produto TEXT,
    modalidade TEXT,
    valorVenda REAL NOT NULL DEFAULT 0,
    taxaCapitalPerc REAL NOT NULL DEFAULT 0,
    taxaCapitalVl REAL NOT NULL DEFAULT 0,
    taxaImpostoPerc REAL NOT NULL DEFAULT 0,
    taxaImpostoVl REAL NOT NULL DEFAULT 0,
    custoMercadoria REAL NOT NULL DEFAULT 0,
    somaCustoFinal REAL NOT NULL DEFAULT 0,
    lucroValor REAL NOT NULL DEFAULT 0,
    lucroPerc REAL NOT NULL DEFAULT 0,
    dataRecebimento TEXT,
    paymentStatus TEXT NOT NULL DEFAULT 'pendente',
    settlementStatus TEXT,
    acertoId TEXT,
    cor TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

export async function GET(request: NextRequest) {
  try {
    const linhas = db.prepare(`
      SELECT * FROM linhas_venda
      ORDER BY dataPedido DESC
    `).all()
    
    return NextResponse.json(linhas)
  } catch (error) {
    console.error('Error fetching linhas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = uuidv4()
    
    const {
      companyId,
      dataPedido,
      numeroOF,
      numeroDispensa,
      cliente,
      produto,
      modalidade,
      valorVenda,
      taxaCapitalPerc,
      taxaCapitalVl,
      taxaImpostoPerc,
      taxaImpostoVl,
      custoMercadoria,
      somaCustoFinal,
      lucroValor,
      lucroPerc,
      dataRecebimento,
      paymentStatus,
      settlementStatus,
      acertoId,
      cor
    } = body
    
    db.prepare(`
      INSERT INTO linhas_venda (
        id, companyId, dataPedido, numeroOF, numeroDispensa, cliente, produto, modalidade,
        valorVenda, taxaCapitalPerc, taxaCapitalVl, taxaImpostoPerc, taxaImpostoVl,
        custoMercadoria, somaCustoFinal, lucroValor, lucroPerc, dataRecebimento,
        paymentStatus, settlementStatus, acertoId, cor, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, companyId, dataPedido, numeroOF, numeroDispensa, cliente, produto, modalidade,
      valorVenda || 0, taxaCapitalPerc || 0, taxaCapitalVl || 0, taxaImpostoPerc || 0, taxaImpostoVl || 0,
      custoMercadoria || 0, somaCustoFinal || 0, lucroValor || 0, lucroPerc || 0, dataRecebimento,
      paymentStatus || 'pendente', settlementStatus, acertoId, cor, new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating linha:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}