import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório para exclusão' },
        { status: 400 }
      );
    }
    
    // Check if movement exists
    const movimento = db.prepare('SELECT * FROM vale_movimentos WHERE id = ?').get(id);
    
    if (!movimento) {
      return NextResponse.json(
        { error: 'Movimento não encontrado' },
        { status: 404 }
      );
    }
    
    db.prepare('DELETE FROM vale_movimentos WHERE id = ?').run(id);
    
    return NextResponse.json({ ok: true, message: 'Movimento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir movimento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }
    
    const movimento = db.prepare('SELECT * FROM vale_movimentos WHERE id = ?').get(id);
    
    if (!movimento) {
      return NextResponse.json(
        { error: 'Movimento não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(movimento);
  } catch (error) {
    console.error('Erro ao buscar movimento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório para atualização' },
        { status: 400 }
      );
    }
    
    // Check if movement exists
    const movimento = db.prepare('SELECT * FROM vale_movimentos WHERE id = ?').get(id);
    
    if (!movimento) {
      return NextResponse.json(
        { error: 'Movimento não encontrado' },
        { status: 404 }
      );
    }
    
    // Only allow updating certain fields
    const allowedFields = ['data', 'tipo', 'valor', 'descricao', 'referencia_id'];
    const updateData = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {} as any);
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualização' },
        { status: 400 }
      );
    }
    
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    
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