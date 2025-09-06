"use client"

import { useEffect, useMemo, useState } from "react"

// Função auxiliar para gerar IDs compatível com navegadores
function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  // Fallback para navegadores que não suportam crypto.randomUUID
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Função para gerar número do orçamento no formato número/ano
async function generateOrcamentoNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  try {
    // Buscar orçamentos do ano atual para determinar o próximo número
    const response = await fetch('/api/orcamentos?incluir_itens=false')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const orcamentos = await response.json()
    
    // Filtrar orçamentos do ano atual e extrair números
    const orcamentosDoAno = orcamentos.filter((orc: any) => {
      const numero = orc.numero.toString()
      return numero.includes(`/${currentYear}`)
    })
    
    // Encontrar o maior número do ano
    let maiorNumero = 0
    orcamentosDoAno.forEach((orc: any) => {
      const numero = orc.numero.toString()
      const partes = numero.split('/')
      if (partes.length === 2) {
        const num = parseInt(partes[0])
        if (!isNaN(num) && num > maiorNumero) {
          maiorNumero = num
        }
      }
    })
    
    // Próximo número sequencial com formatação de zero à esquerda
    const proximoNumero = maiorNumero + 1
    const numeroFormatado = proximoNumero.toString().padStart(2, '0')
    return `${numeroFormatado}/${currentYear}`
    
  } catch (error) {
    console.error('Erro ao gerar número do orçamento:', error)
    // Fallback mais seguro: começar do 01 se houver erro
    return `01/${currentYear}`
  }
}

// Local storage keys for draft saving
const DRAFT_STORAGE_KEY = 'orcamento_draft'
const DRAFT_TIMESTAMP_KEY = 'orcamento_draft_timestamp'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ExternalLink, LockKeyhole, ChevronDown, ChevronRight, Save, Download } from "lucide-react"
import { fmtCurrency } from "@/lib/format"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ERP_CHANGED_EVENT, getClientes } from "@/lib/data-store"
import { saveOrcamento, getOrcamentos, type Orcamento, type OrcamentoCliente } from "@/lib/orcamentos"
import { api } from "@/lib/api-client"

// Local types for the form (different from backend types)
type FormOrcamentoItem = {
  descricao: string
  marca: string
  quantidade: number
  valorUnitario: number
  linkRef: string
  custoRef?: number
}

type ClienteState = OrcamentoCliente

// Re-export types for compatibility
export type { OrcamentoCliente as ClienteState }
export type { OrcamentoItem } from "@/lib/api-client"

// Legacy function for compatibility - now uses backend
export async function getOrcamentosSync(): Promise<Orcamento[]> {
  return await getOrcamentos()
}

// Legacy function for compatibility - now uses backend
export async function deleteOrcamentoLocal(id: string): Promise<boolean> {
  const success = await import("@/lib/orcamentos").then(m => m.deleteOrcamento(id))
  if (success && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("erp-changed"))
  }
  return success
}

type OrcamentoFormProps = {
  orcamentoParaEdicao?: Orcamento | null
  onSalvoComSucesso?: () => void
}

export function OrcamentoForm({ orcamentoParaEdicao, onSalvoComSucesso }: OrcamentoFormProps = {}) {
  const { toast } = useToast()
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteIdSel, setClienteIdSel] = useState<string>("")
  const [cliente, setCliente] = useState<ClienteState>({ nome: "" })
  const [observacoes, setObservacoes] = useState("")
  const [itens, setItens] = useState<FormOrcamentoItem[]>([
    { descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined },
  ])
  const [hasDraft, setHasDraft] = useState(false)

  // Funções para gerenciar rascunho
  const saveDraft = () => {
    try {
      const draft = {
        cliente,
        clienteIdSel,
        observacoes,
        itens
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      localStorage.setItem(DRAFT_TIMESTAMP_KEY, new Date().toISOString())
      setHasDraft(true)
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error)
    }
  }

  const loadDraft = () => {
    try {
      const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (draftStr) {
        const draft = JSON.parse(draftStr)
        setCliente(draft.cliente || { nome: "" })
        setClienteIdSel(draft.clienteIdSel || "")
        setObservacoes(draft.observacoes || "")
        setItens(draft.itens || [{ descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined }])
        setHasDraft(true)
        toast({ title: "Rascunho carregado!", description: "Seus dados foram restaurados." })
      }
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error)
    }
  }

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      localStorage.removeItem(DRAFT_TIMESTAMP_KEY)
      setHasDraft(false)
    } catch (error) {
      console.error('Erro ao limpar rascunho:', error)
    }
  }

  // Carrega clientes inicialmente e sincroniza quando houver alterações
  useEffect(() => {
    async function loadClientes() {
      try {
        const clientesData = await getClientes()
        setClientes(clientesData)
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
        setClientes([])
      }
    }
    loadClientes()
    
    const reload = async () => {
      try {
        const clientesData = await getClientes()
        setClientes(clientesData)
      } catch (error) {
        console.error('Erro ao recarregar clientes:', error)
        setClientes([])
      }
    }
    window.addEventListener(ERP_CHANGED_EVENT, reload as EventListener)
    window.addEventListener("storage", reload)
    return () => {
      window.removeEventListener(ERP_CHANGED_EVENT, reload as EventListener)
      window.removeEventListener("storage", reload)
    }
  }, [])

  // Verifica se existe rascunho salvo ao carregar o componente
  useEffect(() => {
    const draftStr = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (draftStr) {
      setHasDraft(true)
    }
  }, [])

  // Auto-salvamento do rascunho a cada mudança (com debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Só salva se houver algum conteúdo
      if (cliente.nome.trim() || observacoes.trim() || itens.some(item => item.descricao.trim())) {
        saveDraft()
      }
    }, 2000) // Salva após 2 segundos de inatividade

    return () => clearTimeout(timer)
  }, [cliente, observacoes, itens, clienteIdSel])

  // Seleção do cliente cadastrado preenche o formulário
  useEffect(() => {
    if (!clienteIdSel) return
    const c = clientes.find((x) => x.id === clienteIdSel)
    if (c) {
      setCliente({
        id: c.id,
        nome: c.nome || "",
        documento: c.documento || "",
        telefone: c.telefone || "",
        email: c.email || "",
        endereco: c.endereco || "",
      })
    }
  }, [clienteIdSel, clientes])

  // Carrega dados do orçamento para edição
  useEffect(() => {
    if (orcamentoParaEdicao) {
      setCliente(orcamentoParaEdicao.cliente || { nome: "" })
      setObservacoes(orcamentoParaEdicao.observacoes || "")
      
      // Converte itens do backend para o formato do formulário
      const itensForm = orcamentoParaEdicao.itens.map(item => ({
        descricao: item.descricao,
        marca: item.marca || "",
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario,
        linkRef: item.link_ref || "",
        custoRef: item.custo_ref || undefined
      }))
      
      setItens(itensForm.length > 0 ? itensForm : [
        { descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined }
      ])
      
      // Limpa seleção de cliente cadastrado pois estamos editando
      setClienteIdSel("")
    }
  }, [orcamentoParaEdicao])

  const total = useMemo(
    () => itens.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0),
    [itens],
  )

  const addItem = () =>
    setItens((arr) => [
      ...arr,
      { descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined },
    ])

  const removeItem = (idx: number) => setItens((arr) => arr.filter((_, i) => i !== idx))

  const updateItem = (idx: number, patch: Partial<FormOrcamentoItem>) =>
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const canSave =
    cliente.nome.trim().length > 0 &&
    itens.length > 0 &&
    itens.every((it) => it.descricao.trim().length > 0 && it.quantidade > 0 && it.valorUnitario >= 0)

  const onSalvar = async () => {
    if (!canSave) return
    try {
      // Convert FormOrcamentoItem format to match backend API expectations
      const backendItens = itens.map(item => ({
        id: generateId(),
        produto_id: "", // Will need to be mapped if products are used
        descricao: item.descricao,
        marca: item.marca || "",
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario, // API expects valor_unitario
        desconto: 0,
        link_ref: item.linkRef || null,
        custo_ref: item.custoRef || null
      }))
      
      // Generate numero if creating new orcamento
      const numero = orcamentoParaEdicao ? orcamentoParaEdicao.numero : await generateOrcamentoNumber()
      
      // Use cliente_id from selected client, or existing cliente.id, or generate new one
      let cliente_id = clienteIdSel || cliente.id
      if (!cliente_id) {
        // If no client selected and no existing ID, generate one for the manually entered client
        cliente_id = generateId()
      }
      
      const dadosParaSalvar = orcamentoParaEdicao ? {
        id: orcamentoParaEdicao.id,
        numero: orcamentoParaEdicao.numero,
        cliente_id: cliente_id,
        data_orcamento: orcamentoParaEdicao.data,
        observacoes,
        itens: backendItens
      } : { 
        numero: numero, // Enviar o número completo no formato "número/ano"
        cliente_id: cliente_id,
        data_orcamento: new Date().toISOString(),
        observacoes,
        itens: backendItens
      }
      
      const result = await saveOrcamento(dadosParaSalvar)
      
      if (result) {
        if (!orcamentoParaEdicao) {
          // Só limpa o formulário se não estiver editando
          setCliente({ nome: "" })
          setClienteIdSel("")
          setObservacoes("")
          setItens([{ descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined }])
          clearDraft() // Limpa o rascunho após salvar com sucesso
        }
        
        const mensagem = orcamentoParaEdicao ? "Orçamento atualizado!" : "Orçamento salvo!"
        const descricao = orcamentoParaEdicao ? "As alterações foram salvas." : "Confira em 'Orçamentos Salvos'."
        toast({ title: mensagem, description: descricao })
        
        // Dispatch event to notify other components
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("erp-changed"))
        }
        
        // Chama callback se fornecido
        onSalvoComSucesso?.()
      } else {
        throw new Error("Falha ao salvar orçamento")
      }
    } catch (e) {
      console.error("Erro ao salvar orçamento:", e)
      toast({ title: "Erro ao salvar orçamento", description: "Tente novamente.", variant: "destructive" })
    }
  }

  return (
    <div className="grid gap-6">
      {/* Selecionar cliente cadastrado */}
      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <Label>Selecionar cliente cadastrado</Label>
            <Select value={clienteIdSel} onValueChange={setClienteIdSel}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um cliente" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {clientes.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    Nenhum cliente cadastrado
                  </SelectItem>
                ) : (
                  clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.documento ? `— ${c.documento}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A lista vem da aba Clientes. Ao cadastrar/editar lá, aparece aqui automaticamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente-nome">Nome</Label>
            <Input
              id="cliente-nome"
              placeholder="Ex.: ACME Ltda / João da Silva"
              value={cliente.nome}
              onChange={(e) => setCliente((c) => ({ ...c, nome: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente-doc">Documento (CNPJ/CPF)</Label>
            <Input
              id="cliente-doc"
              placeholder="00.000.000/0000-00"
              value={cliente.documento || ""}
              onChange={(e) => setCliente((c) => ({ ...c, documento: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente-tel">Telefone</Label>
            <Input
              id="cliente-tel"
              placeholder="(11) 99999-9999"
              value={cliente.telefone || ""}
              onChange={(e) => setCliente((c) => ({ ...c, telefone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cliente-email">E-mail</Label>
            <Input
              id="cliente-email"
              type="email"
              placeholder="contato@cliente.com"
              value={cliente.email || ""}
              onChange={(e) => setCliente((c) => ({ ...c, email: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="cliente-endereco">Endereço</Label>
            <Input
              id="cliente-endereco"
              placeholder="Rua, número, bairro, cidade - UF"
              value={cliente.endereco || ""}
              onChange={(e) => setCliente((c) => ({ ...c, endereco: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Itens do orçamento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Itens do Orçamento</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar item
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="min-w-[280px]">Produto/Serviço</TableHead>
                <TableHead className="w-[180px]">Marca</TableHead>
                <TableHead className="w-[88px]">Qtd</TableHead>
                <TableHead className="w-[160px]">Valor Unitário</TableHead>
                <TableHead className="w-[160px]">Subtotal</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((it, idx) => {
                const subtotal = (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)
                return (
                  <ItemRow
                    key={idx}
                    index={idx}
                    item={it}
                    subtotal={subtotal}
                    onChange={updateItem}
                    onRemove={removeItem}
                  />
                )
              })}
            </TableBody>
          </Table>

          <div className="mt-6 flex items-center justify-end">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold tabular-nums">{fmtCurrency(total)}</div>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Somente “Link ref.” e “Custo ref.” são privados e não aparecem no documento do cliente.
          </p>
        </CardContent>
      </Card>

      {/* Observações e ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Observações</CardTitle>
            {hasDraft && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Save className="h-3 w-3 mr-1" />
                Rascunho salvo automaticamente
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Condições de pagamento, validade do orçamento, etc."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onSalvar} disabled={!canSave}>
          {orcamentoParaEdicao ? "Atualizar Orçamento" : "Salvar Orçamento"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            saveDraft()
            toast({ title: "Rascunho salvo!", description: "Seus dados foram salvos localmente." })
          }}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Rascunho
        </Button>
        {hasDraft && (
          <Button
            type="button"
            variant="outline"
            onClick={loadDraft}
          >
            <Download className="h-4 w-4 mr-2" />
            Carregar Rascunho
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCliente({ nome: "" })
            setClienteIdSel("")
            setObservacoes("")
            setItens([{ descricao: "", marca: "", quantidade: 1, valorUnitario: 0, linkRef: "", custoRef: undefined }])
            clearDraft()
          }}
        >
          Limpar
        </Button>
      </div>
    </div>
  )
}

function ItemRow({
  index,
  item,
  subtotal,
  onChange,
  onRemove,
}: {
  index: number
  item: FormOrcamentoItem
  subtotal: number
  onChange: (idx: number, patch: Partial<FormOrcamentoItem>) => void
  onRemove: (idx: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <TableRow className={cn(open && "align-top")}>
      <TableCell className="align-top">
        <div className="space-y-2">
          <Input
            placeholder="Ex.: Velas aromáticas"
            value={item.descricao}
            onChange={(e) => onChange(index, { descricao: e.target.value })}
          />

          <div className="rounded-md border bg-muted/30 p-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={`privado-${index}`}
            >
              <span className="inline-flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Detalhes internos</span>
                <span className="text-xs text-muted-foreground">(não sai no documento)</span>
              </span>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {open && (
              <div id={`privado-${index}`} className="mt-3 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Link ref. (privado)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://loja.com/produto"
                        value={item.linkRef || ""}
                        onChange={(e) => onChange(index, { linkRef: e.target.value })}
                      />
                      {item.linkRef ? (
                        <a
                          href={item.linkRef}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent"
                          title="Abrir link de referência"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Custo ref. (privado)</Label>
                    <CurrencyInput
                      placeholder="0,00"
                      value={item.custoRef ?? ""}
                      onChange={(value) =>
                        onChange(index, { custoRef: value === "" ? undefined : Number(value.replace(',', '.')) })
                      }
                    />
                  </div>
                </div>
                
                {/* Informações calculadas */}
                {(item.custoRef !== undefined && item.custoRef !== null) && item.valorUnitario > 0 && (
                  <div className="grid gap-3 md:grid-cols-2 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Custo sobre Valor Unitário</Label>
                      <div className="text-sm font-medium text-muted-foreground">
                        {item.valorUnitario > 0 ? ((item.custoRef / item.valorUnitario) * 100).toFixed(1) : '0'}% do valor de venda
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Margem de Lucro</Label>
                      <div className={`text-sm font-medium ${
                        item.valorUnitario > item.custoRef ? 'text-green-600' : 
                        item.valorUnitario < item.custoRef ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {item.valorUnitario > 0 
                          ? `${(((item.valorUnitario - item.custoRef) / item.valorUnitario) * 100).toFixed(1)}%`
                          : '0%'
                        }
                        {item.valorUnitario < item.custoRef && ' (Prejuízo)'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="align-top">
        <Input
          placeholder="Ex.: Marca X"
          value={item.marca || ""}
          onChange={(e) => onChange(index, { marca: e.target.value })}
        />
      </TableCell>

      <TableCell className="align-top">
        <Input
          type="number"
          min={0}
          step="1"
          value={item.quantidade}
          onChange={(e) => onChange(index, { quantidade: Number(e.target.value) })}
        />
      </TableCell>

      <TableCell className="align-top">
        <CurrencyInput
          value={item.valorUnitario}
          onChange={(value) => onChange(index, { valorUnitario: Number(value.replace(',', '.')) })}
          placeholder="0,00"
        />
      </TableCell>

      <TableCell className="align-top font-medium">{fmtCurrency(subtotal)}</TableCell>

      <TableCell className="align-top text-right">
        <Button variant="ghost" size="icon" aria-label="Remover item" onClick={() => onRemove(index)} disabled={false}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default OrcamentoForm
