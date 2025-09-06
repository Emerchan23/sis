"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { fmtCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getLinhas } from "@/lib/planilha"
import { getAcertos, getParticipantes } from "@/lib/acertos"
import { makeReportHTML, openPrintWindow, downloadPDF } from "@/lib/print"
import { ERP_CHANGED_EVENT } from "@/lib/data-store"
import { getConfig } from "@/lib/config"
import { Printer, RefreshCw, Download } from "lucide-react"

type DistRow = { participanteId: string; nome: string; total: number; totalBruto: number; totalDespesasIndiv: number; qtdAcertos: number }
type FaturamentoAno = { ano: number; total: number }

// Normaliza percentuais: aceita 10 (10%) ou 0.1 (10%)
function percToFactor(p: unknown): number {
  const n = Number(p)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n > 1 ? n / 100 : n
}

function capitalFromRow(l: any, cfg: { taxaCapitalPadrao?: number }): number {
  const vv = Number(getValorVenda(l) || 0)
  const val = Number(l?.taxaCapitalVl)
  if (Number.isFinite(val) && val > 0) return val
  const rowPerc = percToFactor(l?.taxaCapitalPerc)
  if (rowPerc > 0) return +(vv * rowPerc).toFixed(2)
  const cfgPerc = percToFactor(cfg?.taxaCapitalPadrao ?? 0)
  if (cfgPerc > 0) return +(vv * cfgPerc).toFixed(2)
  return 0
}

function impostoFromRow(l: any, cfg: { taxaImpostoPadrao?: number }): number {
  const vv = Number(getValorVenda(l) || 0)
  const val = Number(l?.taxaImpostoVl)
  if (Number.isFinite(val) && val > 0) return val
  const rowPerc = percToFactor(l?.taxaImpostoPerc)
  if (rowPerc > 0) return +(vv * rowPerc).toFixed(2)
  const cfgPerc = percToFactor(cfg?.taxaImpostoPadrao ?? 0)
  if (cfgPerc > 0) return +(vv * cfgPerc).toFixed(2)
  return 0
}

function inRange(iso?: string, ini?: Date, fim?: Date) {
  if (!iso || !ini || !fim) return false
  const d = new Date(iso)
  const di = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate())
  const df = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59, 999)
  return d >= di && d <= df
}

function getValorVenda(l: any): number {
  const candidates = ["valorVenda", "valor_venda", "valorVendaVl", "valor", "total", "valor_total"]
  for (const key of candidates) {
    const n = Number(l?.[key])
    if (!Number.isNaN(n) && n !== 0) return n
  }
  const n = Number(l?.valorVenda)
  return Number.isNaN(n) ? 0 : n
}

export default function RelatoriosPage() {
  // Período padrão: ano atual
  const [inicio, setInicio] = useState<string>(() =>
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
  )
  const [fim, setFim] = useState<string>(() => new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10))

  const reportRef = useRef<HTMLDivElement>(null)

  const [linhas, setLinhas] = useState<any[]>([])
  const [acertos, setAcertos] = useState<any[]>([])
  const [participantes, setParticipantes] = useState<any[]>([])
  const [config, setConfig] = useState(() => getConfig())

  async function reload() {
    try {
      const [linhasData, acertosData, participantesData] = await Promise.all([
        getLinhas(),
        getAcertos(),
        getParticipantes()
      ])
      setLinhas(linhasData)
      setAcertos(acertosData)
      setParticipantes(participantesData)
      setConfig(getConfig())
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
      setLinhas([])
      setAcertos([])
      setParticipantes([])
    }
  }

  useEffect(() => {
    reload()
    const onAnyChange = () => reload()
    window.addEventListener(ERP_CHANGED_EVENT, onAnyChange as EventListener)
    window.addEventListener("storage", onAnyChange)
    return () => {
      window.removeEventListener(ERP_CHANGED_EVENT, onAnyChange as EventListener)
      window.removeEventListener("storage", onAnyChange)
    }
  }, [])

  const di = useMemo(() => new Date(inicio), [inicio])
  const df = useMemo(() => new Date(fim), [fim])

  // Filtra por período
  const linhasPeriodo = useMemo(() => linhas.filter((l) => inRange(l.dataPedido, di, df)), [linhas, di, df])
  const acertosPeriodo = useMemo(() => acertos.filter((a) => inRange(a.data, di, df)), [acertos, di, df])

  // Totais
  const totalTaxaCapital = useMemo(
    () => linhasPeriodo.reduce((a, l) => a + capitalFromRow(l, { taxaCapitalPadrao: config.taxaCapitalPadrao }), 0),
    [linhasPeriodo, config],
  )

  const totalImpostos = useMemo(
    () => linhasPeriodo.reduce((a, l) => a + impostoFromRow(l, { taxaImpostoPadrao: config.taxaImpostoPadrao }), 0),
    [linhasPeriodo, config],
  )
  const totalLucroBruto = useMemo(
    () => linhasPeriodo.reduce((a, l) => a + (Number(l.lucroValor) || 0), 0),
    [linhasPeriodo],
  )
  const totalDespesasAcertos = useMemo(
    () => {
      return acertosPeriodo.reduce(
        (a, x) => a + (Number(x.totalDespesasRateio) || 0) + (Number(x.totalDespesasIndividuais) || 0),
        0,
      )
    },
    [acertosPeriodo],
  )
  
  // Lucro líquido = Lucro bruto - Despesas dos acertos
  const totalLucroLiquido = useMemo(
    () => totalLucroBruto - totalDespesasAcertos,
    [totalLucroBruto, totalDespesasAcertos],
  )
  
  const faturamentoPeriodo = useMemo(() => linhasPeriodo.reduce((a, l) => a + getValorVenda(l), 0), [linhasPeriodo])

  // Faturamento por ano (filtrado pelo período selecionado)
  const faturamentoPorAno: FaturamentoAno[] = useMemo(() => {
    const map = new Map<number, number>()
    for (const l of linhasPeriodo) {
      if (!l?.dataPedido) continue
      const d = new Date(l.dataPedido)
      const ano = d.getFullYear()
      map.set(ano, (map.get(ano) || 0) + getValorVenda(l))
    }
    return Array.from(map.entries())
      .map(([ano, total]) => ({ ano, total }))
      .sort((a, b) => b.ano - a.ano)
  }, [linhasPeriodo])

  // Distribuição por participante (acertos do período)
  const distribPorParticipante: DistRow[] = useMemo(() => {
    const map = new Map<string, { totalLiquido: number; totalBruto: number; totalDespesasIndiv: number; qtd: number }>()
    for (const a of acertosPeriodo) {
      const distribs: any[] = a.distribuicoes || []
      for (const d of distribs) {
        const cur = map.get(d.participanteId) || { totalLiquido: 0, totalBruto: 0, totalDespesasIndiv: 0, qtd: 0 }
        map.set(d.participanteId, { 
          totalLiquido: cur.totalLiquido + (Number(d.valor) || 0),
          totalBruto: cur.totalBruto + (Number(d.valorBruto) || 0),
          totalDespesasIndiv: cur.totalDespesasIndiv + (Number(d.descontoIndividual) || 0),
          qtd: cur.qtd + 1 
        })
      }
    }
    const byIdName = new Map(participantes.map((p: any) => [p.id, p.nome] as const))
    return Array.from(map.entries())
      .map(([participanteId, info]) => ({
        participanteId,
        nome: byIdName.get(participanteId) || `Participante ${participanteId.slice(0, 6)}`,
        total: +info.totalLiquido.toFixed(2),
        totalBruto: +info.totalBruto.toFixed(2),
        totalDespesasIndiv: +info.totalDespesasIndiv.toFixed(2),
        qtdAcertos: info.qtd,
      }))
      .sort((a, b) => b.total - a.total)
  }, [acertosPeriodo, participantes])

  // Cliente com mais vendas (por valor)
  const clientesMaisVendas = useMemo(() => {
    const map = new Map<string, { total: number; qtdVendas: number }>()
    for (const l of linhasPeriodo) {
      const cliente = l.cliente || 'Cliente não informado'
      const valor = getValorVenda(l)
      const cur = map.get(cliente) || { total: 0, qtdVendas: 0 }
      map.set(cliente, { total: cur.total + valor, qtdVendas: cur.qtdVendas + 1 })
    }
    return Array.from(map.entries())
      .map(([cliente, info]) => ({
        cliente,
        totalVendas: +info.total.toFixed(2),
        qtdVendas: info.qtdVendas,
      }))
      .sort((a, b) => b.totalVendas - a.totalVendas)
      .slice(0, 10) // Top 10
  }, [linhasPeriodo])

  // Cliente com mais lucro
  const clientesMaisLucro = useMemo(() => {
    const map = new Map<string, { lucro: number; qtdVendas: number }>()
    for (const l of linhasPeriodo) {
      const cliente = l.cliente || 'Cliente não informado'
      const lucro = Number(l.lucroValor) || 0
      const cur = map.get(cliente) || { lucro: 0, qtdVendas: 0 }
      map.set(cliente, { lucro: cur.lucro + lucro, qtdVendas: cur.qtdVendas + 1 })
    }
    return Array.from(map.entries())
      .map(([cliente, info]) => ({
        cliente,
        totalLucro: +info.lucro.toFixed(2),
        qtdVendas: info.qtdVendas,
      }))
      .sort((a, b) => b.totalLucro - a.totalLucro)
      .slice(0, 10) // Top 10
  }, [linhasPeriodo])

  // Lucro por modalidade (Direta vs Licitação)
  const lucroPorModalidade = useMemo(() => {
    const modalidades = new Map<string, { lucro: number; vendas: number; qtdVendas: number }>()
    for (const l of linhasPeriodo) {
      const modalidade = l.modalidade || 'Não informado'
      const lucro = Number(l.lucroValor) || 0
      const venda = getValorVenda(l)
      const cur = modalidades.get(modalidade) || { lucro: 0, vendas: 0, qtdVendas: 0 }
      modalidades.set(modalidade, {
        lucro: cur.lucro + lucro,
        vendas: cur.vendas + venda,
        qtdVendas: cur.qtdVendas + 1
      })
    }
    return Array.from(modalidades.entries())
      .map(([modalidade, info]) => ({
        modalidade,
        totalLucro: +info.lucro.toFixed(2),
        totalVendas: +info.vendas.toFixed(2),
        qtdVendas: info.qtdVendas,
        margemLucro: info.vendas > 0 ? +((info.lucro / info.vendas) * 100).toFixed(2) : 0
      }))
      .sort((a, b) => b.totalLucro - a.totalLucro)
  }, [linhasPeriodo])

  // Exportações CSV
  function exportResumoCSV() {
    const rows = [
      ["Periodo", `${inicio} a ${fim}`],
      ["Faturamento do período", faturamentoPeriodo],
      ["Gasto com taxa de capital", totalTaxaCapital],
      ["Impostos pagos", totalImpostos],
      ["Lucro bruto (linhas)", totalLucroBruto],
      ["Despesas (acertos)", totalDespesasAcertos],
      ["Lucro líquido", totalLucroLiquido],
    ]
    const csv = rows.map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "resumo-relatorio.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportDistribuicaoCSV() {
    const header = ["Participante", "Lucro bruto", "Despesas individuais", "Lucro líquido", "Qtd. acertos"]
    const rows = [header, ...distribPorParticipante.map((r) => [r.nome, r.totalBruto, r.totalDespesasIndiv, r.total, r.qtdAcertos])]
    const csv = rows.map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "distribuicao-por-participante.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportFaturamentoAnualCSV() {
    const header = ["Ano", "Faturamento"]
    const rows = [header, ...faturamentoPorAno.map((r) => [r.ano, r.total])]
    const csv = rows.map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "faturamento-anual.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportClientesMaisVendasCSV() {
    const header = ["Cliente", "Total Vendas", "Qtd. Vendas"]
    const rows = [header, ...clientesMaisVendas.map((r) => [r.cliente, r.totalVendas, r.qtdVendas])]
    const csv = rows.map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "clientes-mais-vendas.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportClientesMaisLucroCSV() {
    const header = ["Cliente", "Total Lucro", "Qtd. Vendas"]
    const rows = [header, ...clientesMaisLucro.map((r) => [r.cliente, r.totalLucro, r.qtdVendas])]
    const csv = rows.map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "clientes-mais-lucro.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportLucroPorModalidadeCSV() {
    const header = ["Modalidade", "Total Lucro", "Total Vendas", "Qtd. Vendas", "Margem Lucro (%)"]
    const rows = [header, ...lucroPorModalidade.map((r) => [r.modalidade, r.totalLucro, r.totalVendas, r.qtdVendas, r.margemLucro])]
    const csv = rows.map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "lucro-por-modalidade.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // Impressão (HTML renderizado no navegador)
  async function imprimirRelatorio() {
    const resumo = [
      { label: "Faturamento do período", amount: faturamentoPeriodo, highlight: "green" as const },
      { label: "Gasto com taxa de capital", amount: totalTaxaCapital, highlight: "red" as const },
      { label: "Impostos pagos", amount: totalImpostos, highlight: "red" as const },
      { label: "Lucro bruto (linhas)", amount: totalLucroBruto, highlight: "green" as const },
      { label: "Despesas (acertos)", amount: totalDespesasAcertos, highlight: "red" as const },
      { label: "Lucro líquido", amount: totalLucroLiquido, highlight: totalLucroLiquido >= 0 ? "green" as const : "red" as const },
    ]
    const periodLabel = `${new Date(inicio).toLocaleDateString()} a ${new Date(fim).toLocaleDateString()}`
    const html = await makeReportHTML({
      periodLabel,
      resumo,
      faturamentoAnual: faturamentoPorAno,
      distribuicao: distribPorParticipante.map((d) => ({ nome: d.nome, total: d.total, totalBruto: d.totalBruto, totalDespesasIndiv: d.totalDespesasIndiv, qtdAcertos: d.qtdAcertos })),
    })
    openPrintWindow(html, "Relatório")
  }

  // Download PDF do relatório
  async function baixarRelatorioPDF() {
    const resumo = [
      { label: "Faturamento do período", amount: faturamentoPeriodo, highlight: "green" as const },
      { label: "Gasto com taxa de capital", amount: totalTaxaCapital, highlight: "red" as const },
      { label: "Impostos pagos", amount: totalImpostos, highlight: "red" as const },
      { label: "Lucro bruto (linhas)", amount: totalLucroBruto, highlight: "green" as const },
      { label: "Despesas (acertos)", amount: totalDespesasAcertos, highlight: "red" as const },
      { label: "Lucro líquido", amount: totalLucroLiquido, highlight: totalLucroLiquido >= 0 ? "green" as const : "red" as const },
    ]
    const periodLabel = `${new Date(inicio).toLocaleDateString()} a ${new Date(fim).toLocaleDateString()}`
    const html = await makeReportHTML({
      periodLabel,
      resumo,
      faturamentoAnual: faturamentoPorAno,
      distribuicao: distribPorParticipante.map((d) => ({ nome: d.nome, total: d.total, totalBruto: d.totalBruto, totalDespesasIndiv: d.totalDespesasIndiv, qtdAcertos: d.qtdAcertos })),
    })
    await downloadPDF(html, `Relatório_${periodLabel.replace(/\//g, '-')}`)
  }

  // Filtro rápido por ano
  function setAno(ano: number) {
    const ini = new Date(ano, 0, 1)
    const end = new Date(ano, 11, 31)
    setInicio(ini.toISOString().slice(0, 10))
    setFim(end.toISOString().slice(0, 10))
  }
  const anoAtual = new Date().getFullYear()

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={imprimirRelatorio}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={baixarRelatorioPDF}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="inicio">Início</Label>
              <Input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fim">Fim</Label>
              <Input id="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-end gap-2 flex-wrap">
              <Button onClick={exportResumoCSV}>Exportar resumo (CSV)</Button>
              <Button variant="outline" className="bg-transparent" onClick={exportDistribuicaoCSV}>
                Exportar distribuição (CSV)
              </Button>
              <Button variant="outline" className="bg-transparent" onClick={exportFaturamentoAnualCSV}>
                Exportar faturamento anual (CSV)
              </Button>
              <Button variant="outline" className="bg-transparent" onClick={exportClientesMaisVendasCSV}>
                Exportar clientes + vendas (CSV)
              </Button>
              <Button variant="outline" className="bg-transparent" onClick={exportClientesMaisLucroCSV}>
                Exportar clientes + lucro (CSV)
              </Button>
              <Button variant="outline" className="bg-transparent" onClick={exportLucroPorModalidadeCSV}>
                Exportar lucro modalidades (CSV)
              </Button>
            </div>
            <div className="md:col-span-4 flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground self-center">Anos rápidos:</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setAno(anoAtual)}>
                  {anoAtual}
                </Button>
                <Button variant="ghost" onClick={() => setAno(anoAtual - 1)}>
                  {anoAtual - 1}
                </Button>
                <Button variant="ghost" onClick={() => setAno(anoAtual - 2)}>
                  {anoAtual - 2}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div ref={reportRef} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle>Faturamento do período</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtCurrency(faturamentoPeriodo)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gasto com taxa de capital</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtCurrency(totalTaxaCapital)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Impostos pagos</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtCurrency(totalImpostos)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Lucro bruto (linhas)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-emerald-700">
                {fmtCurrency(totalLucroBruto)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Despesas (acertos)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold text-red-700">
                {fmtCurrency(totalDespesasAcertos)}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Faturamento por ano</CardTitle>
              <Button variant="outline" className="bg-transparent" onClick={exportFaturamentoAnualCSV}>
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturamentoPorAno.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Sem dados de faturamento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    faturamentoPorAno.map((r) => (
                      <TableRow key={r.ano}>
                        <TableCell>{r.ano}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(r.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por participante</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Participante</TableHead>
                    <TableHead className="text-right">Lucro bruto</TableHead>
                    <TableHead className="text-right">Despesas indiv.</TableHead>
                    <TableHead className="text-right">Lucro líquido</TableHead>
                    <TableHead className="text-right">Qtd. acertos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distribPorParticipante.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma distribuição no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    distribPorParticipante.map((r) => (
                      <TableRow key={r.participanteId}>
                        <TableCell>{r.nome}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(r.totalBruto)}</TableCell>
                        <TableCell className="text-right text-red-600">{fmtCurrency(r.totalDespesasIndiv)}</TableCell>
                        <TableCell className="text-right font-semibold" style={{ color: r.total >= 0 ? '#059669' : '#dc2626' }}>
                          {fmtCurrency(r.total)}
                        </TableCell>
                        <TableCell className="text-right">{r.qtdAcertos}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Clientes com mais vendas (Top 10)</CardTitle>
              <Button variant="outline" className="bg-transparent" onClick={exportClientesMaisVendasCSV}>
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total Vendas</TableHead>
                    <TableHead className="text-right">Qtd. Vendas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesMaisVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Sem dados de vendas por cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesMaisVendas.map((r, index) => (
                      <TableRow key={r.cliente}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              #{index + 1}
                            </span>
                            {r.cliente}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmtCurrency(r.totalVendas)}</TableCell>
                        <TableCell className="text-right">{r.qtdVendas}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Clientes com mais lucro (Top 10)</CardTitle>
              <Button variant="outline" className="bg-transparent" onClick={exportClientesMaisLucroCSV}>
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total Lucro</TableHead>
                    <TableHead className="text-right">Qtd. Vendas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesMaisLucro.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Sem dados de lucro por cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesMaisLucro.map((r, index) => (
                      <TableRow key={r.cliente}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              #{index + 1}
                            </span>
                            {r.cliente}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-700">{fmtCurrency(r.totalLucro)}</TableCell>
                        <TableCell className="text-right">{r.qtdVendas}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lucro por modalidade</CardTitle>
              <Button variant="outline" className="bg-transparent" onClick={exportLucroPorModalidadeCSV}>
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modalidade</TableHead>
                    <TableHead className="text-right">Total Lucro</TableHead>
                    <TableHead className="text-right">Total Vendas</TableHead>
                    <TableHead className="text-right">Qtd. Vendas</TableHead>
                    <TableHead className="text-right">Margem (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lucroPorModalidade.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Sem dados de lucro por modalidade.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lucroPorModalidade.map((r) => (
                      <TableRow key={r.modalidade}>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            r.modalidade.toLowerCase().includes('direta') 
                              ? 'bg-blue-100 text-blue-800'
                              : r.modalidade.toLowerCase().includes('licitação') || r.modalidade.toLowerCase().includes('licitacao')
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {r.modalidade}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-700">{fmtCurrency(r.totalLucro)}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(r.totalVendas)}</TableCell>
                        <TableCell className="text-right">{r.qtdVendas}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${
                            r.margemLucro >= 20 ? 'text-green-600' :
                            r.margemLucro >= 10 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {r.margemLucro}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo numérico</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Faturamento do período</TableCell>
                    <TableCell className="text-right">{fmtCurrency(faturamentoPeriodo)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Gasto com taxa de capital</TableCell>
                    <TableCell className="text-right">{fmtCurrency(totalTaxaCapital)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Impostos pagos</TableCell>
                    <TableCell className="text-right">{fmtCurrency(totalImpostos)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Lucro bruto (linhas)</TableCell>
                    <TableCell className="text-right">{fmtCurrency(totalLucroBruto)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Despesas (acertos)</TableCell>
                    <TableCell className="text-right">{fmtCurrency(totalDespesasAcertos)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Lucro líquido</TableCell>
                    <TableCell className={`text-right ${totalLucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtCurrency(totalLucroLiquido)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
