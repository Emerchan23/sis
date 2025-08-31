"use client"

import { fmtCurrency } from "@/lib/format"
import { getConfig } from "@/lib/config"
import { ensureDefaultEmpresa, getCurrentEmpresa } from "@/lib/empresas"
import type { Orcamento } from "@/lib/orcamentos"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

type DistribuicaoRow = { nome: string; total: number; qtdAcertos: number }
type FaturamentoAno = { ano: number; total: number }

function baseStyles() {
  // Modern, futuristic CSS design with better margins and professional look
  return `
    <style>
      @page {
        size: A4;
        margin: 20mm 18mm 20mm 18mm;
      }
      * { box-sizing: border-box; }
      html, body { 
        padding: 0; 
        margin: 0; 
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
        color: #1a1a1a;
        line-height: 1.5;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      }
      .container { 
        width: 100%; 
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        padding: 24px;
        margin: 0 auto;
      }
      .doc-header {
        display: grid;
        grid-template-columns: 80px 1fr;
        gap: 20px;
        align-items: center;
        background: linear-gradient(135deg, #171717 0%, #404040 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 28px;
        box-shadow: 0 8px 25px rgba(23, 23, 23, 0.3);
        page-break-inside: avoid;
      }
      .logo {
        width: 72px; 
        height: 72px; 
        border-radius: 12px; 
        object-fit: contain; 
        border: 2px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      }
      .muted { color: #64748b; font-size: 13px; font-weight: 500; }
      h1 { 
        font-size: 22px; 
        margin: 0 0 6px 0; 
        line-height: 1.2; 
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .meta { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 16px; 
        margin-top: 6px; 
        font-size: 13px; 
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
      }
      .kpis { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 16px 0 24px; 
        page-break-inside: avoid;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }
      .kpis th, .kpis td { padding: 12px 16px; border: none; font-size: 14px; }
      .kpis th { 
        text-align: left; 
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
        font-weight: 600; 
        color: #334155;
      }
      .kpis td.amount { text-align: right; font-variant-numeric: tabular-nums; }
      .section { 
        margin: 28px 0 0; 
        page-break-inside: avoid;
      }
      .section h2 { 
        font-size: 18px; 
        margin: 0 0 16px 0; 
        color: #1e293b; 
        font-weight: 700;
        position: relative;
        padding-bottom: 8px;
        page-break-after: avoid;
      }
      .section h2::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 60px;
        height: 3px;
        background: linear-gradient(135deg, #171717 0%, #404040 100%);
        border-radius: 2px;
      }
      table.list { 
        width: 100%; 
        border-collapse: collapse;
        page-break-inside: auto;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      }
      table.list th, table.list td { 
        padding: 12px 16px; 
        border: none;
        border-bottom: 1px solid #e2e8f0;
        font-size: 13px;
        page-break-inside: avoid;
      }
      table.list th { 
        background: linear-gradient(135deg, #171717 0%, #2d2d2d 100%); 
        color: white;
        text-align: left; 
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-size: 12px;
      }
      table.list tbody tr:hover { background: #f8fafc; }
      table.list tbody tr:nth-child(even) { background: #f9fafb; }
      table.list tr { page-break-inside: avoid; }
      .right { text-align: right; font-variant-numeric: tabular-nums; }
      .green { color: #059669; font-weight: 600; }
      .red { color: #dc2626; font-weight: 600; }
      .footer {
        margin-top: 32px; 
        padding-top: 16px; 
        border-top: 2px solid #e2e8f0; 
        font-size: 12px; 
        color: #64748b; 
        display: flex; 
        justify-content: space-between;
        page-break-inside: avoid;
        font-weight: 500;
      }
      /* Orcamento specific */
      .two-cols { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 20px; 
        margin: 20px 0;
        page-break-inside: avoid;
      }
      .card { 
        padding: 20px; 
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border: 1px solid #e2e8f0; 
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        page-break-inside: avoid;
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(135deg, #171717 0%, #404040 100%);
      }
      .title-sm { 
        font-size: 13px; 
        color: #64748b; 
        margin-bottom: 8px; 
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .strong { font-weight: 700; color: #1e293b; }
      .totals { 
        margin-top: 20px; 
        width: 100%; 
        border-collapse: collapse;
        page-break-inside: avoid;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
      }
      .totals td { padding: 16px 20px; font-size: 14px; }
      .totals .label { text-align: right; font-weight: 600; color: #334155; }
      .totals .total-final { 
        font-weight: 700; 
        font-size: 16px; 
        background: linear-gradient(135deg, #171717 0%, #404040 100%);
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
      .totals .total-final .label {
        color: rgba(255, 255, 255, 0.9);
      }
    </style>
  `
}

export function openPrintWindow(html: string, title = "Documento") {
  const w = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768")
  if (!w) return
  w.document.open()
  w.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${baseStyles()}
      </head>
      <body>
        <div class="container">${html}</div>
        <script>
          try {
            setTimeout(() => { window.focus(); window.print(); }, 150);
          } catch (e) {}
        </script>
      </body>
    </html>
  `)
  w.document.close()
}

// Função para converter cores oklch para rgb
function convertOklchToRgb(oklchStr: string): string {
  // Extrair valores oklch
  const match = oklchStr.match(/oklch\(([^)]+)\)/)
  if (!match) return oklchStr
  
  const values = match[1].split(' ').map(v => parseFloat(v.trim()))
  const [l, c, h] = values
  
  // Conversão simplificada oklch para rgb
  // Para cores neutras (c=0), usar apenas lightness
  if (c === 0) {
    const gray = Math.round(l * 255)
    return `rgb(${gray}, ${gray}, ${gray})`
  }
  
  // Para cores com chroma, usar aproximações
  const hueRad = (h || 0) * Math.PI / 180
  const a = c * Math.cos(hueRad)
  const b = c * Math.sin(hueRad)
  
  // Conversão aproximada LAB para RGB
  let r = l + 0.3963377774 * a + 0.2158037573 * b
  let g = l - 0.1055613458 * a - 0.0638541728 * b
  let blue = l - 0.0894841775 * a - 1.2914855480 * b
  
  // Normalizar para 0-255
  r = Math.max(0, Math.min(255, Math.round(r * 255)))
  g = Math.max(0, Math.min(255, Math.round(g * 255)))
  blue = Math.max(0, Math.min(255, Math.round(blue * 255)))
  
  return `rgb(${r}, ${g}, ${blue})`
}

// Função para converter CSS com oklch para rgb
function convertOklchInCSS(cssText: string): string {
  return cssText.replace(/oklch\([^)]+\)/g, (match) => {
    return convertOklchToRgb(match)
  })
}

export async function downloadPDF(html: string, title = "Documento") {
  try {
    // Criar um elemento temporário para renderizar o HTML
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.width = '210mm' // A4 width
    tempDiv.style.backgroundColor = 'white'
    
    // Converter oklch para rgb nos estilos base
    const convertedStyles = convertOklchInCSS(baseStyles().replace('<style>', '').replace('</style>', ''))
    
    // Adicionar estilos e conteúdo
    tempDiv.innerHTML = `
      <style>
        ${convertedStyles}
        /* Fallback colors for html2canvas */
        :root {
          --background: rgb(255, 255, 255);
          --foreground: rgb(37, 37, 37);
          --card: rgb(255, 255, 255);
          --card-foreground: rgb(37, 37, 37);
          --primary: rgb(52, 52, 52);
          --primary-foreground: rgb(251, 251, 251);
          --secondary: rgb(247, 247, 247);
          --secondary-foreground: rgb(52, 52, 52);
          --muted: rgb(247, 247, 247);
          --muted-foreground: rgb(142, 142, 142);
          --accent: rgb(247, 247, 247);
          --accent-foreground: rgb(52, 52, 52);
          --destructive: rgb(239, 68, 68);
          --destructive-foreground: rgb(255, 255, 255);
          --border: rgb(235, 235, 235);
          --input: rgb(235, 235, 235);
          --ring: rgb(180, 180, 180);
        }
      </style>
      <div class="container">${html}</div>
    `
    
    document.body.appendChild(tempDiv)
    
    // Aguardar um momento para renderização
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Capturar como canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2, // Melhor qualidade
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123 // A4 height in pixels at 96 DPI
    })
    
    // Remover elemento temporário
    document.body.removeChild(tempDiv)
    
    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 295 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    
    let position = 0
    
    // Adicionar primeira página
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    
    // Adicionar páginas adicionais se necessário
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    
    // Fazer download
    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    pdf.save(fileName)
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    alert('Erro ao gerar PDF. Tente novamente.')
  }
}

async function currentHeader() {
  // Garante empresa padrão e lê a empresa atual da Configuração Geral
  try {
    await ensureDefaultEmpresa()
  } catch {}
  const empresa = await getCurrentEmpresa()
  const cfg = getConfig() || {}

  return {
    nome: (empresa?.nome || cfg.nome || "Minha Empresa") as string,
    nomeDoSistema: (empresa?.nomeDoSistema || "LP IND") as string,
    razaoSocial: (empresa?.razaoSocial || cfg.razaoSocial || "") as string,
    cnpj: (empresa?.cnpj || cfg.cnpj || "") as string,
    endereco: (empresa?.endereco || cfg.endereco || "") as string,
    logoUrl:
      (empresa?.logoUrl && String(empresa.logoUrl).trim().length > 0
        ? empresa.logoUrl
        : cfg.logoUrl && String(cfg.logoUrl).trim().length > 0
          ? cfg.logoUrl
          : "/placeholder.svg?height=64&width=64") || "/placeholder.svg?height=64&width=64",
  }
}

/**
 * Monta o HTML de um Relatório com cabeçalho da empresa atual (Configurações Gerais).
 */
export async function makeReportHTML(args: {
  title?: string
  periodLabel: string
  resumo: { label: string; amount: number; highlight?: "green" | "red" }[]
  faturamentoAnual: FaturamentoAno[]
  distribuicao: DistribuicaoRow[]
}) {
  const hdr = await currentHeader()
  const now = new Date()
  const title = args.title ?? "Relatório Financeiro"

  const resumoRows = args.resumo
    .map((r) => {
      const cls = r.highlight === "green" ? "green" : r.highlight === "red" ? "red" : ""
      return `<tr><td>${r.label}</td><td class="amount ${cls}">${fmtCurrency(r.amount)}</td></tr>`
    })
    .join("")

  const faturamentoRows =
    args.faturamentoAnual
      .map((r) => `<tr><td>${r.ano}</td><td class="right">${fmtCurrency(r.total)}</td></tr>`)
      .join("") || `<tr><td colspan="2" class="muted">Sem dados.</td></tr>`

  const distRows =
    args.distribuicao
      .map(
        (r) =>
          `<tr><td>${r.nome}</td><td class="right">${fmtCurrency(r.total)}</td><td class="right">${r.qtdAcertos}</td></tr>`,
      )
      .join("") || `<tr><td colspan="3" class="muted">Nenhuma distribuição no período.</td></tr>`

  return `
    <div class="doc-header">
      <img class="logo" src="${hdr.logoUrl}" alt="Logo" crossorigin="anonymous" />
      <div>
        <h1>${hdr.nomeDoSistema} - ${title}</h1>
        <div class="meta">
          <div><span class="strong">${hdr.nome}</span></div>
          ${hdr.razaoSocial ? `<div>Razão Social: ${hdr.razaoSocial}</div>` : ""}
          ${hdr.cnpj ? `<div>CNPJ: ${formatCNPJ(hdr.cnpj)}</div>` : ""}
          ${hdr.endereco ? `<div>${hdr.endereco}</div>` : ""}
        </div>
        <div class="muted">Período: ${args.periodLabel} • Emitido em ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
      </div>
    </div>

    <table class="kpis">
      <thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
      <tbody>${resumoRows}</tbody>
    </table>

    <div class="section">
      <h2>Faturamento por ano</h2>
      <table class="list">
        <thead><tr><th>Ano</th><th class="right">Faturamento</th></tr></thead>
        <tbody>${faturamentoRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Distribuição por participante</h2>
      <table class="list">
        <thead><tr><th>Participante</th><th class="right">Total recebido</th><th class="right">Qtd. acertos</th></tr></thead>
        <tbody>${distRows}</tbody>
      </table>
    </div>

    <div class="footer">
      <div>Documento gerado pelo ERP</div>
      <div>Página 1</div>
    </div>
  `
}

/**
 * Documento do Orçamento: usa a Empresa atual das Configurações Gerais (Empresas).
 */
export async function makeOrcamentoHTML(orc: Orcamento | (Record<string, any> & { total?: number })) {
  const hdr = await currentHeader()
  const data = new Date((orc as any).data)
  const itens = (orc as any).itens as Array<{
    descricao: string
    marca?: string
    quantidade: number
    precoUnitario: number
    valorUnitario?: number
  }>

  const itensRows =
    itens
      ?.map((it, idx) => {
        const precoUnit = Number(it.precoUnitario || it.valorUnitario) || 0
        const total = (Number(it.quantidade) || 0) * precoUnit
        return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(it.descricao)}</td>
        <td>${escapeHtml(it.marca || "")}</td>
        <td class="right">${Number(it.quantidade) || 0}</td>
        <td class="right">${fmtCurrency(precoUnit)}</td>
        <td class="right">${fmtCurrency(total)}</td>
      </tr>
    `
      })
      .join("") || ""

  // Total: se não vier no objeto, calcula
  const totalCalc =
    (itens || []).reduce((acc, it) => {
      const precoUnit = Number(it.precoUnitario || it.valorUnitario) || 0
      return acc + (Number(it.quantidade) || 0) * precoUnit
    }, 0) || 0
  const total = Number((orc as any).total) || totalCalc

  return `
    <div class="container">
      <div class="doc-header">
        <img class="logo" src="${hdr.logoUrl}" alt="Logo" crossorigin="anonymous" />
        <div>
          <h1>${hdr.nomeDoSistema} - Orçamento #${(orc as any).numero}</h1>
          <div class="muted">Data: ${data.toLocaleDateString()}</div>
        </div>
      </div>

    <div class="two-cols">
      <div class="card">
        <div class="title-sm">Fornecedor</div>
        <div class="strong">${escapeHtml(hdr.nome)}</div>
        ${hdr.razaoSocial ? `<div>Razão Social: ${escapeHtml(hdr.razaoSocial)}</div>` : ""}
        ${hdr.cnpj ? `<div>CNPJ: ${formatCNPJ(hdr.cnpj)}</div>` : ""}
        ${hdr.endereco ? `<div>Endereço: ${escapeHtml(hdr.endereco)}</div>` : ""}
      </div>
      <div class="card">
        <div class="title-sm">Cliente</div>
        <div class="strong">${escapeHtml((orc as any).cliente?.nome || "")}</div>
        ${(orc as any).cliente?.documento ? `<div>CNPJ: ${escapeHtml((orc as any).cliente.documento)}</div>` : ""}
        ${(orc as any).cliente?.endereco ? `<div>Endereço: ${escapeHtml((orc as any).cliente.endereco)}</div>` : ""}
        ${(orc as any).cliente?.telefone ? `<div>Telefone: ${escapeHtml((orc as any).cliente.telefone)}</div>` : ""}
        ${(orc as any).cliente?.email ? `<div>Email: ${escapeHtml((orc as any).cliente.email)}</div>` : ""}
      </div>
    </div>

    <div class="section">
      <h2>Itens</h2>
      <table class="list">
        <thead>
          <tr>
            <th>#</th>
            <th>Descrição</th>
            <th>Marca</th>
            <th class="right">Qtd.</th>
            <th class="right">Valor unit.</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>${itensRows || `<tr><td colspan="6" class="muted">Nenhum item.</td></tr>`}</tbody>
      </table>

      <table class="totals">
        <tbody>
          <tr class="total-final">
            <td class="label" style="width: 80%;">Total do orçamento</td>
            <td class="right">${fmtCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${
      (orc as any).observacoes
        ? `
      <div class="section">
        <h2>Observações</h2>
        <div>${escapeHtml((orc as any).observacoes)}</div>
      </div>`
        : ""
    }

      <div class="footer">
        <div>Orçamento sem valor fiscal • Validade sugerida: 15 dias</div>
        <div>Página 1</div>
      </div>
    </div>
  `
}

function escapeHtml(s?: string) {
  if (!s) return ""
  return s.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      case "'":
        return "&#039;"
      default:
        return m
    }
  })
}

function formatCNPJ(v?: string) {
  if (!v) return ""
  const digits = String(v).replace(/\D/g, "")
  if (digits.length !== 14) return v
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}
