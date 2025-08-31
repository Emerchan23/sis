"use client"

import { api } from "@/lib/api-client"
import { ERP_CHANGED_EVENT } from "@/lib/data-store"

export type ValeMovimento = {
  id: string
  clienteId: string
  data: string
  tipo: "credito" | "debito"
  valor: number
  descricao?: string
  referenciaId?: string // opcional: id de venda/recebimento
}

function dispatchChange() {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ERP_CHANGED_EVENT, { detail: { key: "vales" } }))
    }
  } catch {
    // ignore
  }
}

export async function getMovimentos(): Promise<ValeMovimento[]> {
  try {
    const response = await api.get('/vale-movimentos')
    return response
  } catch (error) {
    console.error('Erro ao buscar movimentos:', error)
    return []
  }
}

export async function getMovimentosDoCliente(clienteId: string): Promise<ValeMovimento[]> {
  try {
    const response = await api.get(`/vale-movimentos/cliente/${clienteId}`)
    return response
  } catch (error) {
    console.error('Erro ao buscar movimentos do cliente:', error)
    return []
  }
}

export async function deleteMovimento(id: string): Promise<void> {
  try {
    await api.delete(`/vale-movimentos/${id}`)
    dispatchChange()
  } catch (error) {
    console.error('Erro ao deletar movimento:', error)
    throw error
  }
}

export async function addCredito(clienteId: string, valor: number, descricao?: string): Promise<ValeMovimento> {
  const movimento = {
    clienteId,
    data: new Date().toISOString(),
    tipo: "credito" as const,
    valor: Math.max(0, Number(valor) || 0),
    descricao: descricao?.trim(),
  }
  
  try {
    const result = await api.post('/vale-movimentos', movimento)
    dispatchChange()
    return { ...movimento, id: result.id }
  } catch (error) {
    console.error('Erro ao adicionar crédito:', error)
    throw error
  }
}

export async function abaterCredito(clienteId: string, valor: number, descricao?: string): Promise<ValeMovimento> {
  const movimento = {
    clienteId,
    data: new Date().toISOString(),
    tipo: "debito" as const,
    valor: Math.max(0, Number(valor) || 0),
    descricao: descricao?.trim(),
  }
  
  try {
    const result = await api.post('/vale-movimentos', movimento)
    dispatchChange()
    return { ...movimento, id: result.id }
  } catch (error) {
    console.error('Erro ao abater crédito:', error)
    throw error
  }
}

export async function getSaldoCliente(clienteId: string): Promise<number> {
  try {
    const saldos = await api.get('/vale-saldos')
    return saldos[clienteId] || 0
  } catch (error) {
    console.error('Erro ao buscar saldo do cliente:', error)
    return 0
  }
}

export async function getSaldosPorCliente(): Promise<Record<string, number>> {
  try {
    const saldos = await api.get('/vale-saldos')
    return saldos
  } catch (error) {
    console.error('Erro ao buscar saldos:', error)
    return {}
  }
}
