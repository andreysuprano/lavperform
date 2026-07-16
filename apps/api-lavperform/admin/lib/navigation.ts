import type { LucideIcon } from "lucide-react"
import {
  Building2Icon,
  CoinsIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  ShieldIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

const baseNavMainItems: NavItem[] = [
  { title: "Início", url: "/", icon: LayoutDashboardIcon },
  { title: "Empresas", url: "/companies", icon: Building2Icon },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircleIcon },
  { title: "Campanhas", url: "/campaigns", icon: MegaphoneIcon },
  {
    title: "Planos de assinatura",
    url: "/billing/plans",
    icon: CreditCardIcon,
  },
  {
    title: "Catálogo de créditos",
    url: "/billing/default-products",
    icon: CoinsIcon,
  },
]

const administratorsNavItem: NavItem = {
  title: "Administradores",
  url: "/administrators",
  icon: ShieldIcon,
}

export function getNavMainItems(role?: string | null): NavItem[] {
  if (role === "SUPER_ADMIN") {
    return [
      baseNavMainItems[0],
      baseNavMainItems[1],
      administratorsNavItem,
      ...baseNavMainItems.slice(2),
    ]
  }

  return baseNavMainItems
}

/** @deprecated Use getNavMainItems(role) */
export const navMainItems: NavItem[] = baseNavMainItems

export const navSecondaryItems: NavItem[] = []

const pageTitles: Record<string, string> = {
  "/": "Início",
  "/dashboard": "Dashboard",
  "/companies": "Empresas",
  "/companies/new": "Nova empresa",
  "/administrators": "Administradores",
  "/administrators/new": "Novo administrador",
  "/whatsapp": "WhatsApp",
  "/whatsapp/company": "WhatsApp da empresa",
  "/campaigns": "Campanhas",
  "/campaigns/new": "Nova campanha agendada",
  "/campaigns/automatic/new": "Nova campanha automática",
  "/billing/plans": "Planos de assinatura",
  "/billing/default-products": "Catálogo de créditos",
  "/profile": "Meu perfil",
}

export function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]

  if (pathname.startsWith("/companies/")) {
    if (pathname.endsWith("/billing")) return "Faturamento da empresa"
    if (pathname.endsWith("/integrations")) return "Integrações da empresa"
    if (pathname.endsWith("/edit")) return "Editar empresa"
    return "Detalhes da empresa"
  }

  if (pathname.startsWith("/administrators/") && pathname.endsWith("/edit")) {
    return "Editar administrador"
  }

  if (pathname.startsWith("/whatsapp/company/")) {
    return "WhatsApp da empresa"
  }

  if (pathname.startsWith("/campaigns/automatic/")) {
    if (pathname.endsWith("/edit")) return "Editar campanha automática"
    if (pathname.endsWith("/messages")) return "Mensagens da campanha"
    return "Detalhes da campanha automática"
  }

  if (pathname.startsWith("/campaigns/")) {
    if (pathname.endsWith("/edit")) return "Editar campanha agendada"
    if (pathname.endsWith("/messages")) return "Mensagens da campanha"
    return "Detalhes da campanha agendada"
  }

  return "FoodCRM Admin"
}
