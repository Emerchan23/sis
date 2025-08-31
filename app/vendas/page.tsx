"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MetricCard } from "@/components/metric-card"
import { fmtCurrency } from "@/lib/format"
import {
  deleteLinha,
  getLinhas,
  importRowsFromObjects,
  saveLinha,
  templateCSV,
  type LinhaVenda,
  updateLinhaColor,
} from "@/lib/planilha"
import * as XLSX from "xlsx"
import { SlidersHorizontal, Upload, Plus, FileDown, BadgePercent, ListPlus, Palette } from "lucide-react"
import { ManageRatesDialog } from "@/components/manage-rates-dialog"
import { getCapitalRates, getImpostoRates, type Rate } from "@/lib/rates"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ManageModalidadesDialog } from "@/components/manage-modalidades-dialog"
import { getModalidades, type Modalidade } from "@/lib/modalidades"
import { Switch } from "@/components/ui/switch"
import {
  ensureDefaultEmpresa,
  getCurrentEmpresaId,
  getEmpresas,
  setCurrentEmpresaId,
  type Empresa,
} from "@/lib/empresas"
import { getClientes, type Cliente } from "@/lib/data-store"
import ClienteCombobox from "@/components/cliente-combobox"

type Density = "compact" | "default"
type Prefs = {
  visible: Record<string, boolean>
  density: Density
}

// Estado padrão de colunas
const allColumns: Array<{ key: keyof LinhaVenda; label: string; essential?: boolean }> = [
  { key: "dataPedido", label: "Data Pedido", essential: true },
  { key: "numeroOF", label: "Nº OF", essential: true },
  { key: "numeroDispensa", label: "Nº Dispensa", essential: false },
  { key: "cliente", label: "Cliente", essential: true },
  { key: "produto", label: "Produto Orçado / Vendido", essential: true },
  { key: "modalidade", label: "Modalidade", essential: true },
  { key: "valorVenda", label: "Valor Venda", essential: true },
  { key: "taxaCapitalPerc", label: "Taxa Capital %" },
  { key: "taxaCapitalVl", label: "Taxa VL Capital" },
  { key: "taxaImpostoPerc", label: "Taxa % Imposto" },
  { key: "taxaImpostoVl", label: "Taxa VL Imposto" },
  { key: "custoMercadoria", label: "Custo da Mercadoria" },
  { key: "somaCustoFinal", label: "Soma Custo Final", essential: true },
  { key: "lucroValor", label: "Lucro (R$)", essential: true },
  { key: "lucroPerc", label: "Lucro (%)", essential: true },
  { key: "dataRecebimento", label: "Data Recebimento", essential: true },
  { key: "paymentStatus", label: "Pagamento", essential: true },
  { key: "settlementStatus", label: "Acerto", essential: false },
]

export default function VendasPlanilhaPage() {
  const searchParams = useSearchParams()
  
  // Estados principais
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setEmpresaId] = useState<string>("")
  const [linhas, setLinhas] = useState<LinhaVenda[]>([])
  const [filtro, setFiltro] = useState("")
  const [prefs, setPrefs] = useState<Prefs>(() => {
    const visible = Object.fromEntries(allColumns.map((c) => [c.key, !!c.essential])) as Record<string, boolean>
    return { visible, density: "compact" }
  })
  
  // Estados de modais
  const [editing, setEditing] = useState<LinhaVenda | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [openRates, setOpenRates] = useState(false)
  const [openModalidades, setOpenModalidades] = useState(false)
  
  // Estados de dados
  const [capitalRates, setCapitalRates] = useState<Rate[]>([])
  const [impostoRates, setImpostoRates] = useState<Rate[]>([])
  const [modalidades, setModalidades] = useState<Modalidade[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  
  // Refs e outros estados
  const fileRef = useRef<HTMLInputElement>(null)
  const [onlyPendAcerto, setOnlyPendAcerto] = useState(false)

  // Aplicar filtro da URL se presente
  useEffect(() => {
    const numeroOF = searchParams.get('numeroOF')
    if (numeroOF) {
      setFiltro(numeroOF)
    }
  }, [searchParams])

  // Função para carregar dados iniciais
  useEffect(() => {
    const initializeData = async () => {
      try {
        await ensureDefaultEmpresa()
        const empresasList = await getEmpresas()
        setEmpresas(empresasList)
        
        const currentId = (await getCurrentEmpresaId()) || (empresasList[0]?.id ?? "")
        setEmpresaId(currentId)
        
        await Promise.all([
          refreshLinhas(),
          refreshRates(),
          refreshModalidades(),
          refreshClientes()
        ])
      } catch (error) {
        console.error('Erro ao inicializar dados:', error)
      }
    }
    
    initializeData()
    
    // Listener para mudanças de dados
    const handleDataChange = () => {
      refreshLinhas().catch(console.error)
    }
    
    if (typeof window !== "undefined") {
      window.addEventListener("data-changed", handleDataChange)
      return () => window.removeEventListener("data-changed", handleDataChange)
    }
  }, [])

  // Funções de refresh
  const refreshLinhas = async () => {
    try {
      const data = await getLinhas()
      setLinhas(data)
    } catch (error) {
      console.error('Erro ao carregar linhas:', error)
      setLinhas([])
    }
  }

  const refreshRates = async () => {
    try {
      const [capital, imposto] = await Promise.all([
        getCapitalRates(),
        getImpostoRates()
      ])
      setCapitalRates(Array.isArray(capital) ? capital : [])
      setImpostoRates(Array.isArray(imposto) ? imposto : [])
    } catch (error) {
      console.error('Erro ao carregar taxas:', error)
      setCapitalRates([])
      setImpostoRates([])
    }
  }

  const refreshModalidades = async () => {
    try {
      const data = await getModalidades()
      setModalidades(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error)
      setModalidades([])
    }
  }

  const refreshClientes = async () => {
    try {
      const data = await getClientes()
      setClientes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
      setClientes([])
    }
  }

  // Atualizar linhas quando empresa mudar
  useEffect(() => {
    if (empresaId) {
      refreshLinhas()
    }
  }, [empresaId])

  // Função para trocar empresa
  const handleEmpresaChange = async (novaEmpresaId: string) => {
    try {
      await setCurrentEmpresaId(novaEmpresaId)
      setEmpresaId(novaEmpresaId)
      
      // Recarregar dados após mudança de empresa
      await Promise.all([
        refreshLinhas(),
        refreshRates(),
        refreshModalidades(),
        refreshClientes()
      ])
    } catch (error) {
      console.error('Erro ao trocar empresa:', error)
    }
  }

  // Filtrar linhas
  const linhasFiltradas = useMemo(() => {
    let filtered = linhas
    
    if (filtro) {
      const termo = filtro.toLowerCase()
      filtered = filtered.filter(linha => 
        linha.cliente?.toLowerCase().includes(termo) ||
        linha.produto?.toLowerCase().includes(termo) ||
        linha.numeroOF?.toLowerCase().includes(termo) ||
        linha.numeroDispensa?.toLowerCase().includes(termo)
      )
    }
    
    if (onlyPendAcerto) {
      filtered = filtered.filter(linha => linha.settlementStatus === "Pendente")
    }
    
    return filtered
  }, [linhas, filtro, onlyPendAcerto])

  // Cálculos de métricas
  const metrics = useMemo(() => {
    const totalVendas = linhasFiltradas.reduce((sum, linha) => sum + (linha.valorVenda || 0), 0)
    const totalLucro = linhasFiltradas.reduce((sum, linha) => sum + (linha.lucroValor || 0), 0)
    const totalCusto = linhasFiltradas.reduce((sum, linha) => sum + (linha.somaCustoFinal || 0), 0)
    const margemMedia = totalVendas > 0 ? (totalLucro / totalVendas) * 100 : 0
    
    return {
      totalVendas,
      totalLucro,
      totalCusto,
      margemMedia,
      totalLinhas: linhasFiltradas.length
    }
  }, [linhasFiltradas])

  // Handlers de ações
  const handleNovaLinha = () => {
    setEditing(null)
    setOpenDialog(true)
  }

  const handleEditarLinha = (linha: LinhaVenda) => {
    setEditing(linha)
    setOpenDialog(true)
  }

  const handleExcluirLinha = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta linha?')) {
      try {
        await deleteLinha(id)
        await refreshLinhas()
      } catch (error) {
        console.error('Erro ao excluir linha:', error)
        alert('Erro ao excluir linha')
      }
    }
  }

  const handleSalvarLinha = async (linha: Partial<LinhaVenda>) => {
    try {
      console.log('Dados sendo salvos:', linha)
      console.log('Data Recebimento:', linha.dataRecebimento)
      await saveLinha(linha as Omit<LinhaVenda, "id" | "createdAt"> & { id?: string })
      setOpenDialog(false)
      setEditing(null)
      await refreshLinhas()
    } catch (error) {
      console.error('Erro ao salvar linha:', error)
      alert('Erro ao salvar linha')
    }
  }

  // Handlers de importação/exportação
  const handleImportarArquivo = () => {
    fileRef.current?.click()
  }

  const handleArquivoSelecionado = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      
      await importRowsFromObjects(jsonData as Record<string, any>[])
      await refreshLinhas()
      
      // Limpar input
      if (fileRef.current) {
        fileRef.current.value = ''
      }
    } catch (error) {
      console.error('Erro ao importar arquivo:', error)
      alert('Erro ao importar arquivo')
    }
  }

  const handleExportarTemplate = () => {
    try {
      const csvContent = templateCSV()
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'template-vendas.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Erro ao exportar template:', error)
      alert('Erro ao exportar template')
    }
  }

  const handleAlterarCor = async (linha: LinhaVenda, cor: string) => {
    try {
      await updateLinhaColor(linha.id!, cor)
      await refreshLinhas()
    } catch (error) {
      console.error('Erro ao alterar cor:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto p-6 space-y-6">
        {/* Seletor de empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Empresa Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={empresaId} onValueChange={handleEmpresaChange}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.filter(empresa => empresa && empresa.id && empresa.nome).map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total de Vendas"
            value={fmtCurrency(metrics.totalVendas)}
          />
          <MetricCard
            title="Total de Lucro"
            value={fmtCurrency(metrics.totalLucro)}
          />
          <MetricCard
            title="Total de Custo"
            value={fmtCurrency(metrics.totalCusto)}
          />
          <MetricCard
            title="Margem Média"
            value={`${metrics.margemMedia.toFixed(1)}%`}
          />
          <MetricCard
            title="Total de Linhas"
            value={metrics.totalLinhas.toString()}
          />
        </div>

        {/* Controles */}
        <Card>
          <CardHeader>
            <CardTitle>Controles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Filtro */}
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Filtrar por cliente, produto, OF ou dispensa..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>
              
              {/* Switch para acertos pendentes */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="only-pend-acerto"
                  checked={onlyPendAcerto}
                  onCheckedChange={setOnlyPendAcerto}
                />
                <Label htmlFor="only-pend-acerto">Apenas acertos pendentes</Label>
              </div>
              
              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button onClick={handleNovaLinha}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Linha
                </Button>
                
                <Button variant="outline" onClick={handleImportarArquivo}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
                
                <Button variant="outline" onClick={handleExportarTemplate}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Template
                </Button>
                
                <Button variant="outline" onClick={() => setOpenRates(true)}>
                  <BadgePercent className="h-4 w-4 mr-2" />
                  Taxas
                </Button>
                
                <Button variant="outline" onClick={() => setOpenModalidades(true)}>
                  <ListPlus className="h-4 w-4 mr-2" />
                  Modalidades
                </Button>
                
                {/* Configurações de colunas */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Colunas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {allColumns.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={prefs.visible[col.key]}
                        onCheckedChange={(checked) => {
                          setPrefs(prev => ({
                            ...prev,
                            visible: { ...prev.visible, [col.key]: checked }
                          }))
                        }}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Ações</TableHead>
                    {allColumns
                      .filter(col => prefs.visible[col.key])
                      .map(col => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))
                    }
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasFiltradas.filter(linha => linha && linha.id).map((linha) => (
                    <TableRow 
                      key={linha.id} 
                      style={{ backgroundColor: linha.cor || 'transparent' }}
                    >
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditarLinha(linha)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleExcluirLinha(linha.id!)}
                          >
                            Excluir
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Palette className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>Cor da linha</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {[
                                { name: 'Padrão', value: '' },
                                { name: 'Vermelho', value: '#fee2e2' },
                                { name: 'Verde', value: '#dcfce7' },
                                { name: 'Azul', value: '#dbeafe' },
                                { name: 'Amarelo', value: '#fef3c7' },
                                { name: 'Roxo', value: '#e9d5ff' },
                              ].map((cor) => (
                                <DropdownMenuCheckboxItem
                                  key={cor.value}
                                  checked={linha.cor === cor.value}
                                  onCheckedChange={() => handleAlterarCor(linha, cor.value)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-4 h-4 rounded border" 
                                      style={{ backgroundColor: cor.value || '#ffffff' }}
                                    />
                                    {cor.name}
                                  </div>
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                      {allColumns
                        .filter(col => prefs.visible[col.key])
                        .map(col => {
                          const value = linha[col.key]
                          let displayValue = value
                          
                          // Formatação específica por tipo de coluna
                          if (col.key.includes('valor') || col.key.includes('Vl') || col.key.includes('custo') || col.key.includes('lucro')) {
                            // Garantir que o valor seja um número antes de formatar
                            const numValue = typeof value === 'string' ? parseFloat(value) || 0 : (value || 0)
                            displayValue = fmtCurrency(numValue)
                          } else if (col.key.includes('Perc')) {
                            displayValue = typeof value === 'number' ? `${value.toFixed(2)}%` : value
                          } else if (col.key.includes('data') || col.key.includes('Data')) {
                            displayValue = value ? new Date(value as string).toLocaleDateString('pt-BR') : value
                          }
                          
                          return (
                            <TableCell key={col.key}>
                              {displayValue || '-'}
                            </TableCell>
                          )
                        })
                      }
                    </TableRow>
                  ))}
                  {linhasFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell 
                        colSpan={allColumns.filter(col => prefs.visible[col.key]).length + 1} 
                        className="text-center py-8 text-muted-foreground"
                      >
                        Nenhuma linha encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Input oculto para upload */}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleArquivoSelecionado}
          style={{ display: 'none' }}
        />

        {/* Modais */}
        <EditDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          row={editing}
          onSaved={handleSalvarLinha}
          capitalRates={capitalRates}
          impostoRates={impostoRates}
          modalidades={modalidades}
          clientes={clientes}
          onOpenManageRates={() => setOpenRates(true)}
          onOpenManageModalidades={() => setOpenModalidades(true)}
        />

        <ManageRatesDialog
          open={openRates}
          onOpenChange={async (v) => {
            setOpenRates(v)
            if (!v) await refreshRates()
          }}
        />

        <ManageModalidadesDialog
          open={openModalidades}
          onOpenChange={async (v) => {
            setOpenModalidades(v)
            if (!v) await refreshModalidades()
          }}
          onSaved={refreshModalidades}
        />
      </main>
    </div>
  )
}

// Componente do modal de edição
function EditDialog({
  open,
  onOpenChange,
  row,
  onSaved,
  capitalRates,
  impostoRates,
  modalidades,
  clientes,
  onOpenManageRates,
  onOpenManageModalidades,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: LinhaVenda | null
  onSaved: (linha: Partial<LinhaVenda>) => void
  capitalRates: Rate[]
  impostoRates: Rate[]
  modalidades: Modalidade[]
  clientes: Cliente[]
  onOpenManageRates: () => void
  onOpenManageModalidades: () => void
}) {
  const [formData, setFormData] = useState<Partial<LinhaVenda>>({})

  // Resetar form quando modal abrir/fechar ou row mudar
  useEffect(() => {
    if (open) {
      setFormData(row || {
        dataPedido: new Date().toISOString().split('T')[0],
        dataRecebimento: '',
        paymentStatus: 'Pendente',
        settlementStatus: 'Pendente'
      })
    }
  }, [open, row])

  // Função para calcular valores automaticamente
  const calculateValues = (data: Partial<LinhaVenda>) => {
    const valorVenda = data.valorVenda || 0
    const taxaCapitalPerc = data.taxaCapitalPerc || 0
    const taxaImpostoPerc = data.taxaImpostoPerc || 0
    const custoMercadoria = data.custoMercadoria || 0

    const taxaCapitalVl = (valorVenda * taxaCapitalPerc) / 100
    const taxaImpostoVl = (valorVenda * taxaImpostoPerc) / 100
    const somaCustoFinal = custoMercadoria + taxaCapitalVl + taxaImpostoVl
    const lucroValor = valorVenda - somaCustoFinal
    const lucroPerc = valorVenda > 0 ? (lucroValor / valorVenda) * 100 : 0

    return {
      ...data,
      taxaCapitalVl,
      taxaImpostoVl,
      somaCustoFinal,
      lucroValor,
      lucroPerc
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('FormData no handleSubmit:', formData)
    console.log('Data Recebimento no formData:', formData.dataRecebimento)
    onSaved(formData)
  }

  const handleFieldChange = (field: keyof LinhaVenda, value: any) => {
    setFormData(prev => {
      let processedValue = value
      
      // Converter valores monetários de string para número
      if (['valorVenda', 'custoMercadoria'].includes(field) && typeof value === 'string') {
        // Remove caracteres não numéricos exceto vírgulas e pontos
        const cleaned = value.replace(/[^0-9,.]/g, '')
        // Converte vírgula para ponto e transforma em número
        processedValue = parseFloat(cleaned.replace(',', '.')) || 0
      }
      
      // Processar campo de data para garantir formato correto
      if (field === 'dataRecebimento') {
        processedValue = value || '' // Manter o valor da data como string no formato YYYY-MM-DD
        console.log('Campo dataRecebimento alterado:', value)
      }
      
      const updated = { ...prev, [field]: processedValue }
      // Recalcular valores se for um campo que afeta os cálculos
      if (['valorVenda', 'taxaCapitalPerc', 'taxaImpostoPerc', 'custoMercadoria'].includes(field)) {
        return calculateValues(updated)
      }
      return updated
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {row ? 'Editar Linha de Venda' : 'Nova Linha de Venda'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Data do Pedido */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dados do Pedido</h3>
            <div>
              <Label htmlFor="dataPedido">Data do Pedido</Label>
              <Input
                id="dataPedido"
                type="date"
                value={formData.dataPedido || ''}
                onChange={(e) => handleFieldChange('dataPedido', e.target.value)}
                required
              />
            </div>
          </div>

          {/* 2. Nº OF e Nº Dispensa */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numeroOF">Nº OF</Label>
                <Input
                  id="numeroOF"
                  value={formData.numeroOF || ''}
                  onChange={(e) => handleFieldChange('numeroOF', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="numeroDispensa">Nº Dispensa</Label>
                <Input
                  id="numeroDispensa"
                  value={formData.numeroDispensa || ''}
                  onChange={(e) => handleFieldChange('numeroDispensa', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. Cliente */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ClienteCombobox
                    clientes={clientes}
                    value={formData.cliente || ''}
                    onChange={(value) => handleFieldChange('cliente', value)}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href="/clientes" target="_blank">Cadastrar</a>
                </Button>
              </div>
            </div>
          </div>

          {/* 4. Modalidade */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="modalidade">Modalidade</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={formData.modalidade || ''}
                    onValueChange={(value) => handleFieldChange('modalidade', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma modalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {modalidades.filter(modalidade => modalidade && modalidade.nome).map((modalidade) => (
                        <SelectItem key={modalidade.id} value={modalidade.nome}>
                          {modalidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={onOpenManageModalidades}
                >
                  Cadastrar
                </Button>
              </div>
            </div>
          </div>

          {/* 5. Produto Orçado */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="produto">Produto Orçado / Vendido</Label>
              <Textarea
                id="produto"
                value={formData.produto || ''}
                onChange={(e) => handleFieldChange('produto', e.target.value)}
                required
                rows={3}
              />
            </div>
          </div>

          {/* Valores e Taxas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Valores e Taxas</h3>
            
            {/* Valor Venda e Custo Mercadoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valorVenda">Valor de Venda</Label>
                <CurrencyInput
                  id="valorVenda"
                  value={formData.valorVenda || 0}
                  onChange={(value) => handleFieldChange('valorVenda', value)}
                  showCurrency={true}
                  required
                />
              </div>
              <div>
                <Label htmlFor="custoMercadoria">Custo da Mercadoria</Label>
                <CurrencyInput
                  id="custoMercadoria"
                  value={formData.custoMercadoria || 0}
                  onChange={(value) => handleFieldChange('custoMercadoria', value)}
                  showCurrency={true}
                />
              </div>
            </div>
            
            {/* Taxa Capital e Taxa Imposto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxaCapitalPerc">Taxa Capital (%)</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.taxaCapitalPerc?.toString() || ''}
                    onValueChange={(value) => handleFieldChange('taxaCapitalPerc', parseFloat(value) || 0)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {capitalRates.filter(rate => rate && rate.percentual !== undefined).map((rate) => (
                        <SelectItem key={rate.id} value={(rate.percentual || 0).toString()}>
                          {rate.percentual || 0}% - {rate.nome || 'Taxa sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={onOpenManageRates}
                  >
                    Gerenciar
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="taxaImpostoPerc">Taxa Imposto (%)</Label>
                <Select
                  value={formData.taxaImpostoPerc?.toString() || ''}
                  onValueChange={(value) => handleFieldChange('taxaImpostoPerc', parseFloat(value) || 0)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {impostoRates.filter(rate => rate && rate.percentual !== undefined).map((rate) => (
                      <SelectItem key={rate.id} value={(rate.percentual || 0).toString()}>
                        {rate.percentual || 0}% - {rate.nome || 'Taxa sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Valores das Taxas (calculados) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Taxa Capital (Valor)</Label>
                <Input
                  value={fmtCurrency(formData.taxaCapitalVl || 0)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>Taxa Imposto (Valor)</Label>
                <Input
                  value={fmtCurrency(formData.taxaImpostoVl || 0)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </div>

          {/* Custos e Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Custos e Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Soma Custo Final</Label>
                <Input
                  value={fmtCurrency(typeof formData.somaCustoFinal === 'string' ? parseFloat(formData.somaCustoFinal) || 0 : (formData.somaCustoFinal || 0))}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>Lucro (R$)</Label>
                <Input
                  value={fmtCurrency(typeof formData.lucroValor === 'string' ? parseFloat(formData.lucroValor) || 0 : (formData.lucroValor || 0))}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>Lucro (%)</Label>
                <Input
                  value={`${(formData.lucroPerc || 0).toFixed(2)}%`}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </div>

          {/* Data Recebimento */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="dataRecebimento">Data Recebimento</Label>
              <Input
                id="dataRecebimento"
                type="date"
                value={formData.dataRecebimento || ''}
                onChange={(e) => handleFieldChange('dataRecebimento', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentStatus">Status Pagamento</Label>
                <Select
                  value={formData.paymentStatus || 'Pendente'}
                  onValueChange={(value) => handleFieldChange('paymentStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="settlementStatus">Status Acerto</Label>
                <Input
                  value={formData.settlementStatus || 'Pendente'}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  placeholder="Status será atualizado automaticamente"
                />
              </div>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="flex flex-col gap-4 pt-6 border-t">
            {/* Botões principais - Adicionar e Cancelar */}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {row ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </div>
            
            {/* Botões de cadastro - Modalidades e Taxas */}
            <div className="flex gap-2 justify-start">
              <Button type="button" variant="outline" onClick={onOpenManageModalidades}>
                Cadastrar/editar modalidades
              </Button>
              <Button type="button" variant="outline" onClick={onOpenManageRates}>
                Cadastrar/editar taxas
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
