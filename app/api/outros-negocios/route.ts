import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS outros_negocios (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        data_transacao TEXT NOT NULL,
        cliente_id TEXT,
        categoria TEXT,
        status TEXT DEFAULT 'ativo',
        forma_pagamento TEXT,
        observacoes TEXT,
        anexos TEXT,
        juros_ativo INTEGER DEFAULT 0,
        juros_mes_percent REAL DEFAULT 0,
        multa_ativa INTEGER DEFAULT 0,
        multa_percent REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add multa_ativa column if it doesn't exist (for existing databases)
    try {
      db.exec(`ALTER TABLE outros_negocios ADD COLUMN multa_ativa INTEGER DEFAULT 0`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Add multa_percent column if it doesn't exist (for existing databases)
    try {
      db.exec(`ALTER TABLE outros_negocios ADD COLUMN multa_percent REAL DEFAULT 0`);
    } catch (error) {
      // Column already exists, ignore error
    }

    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo');
    const clienteId = searchParams.get('cliente_id');
    const categoria = searchParams.get('categoria');
    const status = searchParams.get('status');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    
    let query = 'SELECT * FROM outros_negocios WHERE 1=1';
    const params: any[] = [];
    
    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }
    
    if (clienteId) {
      query += ' AND cliente_id = ?';
      params.push(clienteId);
    }
    
    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (dataInicio) {
      query += ' AND data_transacao >= ?';
      params.push(dataInicio);
    }
    
    if (dataFim) {
      query += ' AND data_transacao <= ?';
      params.push(dataFim);
    }
    
    query += ' ORDER BY data_transacao DESC';
    
    const outrosNegocios = db.prepare(query).all(...params);
    
    // Map database fields to frontend format
    const mappedNegocios = outrosNegocios.map((negocio: any) => ({
      ...negocio,
      pessoa: negocio.cliente_id,
      data: negocio.data_transacao,
      jurosAtivo: Boolean(negocio.juros_ativo),
      jurosMesPercent: negocio.juros_mes_percent || 0,
      multaAtiva: Boolean(negocio.multa_ativa),
      multaPercent: negocio.multa_percent || 0
    }));
    
    return NextResponse.json(mappedNegocios);
  } catch (error) {
    console.error('Erro ao buscar outros negócios:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      tipo,
      descricao,
      valor,
      data_transacao,
      cliente_id,
      categoria,
      forma_pagamento,
      observacoes,
      anexos,
      juros_ativo,
      juros_mes_percent,
      multa_ativa,
      multa_percent
    } = body;
    
    // Validation
    if (!tipo || !descricao || !valor || !data_transacao) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: tipo, descricao, valor, data_transacao' },
        { status: 400 }
      );
    }
    
    const id = uuidv4();
    
    db.prepare(
      `INSERT INTO outros_negocios (
        id, tipo, descricao, valor, data_transacao, cliente_id, 
        categoria, forma_pagamento, observacoes, anexos,
        juros_ativo, juros_mes_percent, multa_ativa, multa_percent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, tipo, descricao, valor, data_transacao, cliente_id, categoria, forma_pagamento, observacoes, anexos, juros_ativo || 0, juros_mes_percent || 0, multa_ativa || 0, multa_percent || 0);
    
    const novoNegocio = db.prepare('SELECT * FROM outros_negocios WHERE id = ?').get(id);
    
    return NextResponse.json(novoNegocio, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar outro negócio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório para atualização' },
        { status: 400 }
      );
    }
    
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    
    db.prepare(
      `UPDATE outros_negocios SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(...values, id);
    
    const negocioAtualizado = db.prepare('SELECT * FROM outros_negocios WHERE id = ?').get(id);
    
    return NextResponse.json(negocioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar outro negócio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório para exclusão' },
        { status: 400 }
      );
    }
    
    db.prepare('DELETE FROM outros_negocios WHERE id = ?').run(id);
    
    return NextResponse.json({ message: 'Outro negócio excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir outro negócio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}