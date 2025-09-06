import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS vale_movimentos (
        id TEXT PRIMARY KEY,
        cliente_id TEXT NOT NULL,
        data TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
        valor REAL NOT NULL,
        descricao TEXT,
        referencia_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const searchParams = request.nextUrl.searchParams;
    const clienteId = searchParams.get('cliente_id');
    const saldos = searchParams.get('saldos') === 'true';
    
    // If requesting saldos, calculate and return balances per client
    if (saldos) {
      const movimentos = db.prepare('SELECT cliente_id, tipo, valor FROM vale_movimentos').all();
      const saldosPorCliente: Record<string, number> = {};
      
      for (const mov of movimentos as any[]) {
        if (!saldosPorCliente[mov.cliente_id]) {
          saldosPorCliente[mov.cliente_id] = 0;
        }
        if (mov.tipo === 'credito') {
          saldosPorCliente[mov.cliente_id] += mov.valor;
        } else {
          saldosPorCliente[mov.cliente_id] -= mov.valor;
        }
      }
      
      return NextResponse.json(saldosPorCliente);
    }
    
    // Otherwise return movements
    let query = 'SELECT * FROM vale_movimentos WHERE 1=1';
    const params: any[] = [];
    
    if (clienteId) {
      query += ' AND cliente_id = ?';
      params.push(clienteId);
    }
    
    query += ' ORDER BY data DESC, created_at DESC';
    
    const movimentos = db.prepare(query).all(...params);
    
    return NextResponse.json(movimentos);
  } catch (error) {
    console.error('Erro ao buscar vales:', error);
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
      clienteId,
      data,
      tipo,
      valor,
      descricao,
      referenciaId
    } = body;
    
    // Validation
    if (!clienteId || !data || !tipo || !valor) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clienteId, data, tipo, valor' },
        { status: 400 }
      );
    }
    
    if (!['credito', 'debito'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo deve ser "credito" ou "debito"' },
        { status: 400 }
      );
    }
    
    const id = uuidv4();
    
    db.prepare(
      `INSERT INTO vale_movimentos (
        id, cliente_id, data, tipo, valor, descricao, referencia_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, clienteId, data, tipo, valor, descricao || null, referenciaId || null);
    
    const novoMovimento = db.prepare('SELECT * FROM vale_movimentos WHERE id = ?').get(id);
    
    return NextResponse.json(novoMovimento, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar vale:', error);
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
    
    const allowedFields = ['cliente_id', 'data', 'tipo', 'valor', 'descricao', 'referencia_id'];
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {} as any);
    
    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualização' },
        { status: 400 }
      );
    }
    
    const fields = Object.keys(filteredData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(filteredData);
    
    db.prepare(
      `UPDATE vale_movimentos SET ${fields} WHERE id = ?`
    ).run(...values, id);
    
    const movimentoAtualizado = db.prepare('SELECT * FROM vale_movimentos WHERE id = ?').get(id);
    
    return NextResponse.json(movimentoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar movimento:', error);
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
    const clienteId = searchParams.get('cliente_id');
    
    if (!id && !clienteId) {
      return NextResponse.json(
        { error: 'ID ou cliente_id é obrigatório para exclusão' },
        { status: 400 }
      );
    }
    
    if (clienteId) {
      // Delete all movements for a specific client
      const result = db.prepare('DELETE FROM vale_movimentos WHERE cliente_id = ?').run(clienteId);
      return NextResponse.json({ 
        message: 'Todos os movimentos do cliente foram excluídos com sucesso',
        deletedCount: result.changes
      });
    } else {
      // Delete a specific movement by ID
      db.prepare('DELETE FROM vale_movimentos WHERE id = ?').run(id);
      return NextResponse.json({ message: 'Movimento excluído com sucesso' });
    }
  } catch (error) {
    console.error('Erro ao excluir movimento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}