"use client"

import { api, type Cliente, type Produto, type Pedido, type Recebimento } from "./api-client"
import { sha256 } from "js-sha256"

export type { Cliente, Produto, Pedido, Recebimento }

export type ItemPedido = {
  produtoId: string
  quantidade: number
  precoUnitario: number
  custoUnitario: number
  taxaImposto: number
}

export type EmpresaConfig = {
  nome: string
  endereco?: string
  logoUrl?: string
  razaoSocial?: string
  cnpj?: string
  taxaImpostoPadrao?: number
  taxaCapitalPadrao?: number
}

// Compat: evento de mudança (para páginas já escutando)
export const ERP_CHANGED_EVENT = "erp:changed"

// API-only data store (no localStorage)

// No-op: data is managed on the backend now
export function ensureInit() {
  // intentionally empty
}

// Dispatch a change event to refresh screens that subscribe to ERP_CHANGED_EVENT
export function emitChange(key: string) {
  try {
    window.dispatchEvent(new CustomEvent(ERP_CHANGED_EVENT, { detail: { key } }))
  } catch {}
}

/* Basic data fetchers used by some screens */
export async function getClientes() {
  return api.clientes.list()
}
export async function getPedidos() {
  return api.pedidos.list()
}
export async function getRecebimentos() {
  return api.recebimentos.list()
}

/* Helpers for calculations used by Dashboard or other pages */
export function totalPedido(p: Pedido) {
  return p.itens.reduce((acc, i) => acc + Number(i.precoUnitario) * Number(i.quantidade), 0)
}
export function impostosPedido(p: Pedido) {
  return p.itens.reduce((acc, i) => acc + Number(i.precoUnitario) * Number(i.quantidade) * Number(i.taxaImposto), 0)
}
export function lucroPedido(p: Pedido) {
  return p.itens.reduce(
    (acc, i) =>
      acc +
      (Number(i.precoUnitario) - Number(i.custoUnitario) - Number(i.precoUnitario) * Number(i.taxaImposto)) *
        Number(i.quantidade),
    0,
  )
}

// Seed local antigo não é mais necessário
// ensureInit function is already defined above

/* ===== Clientes ===== */
// saveCliente and deleteCliente functions are removed as they are not needed for API-only data store

/* ===== Produtos ===== */
export async function getProdutos() {
  return api.produtos.list()
}

export async function saveProduto(produto: Partial<Produto> & { id?: string }) {
  if (produto.id) {
    await api.produtos.update(produto.id, produto)
  } else {
    await api.produtos.create(produto)
  }
  emitChange("produtos")
}

export async function deleteProduto(id: string) {
  await api.produtos.delete(id)
  emitChange("produtos")
}

/* ===== Pedidos ===== */
// savePedido and deletePedido functions are removed as they are not needed for API-only data store

/* ===== Recebimentos ===== */
// saveRecebimento and deleteRecebimento functions are removed as they are not needed for API-only data store

/* ===== Dashboard (compat) ===== */
export function dashboardTotals() {
  // Para compatibilidade, retornamos uma Promise usada via await em novos fluxos.
  return api.dashboard.totals()
}
export function seriesMensal() {
  return api.dashboard.series()
}



// Salt fixo para hashing local simples (não use em produção)
const PASSWORD_SALT = "erp_local_salt_v1"
const hash = (s: string) => sha256(s + PASSWORD_SALT)

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const result = [...current]
  for (const item of incoming) {
    const existingIndex = result.findIndex(r => r.id === item.id)
    if (existingIndex >= 0) {
      result[existingIndex] = item
    } else {
      result.push(item)
    }
  }
  return result
}

// getConfig and saveConfig functions are removed as they are not needed for API-only data store

// Helpers de cálculo
// totalPedido, impostosPedido, and lucroPedido functions are already defined above

export async function recebidoDoPedido(id: string) {
  const recebimentos = await getRecebimentos()
  return recebimentos
    .filter((r) => r.pedidoId === id)
    .reduce((a, r) => a + r.valor, 0)
}
export async function statusPedido(p: Pedido) {
  const recebido = await recebidoDoPedido(p.id)
  const total = totalPedido(p)
  return recebido >= total && total > 0 ? "Pago" : "Pendente"
}

/* ===== Backup/Restore ===== */

export type BackupPayload = {
  version: number
  exportedAt: string
  data: {
    clientes: Cliente[]
    produtos: Produto[]
    pedidos: Pedido[]
    recebimentos: Recebimento[]
    config: EmpresaConfig
  
    seqPedido: number
  }
}

function isArrayOfObjects(a: unknown): a is Record<string, unknown>[] {
  return Array.isArray(a)
}



export async function getBackup(): Promise<BackupPayload> {
  try {
    const response = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001").replace(/\/$/, "")}/backup/export`, {
      method: "GET",
      credentials: "include"
    })
    
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`HTTP ${response.status} ${response.statusText} - ${text}`)
    }
    
    const result = await response.json()
    if (result.error) {
      throw new Error(result.error)
    }
    
    return result as BackupPayload
  } catch (error) {
    console.error("Erro ao obter backup:", error)
    throw error
  }
}

export async function restoreBackup(payload: BackupPayload, opts?: { merge?: boolean }) {
  try {
    const merge = opts?.merge || false
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001").replace(/\/$/, "")
    const url = `${apiUrl}/backup/import?merge=${merge ? "1" : "0"}`
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`HTTP ${response.status} ${response.statusText} - ${text}`)
    }
    
    const result = await response.json()
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    // Emit change event to refresh UI
    emitChange("backup-restored")
    
    return { merge }
  } catch (error) {
    throw error
  }
}

/* ===== User Management Functions ===== */
