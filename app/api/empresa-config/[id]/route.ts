import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../../lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Buscar configuração da empresa no banco
    const empresa = db.prepare("SELECT * FROM empresas WHERE id = ?").get(id) as any
    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }
    
    // Retornar configuração padrão se não houver dados específicos
    const config = {
      razaoSocial: empresa.razao_social || "",
      cnpj: empresa.cnpj || "",
      endereco: empresa.endereco || "",
      email: empresa.email || "",
      telefone: empresa.telefone || "",
      logoUrl: empresa.logo_url || "",
      nomeDoSistema: empresa.nome_do_sistema || "LP IND",
      impostoPadrao: empresa.imposto_padrao || 10, // Valor padrão
      capitalPadrao: empresa.capital_padrao || 15,   // Valor padrão
      layoutOrcamento: empresa.layout_orcamento ? JSON.parse(empresa.layout_orcamento) : {}
    }
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching empresa config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Construir query dinâmica apenas com campos enviados
    const updates: string[] = []
    const values: any[] = []
    
    if (body.razaoSocial !== undefined) {
      updates.push('razao_social = ?')
      values.push(body.razaoSocial || null)
    }
    if (body.cnpj !== undefined) {
      updates.push('cnpj = ?')
      values.push(body.cnpj || null)
    }
    if (body.endereco !== undefined) {
      updates.push('endereco = ?')
      values.push(body.endereco || null)
    }
    if (body.email !== undefined) {
      updates.push('email = ?')
      values.push(body.email || null)
    }
    if (body.telefone !== undefined) {
      updates.push('telefone = ?')
      values.push(body.telefone || null)
    }
    if (body.logoUrl !== undefined) {
      updates.push('logo_url = ?')
      values.push(body.logoUrl || null)
    }
    if (body.nomeDoSistema !== undefined) {
      updates.push('nome_do_sistema = ?')
      values.push(body.nomeDoSistema || null)
    }
    if (body.impostoPadrao !== undefined) {
      updates.push('imposto_padrao = ?')
      values.push(body.impostoPadrao || null)
    }
    if (body.capitalPadrao !== undefined) {
      updates.push('capital_padrao = ?')
      values.push(body.capitalPadrao || null)
    }
    if (body.layoutOrcamento !== undefined) {
      updates.push('layout_orcamento = ?')
      values.push(body.layoutOrcamento ? JSON.stringify(body.layoutOrcamento) : null)
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ ok: true, message: 'No fields to update' })
    }
    
    // Sempre atualizar updated_at
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id) // WHERE id = ?
    
    const query = `UPDATE empresas SET ${updates.join(', ')} WHERE id = ?`
    db.prepare(query).run(...values)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating empresa config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}