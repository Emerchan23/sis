"use client"

import type React from "react"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { getConfig, CONFIG_CHANGED_EVENT } from "@/lib/config"
import { ensureDefaultEmpresa, getCurrentEmpresa, EMPRESA_CHANGED_EVENT } from "@/lib/empresas-client"
import { ERP_CHANGED_EVENT } from "@/lib/data-store"


const routes = [
  { href: "/", label: "Dashboard" },
  { href: "/vendas", label: "Vendas" },
  { href: "/acertos", label: "Acertos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/vales", label: "Vale" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/outros-negocios", label: "Outros negócios" },
  { href: "/orcamentos", label: "Orçamentos" },
  { href: "/configuracoes", label: "Configurações" },
]

export function AppHeader({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [brand, setBrand] = useState<string>("LP IND")
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const [empresaNome, setEmpresaNome] = useState<string>("")

  const placeholderLogo = useMemo(() => "/placeholder.svg?height=28&width=28", [])
  
  // Função para sanitizar URLs de logo e evitar erro CORS
  const sanitizeLogoUrl = (url: string | undefined): string => {
    if (!url || url.trim() === "") {
      return placeholderLogo
    }
    
    // Verificar se é um link do Google Drive e substituir por placeholder
    if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
      console.warn('URL do Google Drive detectada no cabeçalho, usando placeholder para evitar erro CORS:', url)
      return placeholderLogo
    }
    
    return url
  }

  useEffect(() => {
    const initData = async () => {
      try {
        await ensureDefaultEmpresa()
        const cfg = getConfig()
        const curEmp = getCurrentEmpresa()
        
        // Priorizar dados da empresa atual
        setBrand(curEmp?.nomeDoSistema || cfg?.nome || "LP IND")
        setLogoUrl(curEmp?.logoUrl || cfg?.logoUrl || undefined)
        setEmpresaNome(curEmp?.nome || "")
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
    }

    initData()

    const onConfigChanged = () => {
      const cfg = getConfig()
      setBrand(cfg?.nome || "LP IND")
      setLogoUrl(cfg?.logoUrl || undefined)
    }

    const onEmpresaChanged = () => {
      const curEmp = getCurrentEmpresa()
      setEmpresaNome(curEmp?.nome || "")
      // Usar dados da empresa atual para nome do sistema e logo
      if (curEmp?.nomeDoSistema) {
        setBrand(curEmp.nomeDoSistema)
      }
      if (curEmp?.logoUrl) {
        setLogoUrl(curEmp.logoUrl)
      }
    }

    const onErpChanged = async () => {
      try {
        await ensureDefaultEmpresa()
        const curEmp = getCurrentEmpresa()
        if (curEmp?.nomeDoSistema) {
          setBrand(curEmp.nomeDoSistema)
        }
        if (curEmp?.logoUrl) {
          setLogoUrl(curEmp.logoUrl)
        }
        setEmpresaNome(curEmp?.nome || "")
      } catch (error) {
        console.error("Erro ao recarregar dados da empresa:", error)
      }
    }

    window.addEventListener(CONFIG_CHANGED_EVENT, onConfigChanged as EventListener)
    window.addEventListener(EMPRESA_CHANGED_EVENT, onEmpresaChanged as EventListener)
    window.addEventListener(ERP_CHANGED_EVENT, onErpChanged as EventListener)
    
    return () => {
      window.removeEventListener(CONFIG_CHANGED_EVENT, onConfigChanged as EventListener)
      window.removeEventListener(EMPRESA_CHANGED_EVENT, onEmpresaChanged as EventListener)
      window.removeEventListener(ERP_CHANGED_EVENT, onErpChanged as EventListener)
    }
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto flex h-16 min-h-16 max-w-7xl items-center gap-3 px-4">
        {/* Marca */}
        <Link href="/" className="flex shrink-0 items-center gap-2" title={brand}>
          {logoUrl ? (
            <Image
              src={sanitizeLogoUrl(logoUrl)}
              alt="Logo da empresa"
              width={48}
              height={48}
              className="rounded object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col items-center justify-center text-white">
              <div className="text-xs font-bold leading-none">ID</div>
              <div className="text-[6px] font-semibold leading-none tracking-wider">DISTRIBUIÇÃO</div>
            </div>
          )}
          <span className="font-semibold truncate max-w-[40vw]">{brand}</span>
        </Link>

        {/* Navegação principal */}
        <nav
          aria-label="Principal"
          className="hidden md:flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap
                     [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {routes.map((r) => {
            const active = pathname === r.href
            return (
              <Link key={r.href} href={r.href} className="shrink-0">
                <Button
                  variant={active ? "default" : "ghost"}
                  className={cn("text-sm", active ? "" : "text-muted-foreground hover:text-foreground")}
                >
                  {r.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Usuário e empresa */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden md:inline-flex">
            <Button
              variant="outline"
              className="bg-transparent max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap"
              title={empresaNome ? `Empresa: ${empresaNome}` : "Empresa"}
              disabled
            >
              {empresaNome ? `Empresa: ${empresaNome}` : "Empresa"}
            </Button>
          </div>



          {/* Navegação compacta no mobile */}
          <div className="md:hidden">
            <Link href="/menu">
              <Button variant="ghost" className="text-sm">
                Menu
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Barra secundária no mobile */}
      <div className="md:hidden border-t">
        <div
          className="flex items-center gap-1 overflow-x-auto px-2 py-2 whitespace-nowrap
                     [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollbarWidth: "none" } as React.CSSProperties}
        >
          {routes.map((r) => {
            const active = pathname === r.href
            return (
              <Link key={r.href} href={r.href} className="shrink-0">
                <Button size="sm" variant={active ? "secondary" : "ghost"} className="text-xs">
                  {r.label}
                </Button>
              </Link>
            )
          })}
          <div className="shrink-0">
            <Button size="sm" variant="outline" className="text-xs bg-transparent" disabled>
              {empresaNome ? "Empresa" : "Empresa"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
