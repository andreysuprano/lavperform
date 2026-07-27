import { LaundryData } from "@/types/laundry"
import { DefaultTemplate } from "./default"
import { ModernTemplate } from "./modern"
import { ElegantTemplate } from "./elegant"

// Mapa de templates disponíveis
const TEMPLATES = {
  default: DefaultTemplate,
  modern: ModernTemplate,
  elegant: ElegantTemplate,
} as const

// Tipo para os nomes dos templates disponíveis
export type TemplateName = keyof typeof TEMPLATES

// Props do renderizador de templates
interface TemplateRendererProps {
  data: LaundryData
}

/**
 * Componente que renderiza o template correto baseado nos dados do backend
 * Se o template não for especificado ou não existir, usa o template "default"
 */
export function TemplateRenderer({ data }: TemplateRendererProps) {
  // Obtém o nome do template dos dados do backend (default: "default")
  const templateName = (data.template || "default") as TemplateName
  
  // Busca o componente do template
  const Template = TEMPLATES[templateName] || TEMPLATES.default
  
  // Renderiza o template com os dados
  return <Template data={data} />
}

/**
 * Lista todos os templates disponíveis
 * Útil para documentação ou para o backend saber quais templates estão disponíveis
 */
export function getAvailableTemplates(): TemplateName[] {
  return Object.keys(TEMPLATES) as TemplateName[]
}

/**
 * Verifica se um template existe
 */
export function isValidTemplate(templateName: string): templateName is TemplateName {
  return templateName in TEMPLATES
}
