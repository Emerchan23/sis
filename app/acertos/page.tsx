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
import { AppHeader } from "@/components/app-header"
import { ensureDefaultEmpresa } from "@/lib/empresas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  criarAcerto,
  getAcertos,
  getParticipantes,
  pendenciasDeAcerto,
  saveParticipante,
  deleteParticipante,
  updateAcerto,
  cancelarAcerto,
  getDespesasPendentes,
  saveDespesaPendente,
  deleteDespesaPendente,
  markDespesasUsadas,
  getUltimosRecebimentos,
  saveUltimoRecebimento,
  deleteUltimoRecebimento,
  type Participante,
  type Acerto,
  type Despesa,
  type DespesaPendente,
  type UltimoRecebimento,
} from "@/lib/acertos"
import type { LinhaVenda } from "@/lib/planilha"
import { fmtCurrency } from "@/lib/format"
import { toast } from "@/hooks/use-toast"
import { Plus, Users, Receipt, Pencil, Eye, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DespesasPendentesPanel from "@/components/acertos/despesas-pendentes-panel"
import DespesasEditor from "@/components/acertos/despesas-editor"

export default function AcertosPage() {
  // Participantes
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [nomePart, setNomePart] = useState("")
  const [defaultPercent, setDefaultPercent] = useState("")

  // Pendências de linhas
  const [pendentes, setPendentes] = useState<LinhaVenda[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  // Despesas do acerto (cesta)
  const [despesas, setDespesas] = useState<Despesa[]>([])

  // Despesas pendentes salvas
  const [despesasPendentes, setDespesasPendentes] = useState<DespesaPendente[]>([])
  const [usadasNesteAcerto, setUsadasNesteAcerto] = useState<string[]>([])

  // Último recebimento (acerto atual)
  const [bancoNome, setBancoNome] = useState("")
  const [bancoValor, setBancoValor] = useState("")
  const [bancoData, setBancoData] = useState("") // yyyy-mm-dd
  const [bancoInstituicao, setBancoInstituicao] = useState("")
  const [bancoLocked, setBancoLocked] = useState(false)

  // Últimos recebimentos salvos no banco
  const [ultimosRecebimentos, setUltimosRecebimentos] = useState<UltimoRecebimento[]>([])
  const [currentRecebimentoId, setCurrentRecebimentoId] = useState<string | null>(null)

  // Distribuição
  const [observacoes, setObservacoes] = useState("")
  const [titulo, setTitulo] = useState("")
  const [dist, setDist] = useState<Record<string, number>>({})

  // Histórico
  const [acertos, setAcertos] = useState<Acerto[]>([])

  // Modal de edição do "último recebimento" no histórico
  const [editRecOpen, setEditRecOpen] = useState(false)
  const [editAcertoId, setEditAcertoId] = useState<string>("")
  const [editBancoNome, setEditBancoNome] = useState("")
  const [editBancoValor, setEditBancoValor] = useState("")
  const [editBancoData, setEditBancoData] = useState("")
  const [editBancoInstituicao, setEditBancoInstituicao] = useState("")

  // Modal de visualização de acerto
  const [viewAcertoOpen, setViewAcertoOpen] = useState(false)
  const [selectedAcerto, setSelectedAcerto] = useState<Acerto | null>(null)

  useEffect(() => {
    refreshAll()
    const onAny = () => {
      refreshAll().catch(error => {
        console.error('Erro ao atualizar dados:', error)
      })
    }
    if (typeof window !== "undefined") {
      window.addEventListener("ERP_CHANGED_EVENT" as any, onAny)
      window.addEventListener("storage", onAny)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ERP_CHANGED_EVENT" as any, onAny)
        window.removeEventListener("storage", onAny)
      }
    }
  }, [])

  async function refreshAll() {
    try {
      // Garantir que existe uma empresa padrão selecionada
      await ensureDefaultEmpresa()
      const [participantesData, acertosData, despesasPendentesData, pendentesData, ultimosRecebimentosData] = await Promise.all([
        getParticipantes(),
        getAcertos(),
        getDespesasPendentes(),
        pendenciasDeAcerto(),
        getUltimosRecebimentos()
      ])
      
      setParticipantes(participantesData)
      setAcertos(acertosData)
      setDespesasPendentes(despesasPendentesData.filter((d) => d.status === "pendente"))
      setPendentes(pendentesData)
      setUltimosRecebimentos(ultimosRecebimentosData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setParticipantes([])
      setAcertos([])
      setDespesasPendentes([])
      setPendentes([])
      setUltimosRecebimentos([])
    }
  }

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])

  const totalLucroSel = useMemo(
    () => pendentes.filter((l) => selectedIds.includes(l.id)).reduce((a, l) => a + (l.lucroValor || 0), 0),
    [pendentes, selectedIds],
  )
  const totalRateio = useMemo(
    () => despesas.filter((d) => d.tipo === "rateio").reduce((a, d) => a + (d.valor || 0), 0),
    [despesas],
  )
  const baseDistribuivel = useMemo(() => Math.max(totalLucroSel - totalRateio, 0), [totalLucroSel, totalRateio])

  const indivPorPart = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of despesas) {
      if (d.tipo === "individual" && d.participanteId) {
        map[d.participanteId] = (map[d.participanteId] || 0) + (d.valor || 0)
      }
    }
    return map
  }, [despesas])

  function distribuirIgual() {
    if (participantes.length === 0) return
    const base = +(100 / participantes.length).toFixed(4)
    const d: Record<string, number> = {}
    participantes.forEach((p, idx) => {
      d[p.id] = idx === participantes.length - 1 ? +(100 - base * (participantes.length - 1)).toFixed(4) : base
    })
    setDist(d)
  }

  // Callbacks para os componentes de despesas
  function onAddDespesa(payload: Omit<Despesa, "id">) {
    const nova: Despesa = { id: generateId(), ...payload }
    setDespesas((d) => [nova, ...d])
  }
  function onRemoveDespesa(id: string) {
    setDespesas((d) => d.filter((x) => x.id !== id))
  }
  async function onSavePendente(payload: Omit<Despesa, "id">) {
    try {
      await saveDespesaPendente(payload as any)
      const despesasPendentesData = await getDespesasPendentes()
      setDespesasPendentes(despesasPendentesData.filter((d) => d.status === "pendente"))
      toast({ title: "Despesa salva para acerto futuro." })
    } catch (error) {
      console.error('Erro ao salvar despesa pendente:', error)
      toast({ title: "Erro ao salvar despesa", variant: "destructive" })
    }
  }
  function onUsePendentes(ids: string[]) {
    if (!ids.length) return
    const pend = despesasPendentes.filter((d) => ids.includes(d.id))
    const toAdd: Despesa[] = pend.map((p) => ({
      id: generateId(),
      descricao: p.descricao,
      valor: p.valor,
      tipo: p.tipo,
      participanteId: p.participanteId,
    }))
    setDespesas((d) => [...toAdd, ...d])
    setUsadasNesteAcerto((prev) => [...prev, ...ids])
    toast({ title: `Adicionadas ${toAdd.length} despesa(s) ao acerto.` })
  }
  async function onDeletePendentes(ids: string[]) {
    try {
      await Promise.all(ids.map(id => deleteDespesaPendente(id)))
      const despesasPendentesData = await getDespesasPendentes()
      setDespesasPendentes(despesasPendentesData.filter((d) => d.status === "pendente"))
      toast({ title: "Despesas pendentes excluídas." })
    } catch (error) {
      console.error('Erro ao deletar despesas pendentes:', error)
      toast({ title: "Erro ao deletar despesas", variant: "destructive" })
    }
  }

  async function salvarAcerto() {
    if (selectedIds.length === 0) {
      toast({ title: "Selecione ao menos uma venda recebida pendente de acerto." })
      return
    }
    if (participantes.length === 0) {
      toast({ title: "Cadastre ao menos um participante." })
      return
    }
    const soma = participantes.reduce((a, p) => a + (dist[p.id] ?? p.defaultPercent ?? 0), 0)
    if (Math.abs(soma - 100) > 0.01) {
      toast({ title: "A soma dos percentuais deve ser 100%." })
      return
    }
    
    try {
      const distribuicoes = participantes.map((p) => ({
        participanteId: p.id,
        percentual: dist[p.id] ?? p.defaultPercent ?? 0,
      }))

      const nome = bancoNome.trim()
      const valNum = Number(bancoValor || "0")
      const banco = bancoInstituicao.trim()
      const dataISO = bancoData ? new Date(bancoData).toISOString() : undefined
      const anyField = !!(nome || banco || dataISO || (isFinite(valNum) && valNum > 0))
      const ultimoRecebimentoBanco = anyField
        ? {
            nome: nome || undefined,
            valor: isFinite(valNum) ? +valNum.toFixed(2) : undefined,
            banco: banco || undefined,
            data: dataISO,
          }
        : undefined

      const { acertoId } = await criarAcerto({
        titulo: titulo.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        linhaIds: selectedIds,
        distribuicoes,
        despesas,
        ultimoRecebimentoBanco,
      })

      if (usadasNesteAcerto.length) {
        await markDespesasUsadas(usadasNesteAcerto, acertoId)
      }

      // reset UI
      setSelected({})
      setTitulo("")
      setObservacoes("")
      setDespesas([])
      setUsadasNesteAcerto([])
      setBancoNome("")
      setBancoValor("")
      setBancoData("")
      setBancoInstituicao("")
      setBancoLocked(false)
      await refreshAll()
      toast({ title: `Acerto criado (${acertoId}) com sucesso!` })
    } catch (error) {
      console.error('Erro ao criar acerto:', error)
      toast({ title: "Erro ao criar acerto", variant: "destructive" })
    }
  }

  // Participantes CRUD
  async function addParticipante() {
    if (!nomePart.trim()) return
    const dp = Number(defaultPercent || "0")
    const sane = isFinite(dp) ? dp : 0
    
    try {
      await saveParticipante({ nome: nomePart.trim(), defaultPercent: sane, ativo: true })
      setNomePart("")
      setDefaultPercent("")
      const updatedParticipantes = await getParticipantes()
      setParticipantes(updatedParticipantes)
      toast({ title: "Participante adicionado com sucesso!" })
    } catch (error) {
      console.error('Erro ao adicionar participante:', error)
      toast({ title: "Erro ao adicionar participante", variant: "destructive" })
    }
  }

  // Salvar último recebimento no banco
  async function salvarUltimoRecebimento() {
    if (!bancoNome.trim() && !bancoValor.trim() && !bancoData && !bancoInstituicao.trim()) {
      toast({ title: "Preencha pelo menos um campo para salvar." })
      return
    }

    try {
      const recebimento = {
        id: currentRecebimentoId || undefined,
        nome: bancoNome.trim() || undefined,
        valor: bancoValor ? Number(bancoValor) : undefined,
        data_transacao: bancoData || undefined,
        banco: bancoInstituicao.trim() || undefined
      }

      const id = await saveUltimoRecebimento(recebimento)
      setCurrentRecebimentoId(id)
      setBancoLocked(true)
      await refreshAll()
      toast({ title: "Último recebimento salvo no banco de dados!" })
    } catch (error) {
      console.error('Erro ao salvar último recebimento:', error)
      toast({ title: "Erro ao salvar último recebimento", variant: "destructive" })
    }
  }

  // Deletar último recebimento do banco
  async function deletarUltimoRecebimento() {
    if (!currentRecebimentoId) {
      toast({ title: "Nenhum recebimento selecionado para deletar." })
      return
    }

    try {
      await deleteUltimoRecebimento(currentRecebimentoId)
      // Limpar formulário
      setBancoNome("")
      setBancoValor("")
      setBancoData("")
      setBancoInstituicao("")
      setBancoLocked(false)
      setCurrentRecebimentoId(null)
      await refreshAll()
      toast({ title: "Último recebimento deletado do banco de dados!" })
    } catch (error) {
      console.error('Erro ao deletar último recebimento:', error)
      toast({ title: "Erro ao deletar último recebimento", variant: "destructive" })
    }
  }

  // Editar "último recebimento" no histórico
  function openEditReceb(a: Acerto) {
    setEditAcertoId(a.id)
    setEditBancoNome(a.ultimoRecebimentoBanco?.nome || "")
    setEditBancoValor(a.ultimoRecebimentoBanco?.valor != null ? String(a.ultimoRecebimentoBanco.valor) : "")
    setEditBancoData(a.ultimoRecebimentoBanco?.data ? a.ultimoRecebimentoBanco.data.slice(0, 10) : "")
    setEditBancoInstituicao(a.ultimoRecebimentoBanco?.banco || "")
    setEditRecOpen(true)
  }
  async function saveEditReceb() {
    if (!editAcertoId) return
    const nome = editBancoNome.trim()
    const val = Number(editBancoValor || "0")
    const banco = editBancoInstituicao.trim()
    const dataISO = editBancoData ? new Date(editBancoData).toISOString() : undefined
    const anyField = !!(nome || banco || dataISO || (isFinite(val) && val > 0))
    const payload = anyField
      ? {
          nome: nome || undefined,
          valor: isFinite(val) ? +val.toFixed(2) : undefined,
          banco: banco || undefined,
          data: dataISO,
        }
      : undefined
    
    try {
      await updateAcerto(editAcertoId, { ultimoRecebimentoBanco: payload })
      setEditRecOpen(false)
      setEditAcertoId("")
      await refreshAll()
      toast({ title: "Último recebimento atualizado." })
    } catch (error) {
      console.error('Erro ao atualizar acerto:', error)
      toast({ title: "Erro ao atualizar último recebimento", variant: "destructive" })
    }
  }

  async function cancelarAcertoHandler(acerto: Acerto) {
    if (!confirm(`Tem certeza que deseja cancelar o acerto "${acerto.titulo || 'Sem título'}"?\n\nEsta ação irá:\n- Deletar o acerto permanentemente\n- Retornar ${acerto.linhaIds.length} venda(s) para status "Pendente"\n- Liberar despesas pendentes usadas neste acerto`)) {
      return
    }
    
    try {
      const result = await cancelarAcerto(acerto.id)
      await refreshAll()
      toast({ 
        title: "Acerto cancelado com sucesso!", 
        description: `${result.vendasRetornadas} venda(s) retornaram para status pendente.`
      })
    } catch (error) {
      console.error('Erro ao cancelar acerto:', error)
      toast({ 
        title: "Erro ao cancelar acerto", 
        description: "Tente novamente.",
        variant: "destructive" 
      })
    }
  }

  function openViewAcerto(acerto: Acerto) {
    setSelectedAcerto(acerto)
    setViewAcertoOpen(true)
  }

  return (
    <div className="min-h-screen">
        <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        {/* Participantes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participantes da divisão de lucros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Nome</Label>
                <Input
                  value={nomePart}
                  onChange={(e) => setNomePart(e.target.value)}
                  placeholder="Nome do participante"
                />
              </div>
              <div>
                <Label>Percentual padrão</Label>
                <CurrencyInput
                  value={defaultPercent}
                  onChange={setDefaultPercent}
                  placeholder="Ex.: 25,5"
                  showCurrency={false}
                  suffix="%"
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={addParticipante}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Percentual padrão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantes.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{(p.defaultPercent ?? 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            try {
                              await deleteParticipante(p.id)
                              const updatedParticipantes = await getParticipantes()
                              setParticipantes(updatedParticipantes)
                              toast({ title: "Participante removido com sucesso!" })
                            } catch (error) {
                              console.error('Erro ao remover participante:', error)
                              toast({ title: "Erro ao remover participante", variant: "destructive" })
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {participantes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum participante cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pendentes de acerto (linhas) */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas pendentes de acerto</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={pendentes.length > 0 && selectedIds.length === pendentes.length}
                        onCheckedChange={(v) => {
                          const on = Boolean(v)
                          setSelected(on ? Object.fromEntries(pendentes.map((l) => [l.id, true])) : {})
                        }}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Lucro (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentes.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected[l.id]}
                          onCheckedChange={(v) => setSelected((s) => ({ ...s, [l.id]: Boolean(v) }))}
                          aria-label="Selecionar linha"
                        />
                      </TableCell>
                      <TableCell>{l.dataPedido ? new Date(l.dataPedido).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell className="max-w-[180px] truncate" title={l.cliente || ""}>
                        {l.cliente || "-"}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate" title={l.produto || ""}>
                        {l.produto || "-"}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium text-emerald-700">
                        {fmtCurrency(l.lucroValor || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendentes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Não há vendas “RECEBIDO VALOR” pendentes de acerto.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 text-sm">
                <span className="text-muted-foreground">Selecionadas:</span>{" "}
                <span className="font-medium">{selectedIds.length}</span>
                <span className="ml-3 text-muted-foreground">Lucro total:</span>{" "}
                <span className="font-semibold tabular-nums">{fmtCurrency(totalLucroSel)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Despesas + Distribuição + Último recebimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Despesas e distribuição do acerto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Último recebimento */}
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Último recebimento no banco</div>
                  <div className="flex items-center gap-2">
                    {!bancoLocked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={salvarUltimoRecebimento}
                      >
                        Salvar
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => setBancoLocked(false)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={deletarUltimoRecebimento}
                        >
                          Deletar
                        </Button>
                        <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setBancoNome("")
                          setBancoValor("")
                          setBancoData("")
                          setBancoInstituicao("")
                          setBancoLocked(false)
                          setCurrentRecebimentoId(null)
                        }}
                      >
                        Novo
                      </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <Label>Nome / Identificador</Label>
                    <Input
                      value={bancoNome}
                      onChange={(e) => setBancoNome(e.target.value)}
                      placeholder="Ex.: Cliente XPTO / Identificador"
                      disabled={bancoLocked}
                    />
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <Input
                      value={bancoValor}
                      onChange={(e) => setBancoValor(e.target.value)}
                      placeholder="0,00"
                      disabled={bancoLocked}
                    />
                  </div>
                  <div>
                    <Label>Data da transação</Label>
                    <Input
                      type="date"
                      value={bancoData}
                      onChange={(e) => setBancoData(e.target.value)}
                      disabled={bancoLocked}
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label>Nome do banco</Label>
                    <Input
                      value={bancoInstituicao}
                      onChange={(e) => setBancoInstituicao(e.target.value)}
                      placeholder="Ex.: Nubank, Itaú, Bradesco..."
                      disabled={bancoLocked}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Essa informação é opcional e será salva junto ao acerto.
                </p>
              </div>

              {/* Últimos recebimentos salvos no banco */}
              {ultimosRecebimentos.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <div className="text-sm font-medium mb-3">Últimos recebimentos salvos no banco</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {ultimosRecebimentos.slice(0, 5).map((rec) => (
                        <div
                          key={rec.id}
                          className={`p-2 border rounded cursor-pointer hover:bg-muted/50 ${
                            currentRecebimentoId === rec.id ? 'bg-muted border-primary' : ''
                          }`}
                          onClick={() => {
                            setBancoNome(rec.nome || "")
                            setBancoValor(rec.valor?.toString() || "")
                            setBancoData(rec.data_transacao ? rec.data_transacao.split('T')[0] : "")
                            setBancoInstituicao(rec.banco || "")
                            setCurrentRecebimentoId(rec.id)
                            setBancoLocked(true)
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{rec.nome || 'Sem nome'}</div>
                              <div className="text-xs text-muted-foreground">
                                {rec.banco && `${rec.banco} • `}
                                {rec.valor && `${fmtCurrency(rec.valor)} • `}
                                {rec.data_transacao && new Date(rec.data_transacao).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-4" />

              {/* Despesas salvas anteriormente */}
              <DespesasPendentesPanel
                pendentes={despesasPendentes}
                participantes={participantes}
                onUse={onUsePendentes}
                onDelete={onDeletePendentes}
              />

              {/* Editor de despesas do acerto */}
              <DespesasEditor
                participantes={participantes}
                despesas={despesas}
                onAdd={onAddDespesa}
                onRemove={onRemoveDespesa}
                onSavePendente={onSavePendente}
                className="mt-4"
              />

              {/* Resumo / Observações / Distribuição */}
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Total líquido para distribuir</Label>
                  <Input readOnly value={fmtCurrency(baseDistribuivel)} className="bg-green-100 border-green-200" />
                </div>
                <div className="md:col-span-3">
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Detalhes do acerto (opcional)"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" type="button" onClick={distribuirIgual}>
                  Distribuir igualmente
                </Button>
                <div className="text-sm text-muted-foreground">
                  Soma dos percentuais:{" "}
                  <span className="font-medium">
                    {participantes.reduce((a, p) => a + (dist[p.id] ?? p.defaultPercent ?? 0), 0).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Participante</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Bruto</TableHead>
                      <TableHead>Despesas indiv.</TableHead>
                      <TableHead>Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participantes.map((p) => {
                      const perc = dist[p.id] ?? p.defaultPercent ?? 0
                      const bruto = +(baseDistribuivel * (perc / 100)).toFixed(2)
                      const indiv = +despesas
                        .filter((d) => d.tipo === "individual" && d.participanteId === p.id)
                        .reduce((a, d) => a + (d.valor || 0), 0)
                        .toFixed(2)
                      const liquido = +(bruto - indiv).toFixed(2)
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell className="w-36">
                            <CurrencyInput
                              value={String(perc)}
                              onChange={(value) => setDist((d) => ({ ...d, [p.id]: Number(value.replace(',', '.') || "0") }))}
                              placeholder="0,00"
                              showCurrency={false}
                              suffix="%"
                            />
                          </TableCell>
                          <TableCell className="tabular-nums">{fmtCurrency(bruto)}</TableCell>
                          <TableCell className="tabular-nums text-red-600">{fmtCurrency(indiv)}</TableCell>
                          <TableCell className="tabular-nums font-semibold text-emerald-700">
                            {fmtCurrency(liquido)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {participantes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Cadastre participantes para definir a distribuição.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={salvarAcerto} disabled={pendentes.length === 0}>
                  Salvar acerto e marcar linhas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de acertos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Linhas</TableHead>
                  <TableHead>Total Lucro</TableHead>
                  <TableHead>Desp. Rateio</TableHead>
                  <TableHead>Desp. Individuais</TableHead>
                  <TableHead>Total Líquido</TableHead>
                  <TableHead>Últ. Receb. (Nome)</TableHead>
                  <TableHead>Últ. Receb. (Valor)</TableHead>
                  <TableHead>Últ. Receb. (Data)</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acertos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.data).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={a.titulo || ""}>
                      {a.titulo || "-"}
                    </TableCell>
                    <TableCell>{a.linhaIds.length}</TableCell>
                    <TableCell className="tabular-nums">{fmtCurrency(a.totalLucro)}</TableCell>
                    <TableCell className="tabular-nums text-amber-700">{fmtCurrency(a.totalDespesasRateio)}</TableCell>
                    <TableCell className="tabular-nums text-red-700">
                      {fmtCurrency(a.totalDespesasIndividuais)}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium text-emerald-700">
                      {fmtCurrency(a.totalLiquidoDistribuivel)}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate" title={a.ultimoRecebimentoBanco?.nome || ""}>
                      {a.ultimoRecebimentoBanco?.nome || "-"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {a.ultimoRecebimentoBanco?.valor != null ? fmtCurrency(a.ultimoRecebimentoBanco.valor) : "-"}
                    </TableCell>
                    <TableCell>
                      {a.ultimoRecebimentoBanco?.data
                        ? new Date(a.ultimoRecebimentoBanco.data).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate" title={a.ultimoRecebimentoBanco?.banco || ""}>
                      {a.ultimoRecebimentoBanco?.banco || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => openViewAcerto(a)}>
                          <Eye className="mr-2 h-4 w-4" /> Visualizar
                        </Button>
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => openEditReceb(a)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar receb.
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50" 
                          onClick={() => cancelarAcertoHandler(a)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Cancelar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {acertos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
                      Nenhum acerto registrado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal editar último recebimento no histórico */}
        <Dialog open={editRecOpen} onOpenChange={setEditRecOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar último recebimento (banco)</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Nome / Identificador</Label>
                <Input
                  value={editBancoNome}
                  onChange={(e) => setEditBancoNome(e.target.value)}
                  placeholder="Ex.: Cliente XPTO / Identificador"
                />
              </div>
              <div>
                <Label>Valor</Label>
                <CurrencyInput
                  value={editBancoValor}
                  onChange={setEditBancoValor}
                  placeholder="0,00"
                  showCurrency={true}
                />
              </div>
              <div>
                <Label>Data da transação</Label>
                <Input type="date" value={editBancoData} onChange={(e) => setEditBancoData(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3">
              <div>
                <Label>Nome do banco</Label>
                <Input
                  value={editBancoInstituicao}
                  onChange={(e) => setEditBancoInstituicao(e.target.value)}
                  placeholder="Ex.: Nubank, Itaú, Bradesco..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditRecOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => {
                  setEditBancoNome("")
                  setEditBancoValor("")
                  setEditBancoData("")
                  setEditBancoInstituicao("")
                }}
              >
                Limpar
              </Button>
              <Button
                onClick={() => {
                  saveEditReceb()
                }}
              >
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de visualização de acerto */}
        <Dialog open={viewAcertoOpen} onOpenChange={setViewAcertoOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualizar Acerto</DialogTitle>
            </DialogHeader>
            {selectedAcerto && (
              <div className="space-y-6">
                {/* Informações básicas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Data</label>
                    <p className="text-sm">{new Date(selectedAcerto.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Título</label>
                    <p className="text-sm">{selectedAcerto.titulo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p className="text-sm">{selectedAcerto.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total de Linhas</label>
                    <p className="text-sm">{selectedAcerto.linhas?.length || 0}</p>
                  </div>
                </div>

                {/* Último recebimento banco */}
                {selectedAcerto.ultimoRecebimentoBanco && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Último Recebimento Banco</h3>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Nome</label>
                        <p className="text-sm">{selectedAcerto.ultimoRecebimentoBanco.nome}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Valor</label>
                        <p className="text-sm">R$ {selectedAcerto.ultimoRecebimentoBanco.valor?.toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Banco</label>
                        <p className="text-sm">{selectedAcerto.ultimoRecebimentoBanco.banco}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Data</label>
                        <p className="text-sm">{selectedAcerto.ultimoRecebimentoBanco.data ? new Date(selectedAcerto.ultimoRecebimentoBanco.data).toLocaleDateString('pt-BR') : '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Linhas do acerto */}
                {selectedAcerto.linhas && selectedAcerto.linhas.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Linhas do Acerto</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Produto</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Cliente</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Valor Venda</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Lucro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAcerto.linhas.map((linha, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2 text-sm">{linha.produto || '-'}</td>
                              <td className="px-4 py-2 text-sm">{linha.cliente || '-'}</td>
                              <td className="px-4 py-2 text-sm">R$ {linha.valorVenda.toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm">R$ {linha.lucroValor.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Observações */}
                {selectedAcerto.observacoes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Observações</label>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">{selectedAcerto.observacoes}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setViewAcertoOpen(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      </div>
  )
}
