"use client"

import { type OrcamentoLayoutConfig } from "@/lib/company-config"

interface OrcamentoPreviewProps {
  layoutConfig: OrcamentoLayoutConfig
}

export function OrcamentoPreview({ layoutConfig }: OrcamentoPreviewProps) {
  const cores = layoutConfig.cores || {}
  const tipografia = layoutConfig.tipografia || {}
  const layout = layoutConfig.layout || {}
  const configuracoes = layoutConfig.configuracoes || {}
  
  const previewStyle = {
    fontFamily: tipografia.fonteFamilia || "Arial, sans-serif",
    fontSize: `${tipografia.tamanhoFonte || 14}px`,
    color: cores.texto || "#1f2937",
    padding: `${layout.espacamento || 15}px`,
    border: `${layout.bordaTabela || 1}px solid ${cores.secundaria || "#64748b"}`,
    borderRadius: "8px",
    backgroundColor: "white",
    maxWidth: "600px",
    margin: "0 auto"
  }
  
  const headerStyle = {
    backgroundColor: cores.primaria || "#2563eb",
    color: "white",
    padding: `${layout.espacamento || 15}px`,
    margin: `-${layout.espacamento || 15}px -${layout.espacamento || 15}px ${layout.espacamento || 15}px -${layout.espacamento || 15}px`,
    borderRadius: "8px 8px 0 0",
    textAlign: "center" as const,
    fontSize: `${(tipografia.tamanhoFonte || 14) + 4}px`,
    fontWeight: "bold"
  }
  
  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginTop: `${layout.espacamento || 15}px`
  }
  
  const thStyle = {
    backgroundColor: cores.secundaria || "#64748b",
    color: "white",
    padding: "8px",
    border: `${layout.bordaTabela || 1}px solid ${cores.secundaria || "#64748b"}`,
    textAlign: "left" as const,
    fontSize: `${(tipografia.tamanhoFonte || 14) - 1}px`
  }
  
  const tdStyle = {
    padding: "8px",
    border: `${layout.bordaTabela || 1}px solid ${cores.secundaria || "#64748b"}`,
    fontSize: `${(tipografia.tamanhoFonte || 14) - 1}px`
  }
  
  return (
    <div className="space-y-4">
      <h4 className="text-md font-medium">Preview do Orçamento</h4>
      <div style={previewStyle}>
        <div style={headerStyle}>
          ORÇAMENTO Nº 001/2024
        </div>
        
        <div style={{ marginTop: `${layout.espacamento || 15}px` }}>
          <strong>Cliente:</strong> João Silva<br />
          <strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}<br />
          <strong>Validade:</strong> {configuracoes.validadeDias || 30} dias
        </div>
        
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Qtd</th>
              <th style={thStyle}>Valor Unit.</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Produto Exemplo</td>
              <td style={tdStyle}>2</td>
              <td style={tdStyle}>R$ 50,00</td>
              <td style={tdStyle}>R$ 100,00</td>
            </tr>
            <tr>
              <td style={tdStyle}>Serviço Exemplo</td>
              <td style={tdStyle}>1</td>
              <td style={tdStyle}>R$ 150,00</td>
              <td style={tdStyle}>R$ 150,00</td>
            </tr>
          </tbody>
        </table>
        
        <div style={{ 
          marginTop: `${layout.espacamento || 15}px`, 
          textAlign: "right",
          fontWeight: "bold",
          fontSize: `${(tipografia.tamanhoFonte || 14) + 2}px`,
          color: cores.primaria || "#2563eb"
        }}>
          TOTAL: R$ 250,00
        </div>
      </div>
    </div>
  )
}