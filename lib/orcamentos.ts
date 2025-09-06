"use client"

import { api, type Orcamento, type OrcamentoItem, type OrcamentoCliente } from "@/lib/api-client"

// Re-export types for compatibility
export type { Orcamento, OrcamentoItem, OrcamentoCliente }

// Public API using backend
export async function getOrcamentos(): Promise<Orcamento[]> {
  try {
    return await api.orcamentos.list()
  } catch (error) {
    console.error("Erro ao buscar orçamentos:", error)
    return []
  }
}

export function totalOrcamento(o: Pick<Orcamento, "itens">): number {
  return o.itens.reduce((sum, item) => sum + item.quantidade * item.valor_unitario - (item.desconto || 0), 0)
}

type SaveInput = Partial<Orcamento> & {
  // Additional fields for compatibility
  cliente_id?: string
  data_orcamento?: string
  // Legacy support
  data?: string
  cliente?: any
  // Ensure itens field is properly typed
  itens?: OrcamentoItem[]
  // Override numero to accept string only (consistent with Orcamento type)
  numero?: string
}

export async function saveOrcamento(input: SaveInput): Promise<Orcamento | null> {
  try {
    // Convert input to match API expectations
    const apiInput: Partial<Orcamento> = {
      ...input,
      // Keep numero as string to preserve format (e.g., "01/2025")
      numero: input.numero
    }
    
    if (input.id) {
      // Update existing
      await api.orcamentos.update(input.id, apiInput)
      // Return updated data by fetching the list again
      const all = await getOrcamentos()
      return all.find(o => o.id === input.id) || null
    } else {
      // Create new
      const result = await api.orcamentos.create(apiInput)
      // Return created data by fetching the list again
      const all = await getOrcamentos()
      return all.find(o => o.id === result.id) || null
    }
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error)
    return null
  }
}

export async function deleteOrcamento(id: string): Promise<boolean> {
  try {
    await api.orcamentos.delete(id)
    return true
  } catch (error) {
    console.error("Erro ao deletar orçamento:", error)
    return false
  }
}

export async function aprovarOrcamento(id: string): Promise<boolean> {
  try {
    await api.patch(`/api/orcamentos/${id}`, { status: "aprovado" })
    return true
  } catch (error) {
    console.error('Erro ao aprovar orçamento:', error)
    return false
  }
}

export async function desaprovarOrcamento(id: string): Promise<boolean> {
  try {
    await api.patch(`/api/orcamentos/${id}`, { status: "pendente" })
    return true
  } catch (error) {
    console.error('Erro ao desaprovar orçamento:', error)
    return false
  }
}

export function sanitizeOrcamentoForCustomer(o: Orcamento) {
  return {
    numero: o.numero,
    data: o.data,
    cliente: o.cliente,
    itens: o.itens.map((item) => ({
      descricao: item.descricao || "Produto",
      marca: item.marca || "",
      quantidade: item.quantidade,
      precoUnitario: item.valor_unitario,
      desconto: item.desconto || 0,
      total: item.quantidade * item.valor_unitario - (item.desconto || 0),
    })),
    observacoes: o.observacoes,
    total: totalOrcamento(o),
  }
}

// Legacy function for compatibility - now uses backend
export async function saveOrcamentoLocal(input: SaveInput): Promise<Orcamento | null> {
  return saveOrcamento(input)
}
