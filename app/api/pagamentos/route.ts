import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS pagamentos_parciais (
        id TEXT PRIMARY KEY,
        outro_negocio_id TEXT NOT NULL,
        data TEXT NOT NULL,
        valor REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (outro_negocio_id) REFERENCES outros_negocios (id)
      )
    `);

    const searchParams = request.nextUrl.searchParams;
    const outroNegocioId = searchParams.get('outro_negocio_id');
    
    let query = 'SELECT * FROM pagamentos_parciais WHERE 1=1';
    const params: any[] = [];
    
    if (outroNegocioId) {
      query += ' AND outro_negocio_id = ?';
      params.push(outroNegocioId);
    }
    
    query += ' ORDER BY data ASC';
    
    const pagamentos = db.prepare(query).all(...params);
    
    return NextResponse.json(pagamentos);
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
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
      outro_negocio_id,
      data,
      valor
    } = body;
    
    // Validation
    if (!outro_negocio_id || !data || !valor) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: outro_negocio_id, data, valor' },
        { status: 400 }
      );
    }
    
    const id = uuidv4();
    
    db.prepare(
      `INSERT INTO pagamentos_parciais (
        id, outro_negocio_id, data, valor
      ) VALUES (?, ?, ?, ?)`
    ).run(id, outro_negocio_id, data, valor);
    
    const novoPagamento = db.prepare('SELECT * FROM pagamentos_parciais WHERE id = ?').get(id);
    
    return NextResponse.json(novoPagamento, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
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
    
    const result = db.prepare('DELETE FROM pagamentos_parciais WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Pagamento não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Pagamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir pagamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}