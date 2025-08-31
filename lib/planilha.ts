// Linhas de Vendas (planilha) via backend API (no localStorage)

"use client"

import { api, type LinhaVenda } from "./api-client"
import { emitChange } from "./data-store"
import { getCurrentEmpresaId } from "./empresas"

export type { LinhaVenda } from "./api-client"

export async function getLinhas(): Promise<LinhaVenda[]> {
  return await api.linhas.list()
}

export async function saveLinha(payload: Omit<LinhaVenda, "id" | "createdAt"> & { id?: string }) {
  // Ensure companyId is set for new records
  if (!payload.id && !payload.companyId) {
    const currentCompanyId = await getCurrentEmpresaId()
    if (currentCompanyId) {
      payload.companyId = currentCompanyId
    }
  }
  
  if (payload.id) {
    await api.linhas.update(payload.id, payload as Partial<LinhaVenda>)
  } else {
    await api.linhas.create(payload as Partial<LinhaVenda>)
  }
  emitChange("linhas_venda")
}

export async function deleteLinha(id: string) {
  await api.linhas.delete(id)
  emitChange("linhas_venda")
}

export async function updateLinhaColor(id: string, cor?: string) {
  await api.linhas.updateCor(id, cor || null)
  emitChange("linhas_venda")
}

/**
 * Importa objetos vindos do XLSX.utils.sheet_to_json.
 * Faz o melhor esforço de mapear colunas comuns.
 */
export async function importRowsFromObjects(rows: Record<string, any>[]) {
  const mapKey = (k: string) => k.trim().toLowerCase()

  for (const r of rows) {
    // Normaliza chaves
    const norm: Record<string, any> = {}
    for (const [k, v] of Object.entries(r)) norm[mapKey(k)] = v

    // Mapeamentos (tente adequar conforme seus cabeçalhos)
    const dataPedido = norm["data pedido"] || norm["data_pedido"] || norm["pedido"] || norm["data"] || ""
    const numeroOF = norm["nº of"] || norm["no of"] || norm["numero of"] || norm["n of"] || norm["of"] || ""
    const numeroDispensa =
      norm["nº dispensa"] || norm["numero dispensa"] || norm["dispensa"] || norm["n dispensa"] || ""
    const cliente = norm["cliente"] || norm["nome do cliente"] || ""
    const produto = norm["produto orçado / vendido"] || norm["produto"] || norm["item"] || ""
    const modalidade = norm["modalidade"] || ""
    const valorVenda = toNumber(norm["valor venda"] ?? norm["valor"] ?? norm["preço"] ?? 0)
    const taxaCapitalPerc = toNumber(norm["taxa capital %"] ?? norm["taxa capital"] ?? 0)
    const taxaImpostoPerc = toNumber(norm["taxa % imposto"] ?? norm["imposto %"] ?? norm["imposto"] ?? 0)
    const custoMercadoria = toNumber(norm["custo da mercadoria"] ?? norm["custo"] ?? 0)
    const dataRecebimento = norm["data recebimento"] || ""

    await api.linhas.create({
      dataPedido: dataPedido ? toISODate(dataPedido) : new Date().toISOString(),
      numeroOF: String(numeroOF || ""),
      numeroDispensa: String(numeroDispensa || ""),
      cliente: String(cliente || ""),
      produto: String(produto || ""),
      modalidade: String(modalidade || ""),
      valorVenda,
      taxaCapitalPerc,
      taxaImpostoPerc,
      custoMercadoria,
      dataRecebimento: dataRecebimento ? toISODate(dataRecebimento) : undefined,
      paymentStatus: "PENDENTE",
    })
  }
  emitChange("linhas_venda")
}

export function templateCSV() {
  const header = [
    "Data Pedido",
    "Nº OF",
    "Nº Dispensa",
    "Cliente",
    "Produto Orçado / Vendido",
    "Modalidade",
    "Valor Venda",
    "Taxa Capital %",
    "Taxa % Imposto",
    "Custo da Mercadoria",
    "Data Recebimento",
  ].join(";")
  const sample = [
    "2025-01-10",
    "OF-123",
    "DIS-456",
    "ACME Ltda",
    "Suprimentos diversos",
    "Unitário",
    "1200.00",
    "2.50",
    "8.00",
    "700.00",
    "",
  ].join(";")
  return `${header}\n${sample}\n`
}

// Função para obter linhas pendentes de acerto
export async function linhasPendentesDeAcerto(): Promise<LinhaVenda[]> {
  const linhas = await getLinhas()
  return linhas.filter(linha => 
    linha.paymentStatus === "Pago" && 
    (!linha.settlementStatus || linha.settlementStatus === "Pendente")
  )
}

// Função para definir linhas de acerto
export async function setLinhasAcerto(linhaIds: string[], acertoId: string): Promise<void> {
  for (const linhaId of linhaIds) {
    await api.linhas.update(linhaId, {
      acertoId,
      settlementStatus: "ACERTADO"
    })
  }
  emitChange("linhas_venda")
}

// Helpers
function toNumber(v: any) {
  if (v == null) return 0
  const s = String(v).replace(/\./g, "").replace(",", ".")
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
function toISODate(v: any) {
  // Accepts formats like dd/mm/yyyy or yyyy-mm-dd
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).toISOString()
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) {
    const iso = `${m[3]}-${m[2]}-${m[1]}`
    return new Date(iso).toISOString()
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}
