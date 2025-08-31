"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  deleteCapitalRate,
  deleteImpostoRate,
  getCapitalRates,
  getImpostoRates,
  saveCapitalRate,
  saveImpostoRate,
  type Rate,
} from "@/lib/rates"

export function ManageRatesDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved?: () => void
}) {
  const [capital, setCapital] = useState<Rate[]>([])
  const [imposto, setImposto] = useState<Rate[]>([])
  const [nomeCap, setNomeCap] = useState("")
  const [percCap, setPercCap] = useState("")
  const [nomeImp, setNomeImp] = useState("")
  const [percImp, setPercImp] = useState("")

  async function refresh() {
    try {
      const [capitalRates, impostoRates] = await Promise.all([
        getCapitalRates(),
        getImpostoRates()
      ])
      setCapital(capitalRates)
      setImposto(impostoRates)
      onSaved?.()
    } catch (error) {
      console.error('Error loading rates:', error)
      setCapital([])
      setImposto([])
    }
  }
  useEffect(() => {
    if (open) refresh()
  }, [open])

  async function addCapital() {
    const p = Number(percCap.replace(",", "."))
    if (!nomeCap || isNaN(p)) return
    
    const trimmedName = nomeCap.trim()
    
    try {
      // Refresh the list to get the most current data before checking
      const currentCapitalRates = await getCapitalRates()
      
      // Check for duplicate names with fresh data
      const existingRate = currentCapitalRates.find(r => r.nome.toLowerCase() === trimmedName.toLowerCase())
      if (existingRate) {
        alert('Já existe uma taxa de capital com este nome!')
        return
      }
      
      await saveCapitalRate({ nome: trimmedName, percentual: p })
      setNomeCap("")
      setPercCap("")
      await refresh()
    } catch (error) {
      console.error('Error saving capital rate:', error)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        alert('Já existe uma taxa de capital com este nome!')
      } else {
        alert('Erro ao salvar taxa de capital. Tente novamente.')
      }
    }
  }
  async function addImposto() {
    const p = Number(percImp.replace(",", "."))
    if (!nomeImp || isNaN(p)) return
    
    const trimmedName = nomeImp.trim()
    
    try {
      // Refresh the list to get the most current data before checking
      const currentImpostoRates = await getImpostoRates()
      
      // Check for duplicate names with fresh data
      const existingRate = currentImpostoRates.find(r => r.nome.toLowerCase() === trimmedName.toLowerCase())
      if (existingRate) {
        alert('Já existe uma taxa de imposto com este nome!')
        return
      }
      
      await saveImpostoRate({ nome: trimmedName, percentual: p })
      setNomeImp("")
      setPercImp("")
      await refresh()
    } catch (error) {
      console.error('Error saving imposto rate:', error)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        alert('Já existe uma taxa de imposto com este nome!')
      } else {
        alert('Erro ao salvar taxa de imposto. Tente novamente.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Taxas</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Taxas de Capital</h3>
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3">
                <Label className="sr-only" htmlFor="nomeCap">
                  Nome
                </Label>
                <Input
                  id="nomeCap"
                  placeholder="Nome (ex.: Capital 3%)"
                  value={nomeCap}
                  onChange={(e) => setNomeCap(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="sr-only" htmlFor="percCap">
                  Percentual
                </Label>
                <CurrencyInput
                  id="percCap"
                  placeholder="Ex.: 3,5"
                  value={percCap}
                  onChange={setPercCap}
                />
              </div>
              <div className="col-span-5">
                <Button onClick={addCapital} className="w-full">
                  Adicionar
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capital.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{r.percentual.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await deleteCapitalRate(r.id)
                              await refresh()
                            } catch (error) {
                              console.error('Error deleting capital rate:', error)
                            }
                          }}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {capital.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma taxa cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Taxas de Imposto</h3>
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3">
                <Label className="sr-only" htmlFor="nomeImp">
                  Nome
                </Label>
                <Input
                  id="nomeImp"
                  placeholder="Nome (ex.: Imposto 8%)"
                  value={nomeImp}
                  onChange={(e) => setNomeImp(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="sr-only" htmlFor="percImp">
                  Percentual
                </Label>
                <CurrencyInput
                  id="percImp"
                  placeholder="Ex.: 11,5"
                  value={percImp}
                  onChange={setPercImp}
                />
              </div>
              <div className="col-span-5">
                <Button onClick={addImposto} className="w-full">
                  Adicionar
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imposto.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{r.percentual.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await deleteImpostoRate(r.id)
                              await refresh()
                            } catch (error) {
                              console.error('Error deleting imposto rate:', error)
                            }
                          }}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {imposto.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma taxa cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
