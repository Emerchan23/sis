import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import { uid } from '../../../lib/util'

// Helper function to get current company ID from user preferences
function getCurrentCompanyId(): string | null {
  const row = db.prepare("SELECT json FROM user_prefs WHERE userId=?").get("default") as { json: string } | undefined
  if (!row) return null
  
  try {
    const prefs = JSON.parse(row.json)
    return prefs.currentEmpresaId || null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const companyId = getCurrentCompanyId()
    if (!companyId) {
      return NextResponse.json([])
    }
    
    const clientes = db.prepare("SELECT * FROM clientes WHERE empresa_id = ? ORDER BY created_at DESC").all(companyId)
    
    // Map database fields to match the Cliente type
    const mappedClientes = clientes.map((cliente: any) => ({
      id: cliente.id,
      nome: cliente.nome,
      documento: cliente.cpf_cnpj,
      endereco: cliente.endereco,
      telefone: cliente.telefone,
      email: cliente.email,
      createdAt: cliente.created_at
    }))
    
    return NextResponse.json(mappedClientes)
  } catch (error) {
    console.error('Error fetching clientes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = getCurrentCompanyId()
    if (!companyId) {
      return NextResponse.json({ error: 'Empresa não selecionada' }, { status: 400 })
    }
    
    const body = await request.json()
    const id = uid()
    
    db.prepare(`
      INSERT INTO clientes (id, empresa_id, nome, cpf_cnpj, endereco, telefone, email, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      companyId,
      body.nome,
      body.documento || body.cpf_cnpj || null,
      body.endereco || null,
      body.telefone || null,
      body.email || null,
      new Date().toISOString()
    )
    
    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating cliente:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}