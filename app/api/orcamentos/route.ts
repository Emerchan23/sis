import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS orcamentos (
        id TEXT PRIMARY KEY,
        numero TEXT NOT NULL UNIQUE,
        cliente_id TEXT NOT NULL,
        data_orcamento TEXT NOT NULL,
        data_validade TEXT,
        valor_total REAL NOT NULL DEFAULT 0,
        descricao TEXT,
        status TEXT DEFAULT 'pendente',
        observacoes TEXT,
        condicoes_pagamento TEXT,
        prazo_entrega TEXT,
        vendedor_id TEXT,
        desconto REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orcamento_itens table for line items
    db.exec(`
      CREATE TABLE IF NOT EXISTS orcamento_itens (
        id TEXT PRIMARY KEY,
        orcamento_id TEXT NOT NULL,
        produto_id TEXT,
        descricao TEXT NOT NULL,
        marca TEXT,
        quantidade REAL NOT NULL,
        valor_unitario REAL NOT NULL,
        valor_total REAL NOT NULL,
        observacoes TEXT,
        link_ref TEXT,
        custo_ref REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (orcamento_id) REFERENCES orcamentos (id)
      )
    `);

    const searchParams = request.nextUrl.searchParams;
    const clienteId = searchParams.get('cliente_id');
    const status = searchParams.get('status');
    const vendedorId = searchParams.get('vendedor_id');
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const incluirItens = searchParams.get('incluir_itens') === 'true';
    
    let query = `
      SELECT 
        o.*,
        c.nome as cliente_nome,
        c.cpf_cnpj as cliente_documento,
        c.telefone as cliente_telefone,
        c.email as cliente_email,
        c.endereco as cliente_endereco
      FROM orcamentos o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (clienteId) {
      query += ' AND cliente_id = ?';
      params.push(clienteId);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (vendedorId) {
      query += ' AND vendedor_id = ?';
      params.push(vendedorId);
    }
    
    if (dataInicio) {
      query += ' AND data_orcamento >= ?';
      params.push(dataInicio);
    }
    
    if (dataFim) {
      query += ' AND data_orcamento <= ?';
      params.push(dataFim);
    }
    
    query += ' ORDER BY data_orcamento DESC';
    
    const orcamentos = db.prepare(query).all(...params) as any[];

    // Transform the data to match the expected frontend format
    const transformedOrcamentos = orcamentos.map(orcamento => {
      const transformed = {
        id: orcamento.id,
        numero: orcamento.numero,
        data: orcamento.data_orcamento,
        cliente: {
          id: orcamento.cliente_id,
          nome: orcamento.cliente_nome || '',
          documento: orcamento.cliente_documento || null,
          telefone: orcamento.cliente_telefone || null,
          email: orcamento.cliente_email || null,
          endereco: orcamento.cliente_endereco || null
        },
        valor_total: orcamento.valor_total,
        status: orcamento.status,
        observacoes: orcamento.observacoes,
        condicoes_pagamento: orcamento.condicoes_pagamento,
        prazo_entrega: orcamento.prazo_entrega,
        vendedor_id: orcamento.vendedor_id,
        desconto: orcamento.desconto,
        createdAt: orcamento.created_at,
        updatedAt: orcamento.updated_at,
        itens: [] // Will be populated below if requested
      };

      return transformed;
    });

    // Include items if requested
    if (incluirItens) {
      for (const orcamento of transformedOrcamentos) {
        const itens = db.prepare(
          'SELECT * FROM orcamento_itens WHERE orcamento_id = ? ORDER BY created_at'
        ).all(orcamento.id);
        
        // Transform items to match expected format
        (orcamento as any).itens = itens.map((item: any) => ({
          id: item.id,
          produto_id: item.produto_id,
          descricao: item.descricao,
          marca: item.marca || '',
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          link_ref: item.link_ref,
          custo_ref: item.custo_ref,
          desconto: 0 // Default value, can be added to schema later
        }));
      }
    }

    return NextResponse.json(transformedOrcamentos);
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
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
      numero,
      cliente_id,
      data_orcamento,
      data_validade,
      descricao,
      observacoes,
      condicoes_pagamento,
      prazo_entrega,
      vendedor_id,
      desconto,
      itens
    } = body;
    
    // Validation
    if (!numero || !cliente_id || !data_orcamento) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: numero, cliente_id, data_orcamento' },
        { status: 400 }
      );
    }
    
    const id = uuidv4();
    
    // Calculate total value from items
    let valorTotal = 0;
    if (itens && Array.isArray(itens)) {
      valorTotal = itens.reduce((total: number, item: any) => {
        const quantidade = Number(item.quantidade) || 0;
        const valorUnitario = Number(item.valor_unitario) || 0;
        return total + (quantidade * valorUnitario);
      }, 0);
    }
    
    // Ensure valorTotal is a valid number
    valorTotal = Number(valorTotal) || 0;
    
    // Apply discount
    if (desconto) {
      valorTotal = valorTotal - (valorTotal * (desconto / 100));
    }
    
    // Verificar se o número já existe e gerar um novo se necessário
    let finalNumero = numero;
    const existingOrcamento = db.prepare('SELECT numero FROM orcamentos WHERE numero = ?').get(numero);
    
    if (existingOrcamento) {
      // Se o número já existe, gerar um novo baseado no ano atual
      const currentYear = new Date().getFullYear();
      const orcamentosDoAno = db.prepare(
        'SELECT numero FROM orcamentos WHERE numero LIKE ?'
      ).all(`%/${currentYear}`);
      
      let maiorNumero = 0;
      orcamentosDoAno.forEach((orc: any) => {
        const partes = orc.numero.split('/');
        if (partes.length === 2) {
          const num = parseInt(partes[0]);
          if (!isNaN(num) && num > maiorNumero) {
            maiorNumero = num;
          }
        }
      });
      
      const proximoNumero = maiorNumero + 1;
      const numeroFormatado = proximoNumero.toString().padStart(2, '0');
      finalNumero = `${numeroFormatado}/${currentYear}`;
    }
    
    // Insert orcamento
    db.prepare(
      `INSERT INTO orcamentos (
        id, numero, cliente_id, data_orcamento, data_validade, valor_total,
        descricao, observacoes, condicoes_pagamento, prazo_entrega, 
        vendedor_id, desconto
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, finalNumero, cliente_id, data_orcamento, data_validade, valorTotal, 
       descricao, observacoes, condicoes_pagamento, prazo_entrega, vendedor_id, desconto);
    
    // Insert items if provided
    if (itens && Array.isArray(itens)) {
      for (const item of itens) {
        const itemId = uuidv4();
        const valorTotalItem = item.quantidade * item.valor_unitario;
        
        db.prepare(
          `INSERT INTO orcamento_itens (
            id, orcamento_id, produto_id, descricao, marca, quantidade,
            valor_unitario, valor_total, observacoes, link_ref, custo_ref
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(itemId, id, item.produto_id, item.descricao, item.marca, item.quantidade,
           item.valor_unitario, valorTotalItem, item.observacoes, item.link_ref, item.custo_ref);
      }
    }
    
    // Get the complete orcamento with items
    const novoOrcamento = db.prepare('SELECT * FROM orcamentos WHERE id = ?').get(id) as any;
    const itensOrcamento = db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id = ?').all(id);
    novoOrcamento.itens = itensOrcamento;
    
    return NextResponse.json(novoOrcamento, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, itens, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório para atualização' },
        { status: 400 }
      );
    }
    
    // Update orcamento
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    if (fields) {
      db.prepare(
        `UPDATE orcamentos SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(...values);
    }
    
    // Update items if provided
    if (itens && Array.isArray(itens)) {
      // Delete existing items
      db.prepare('DELETE FROM orcamento_itens WHERE orcamento_id = ?').run(id);
      
      // Insert new items
      let valorTotal = 0;
      for (const item of itens) {
        const itemId = uuidv4();
        const valorTotalItem = item.quantidade * item.valor_unitario;
        valorTotal += valorTotalItem;
        
        db.prepare(
          `INSERT INTO orcamento_itens (
            id, orcamento_id, produto_id, descricao, quantidade, 
            valor_unitario, valor_total, observacoes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(itemId, id, item.produto_id, item.descricao, item.quantidade, 
           item.valor_unitario, valorTotalItem, item.observacoes);
      }
      
      // Update total value
      db.prepare('UPDATE orcamentos SET valor_total = ? WHERE id = ?').run(valorTotal, id);
    }
    
    const orcamentoAtualizado = db.prepare('SELECT * FROM orcamentos WHERE id = ?').get(id) as any;
    const itensOrcamento = db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id = ?').all(id);
    orcamentoAtualizado.itens = itensOrcamento;
    
    return NextResponse.json(orcamentoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar orçamento:', error);
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
    
    // Delete items first (foreign key constraint)
    db.prepare('DELETE FROM orcamento_itens WHERE orcamento_id = ?').run(id);
    
    // Delete orcamento
    db.prepare('DELETE FROM orcamentos WHERE id = ?').run(id);
    
    return NextResponse.json({ message: 'Orçamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}