"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Download, Edit, CheckCheck, X } from "lucide-react"
import { fmtCurrency } from "@/lib/format"
import OrcamentoForm from "@/components/orcamento-form"
import { getOrcamentos, deleteOrcamento, aprovarOrcamento, desaprovarOrcamento, type Orcamento } from "@/lib/orcamentos"
import { AppHeader } from "@/components/app-header"
import { makeOrcamentoHTML, downloadPDF } from "@/lib/print"
import { ensureDefaultEmpresa } from "@/lib/empresas"

// Using backend types
type LocalOrcamento = Orcamento

function totalOrcamento(o: LocalOrcamento) {
  if (!o.itens || !Array.isArray(o.itens)) {
    return 0
  }
  return o.itens.reduce((acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0) - (Number(it.desconto) || 0), 0)
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<LocalOrcamento[]>([])
  const [orcamentoEditando, setOrcamentoEditando] = useState<LocalOrcamento | null>(null)
  const [tabAtiva, setTabAtiva] = useState("criar")

  const reload = async () => {
    try {
      const data = await getOrcamentos()
      setOrcamentos(data)
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error)
      setOrcamentos([])
    }
  }

  useEffect(() => {
    reload()
    const onChange = () => reload()
    window.addEventListener("erp-changed", onChange as EventListener)
    window.addEventListener("storage", onChange)
    return () => {
      window.removeEventListener("erp-changed", onChange as EventListener)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const handleBaixarPDF = async (o: LocalOrcamento) => {
    // Garante empresa atual definida nas Configurações Gerais
    await ensureDefaultEmpresa()
    // Passa o total calculado para o gerador de HTML
    const withTotal = { ...o, total: totalOrcamento(o) }
    const html = await makeOrcamentoHTML(withTotal as any)
    await downloadPDF(html, `Orcamento_${o.numero}`)
  }

  const handleEditar = (o: LocalOrcamento) => {
    setOrcamentoEditando(o)
    setTabAtiva("criar")
  }

  const handleCancelarEdicao = () => {
    setOrcamentoEditando(null)
  }

  const handleSalvoComSucesso = () => {
    setOrcamentoEditando(null)
    setTabAtiva("salvos")
    reload()
  }

  return (
    <>
      <AppHeader />
      <main className="container mx-auto max-w-6xl space-y-6 p-4">
        <h1 className="text-2xl font-semibold">Orçamentos</h1>

        <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
          <TabsList>
            <TabsTrigger value="criar">
              {orcamentoEditando ? "Editar Orçamento" : "Criar Orçamento"}
            </TabsTrigger>
            <TabsTrigger value="salvos">Orçamentos Salvos</TabsTrigger>
          </TabsList>

          <TabsContent value="criar" className="mt-4">
            {orcamentoEditando && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">Editando Orçamento #{orcamentoEditando.numero}</h3>
                    <p className="text-sm text-blue-700">Cliente: {orcamentoEditando.cliente?.nome}</p>
                  </div>
                  <Button variant="outline" onClick={handleCancelarEdicao}>
                    Cancelar Edição
                  </Button>
                </div>
              </div>
            )}
            <OrcamentoForm 
              orcamentoParaEdicao={orcamentoEditando}
              onSalvoComSucesso={handleSalvoComSucesso}
            />
          </TabsContent>

          <TabsContent value="salvos" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Orçamentos Salvos</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orcamentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum orçamento salvo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orcamentos.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>{o.numero}</TableCell>
                          <TableCell>{o.cliente?.nome}</TableCell>
                          <TableCell>{new Date(o.data).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              o.status === 'aprovado' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {o.status === 'aprovado' ? 'Aprovado' : 'Pendente'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{fmtCurrency(totalOrcamento(o))}</TableCell>
                          <TableCell className="flex justify-end gap-2">
                            {o.status === 'aprovado' ? (
                              <Button
                                variant="outline"
                                size="icon"
                                title="Desaprovar orçamento"
                                onClick={async () => {
                                  try {
                                    const success = await desaprovarOrcamento(o.id)
                                    if (success) {
                                      await reload()
                                    }
                                  } catch (error) {
                                    console.error('Erro ao desaprovar orçamento:', error)
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                title="Aprovar orçamento"
                                onClick={async () => {
                                  try {
                                    const success = await aprovarOrcamento(o.id)
                                    if (success) {
                                      await reload()
                                    }
                                } catch (error) {
                                  console.error("Erro ao aprovar orçamento:", error)
                                }
                              }}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCheck className="h-4 w-4" />
                              <span className="sr-only">Aprovar</span>
                            </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              title="Editar orçamento"
                              onClick={() => handleEditar(o)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Baixar PDF do orçamento"
                              onClick={() => handleBaixarPDF(o)}
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Baixar PDF</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              title="Excluir orçamento"
                              onClick={async () => {
                                try {
                                  const success = await deleteOrcamento(o.id)
                                  if (success) {
                                    await reload()
                                  }
                                } catch (error) {
                                  console.error("Erro ao deletar orçamento:", error)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Excluir</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}
