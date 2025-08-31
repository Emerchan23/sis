"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteModalidade, getModalidades, saveModalidade, type Modalidade } from "@/lib/modalidades"

export function ManageModalidadesDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved?: () => void
}) {
  const [list, setList] = useState<Modalidade[]>([])
  const [nome, setNome] = useState("")

  async function refresh() {
    try {
      const modalidades = await getModalidades()
      setList(modalidades)
      onSaved?.()
    } catch (error) {
      console.error('Erro ao carregar modalidades:', error)
      setList([])
    }
  }
  useEffect(() => {
    if (open) refresh()
  }, [open])

  async function add() {
    if (!nome.trim()) return
    
    const trimmedName = nome.trim()
    
    try {
      // Refresh the list to get the most current data before checking
      const currentModalidades = await getModalidades()
      
      // Check for duplicate names with fresh data
      const existingModalidade = currentModalidades.find(m => m.nome.toLowerCase() === trimmedName.toLowerCase())
      if (existingModalidade) {
        alert('Já existe uma modalidade com este nome!')
        return
      }
      
      await saveModalidade({ nome: trimmedName })
      setNome("")
      await refresh()
    } catch (error) {
      console.error('Erro ao salvar modalidade:', error)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        alert('Já existe uma modalidade com este nome!')
      } else {
        alert('Erro ao salvar modalidade. Tente novamente.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Modalidades</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-4">
              <Label className="sr-only" htmlFor="nome">
                Nome
              </Label>
              <Input
                id="nome"
                placeholder="Ex.: DIRETA, LICITAÇÃO, E-COMMERCE..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="col-span-1">
              <Button className="w-full" onClick={add}>
                Adicionar
              </Button>
            </div>
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await deleteModalidade(m.id)
                            await refresh()
                          } catch (error) {
                            console.error('Erro ao excluir modalidade:', error)
                          }
                        }}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Nenhuma modalidade cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
