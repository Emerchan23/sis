import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Verificar se a empresa existe
    const empresa = db.prepare("SELECT * FROM empresas WHERE id = ?").get(id)
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }
    
    // Atualizar dados básicos da empresa
    db.prepare(`
      UPDATE empresas 
      SET nome = ?, razao_social = ?, cnpj = ?, endereco = ?, telefone = ?, email = ?, logo_url = ?, nome_do_sistema = ?, updated_at = ?
      WHERE id = ?
    `).run(
      body.nome || 'Minha Empresa',
      body.razaoSocial || null,
      body.cnpj || null,
      body.endereco || null,
      body.telefone || null,
      body.email || null,
      body.logoUrl || null,
      body.nomeDoSistema || 'LP IND',
      new Date().toISOString(),
      id
    )
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating empresa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Verificar se a empresa existe
    const empresa = db.prepare("SELECT * FROM empresas WHERE id = ?").get(id)
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }
    
    // Deletar empresa
    db.prepare("DELETE FROM empresas WHERE id = ?").run(id)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting empresa:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}