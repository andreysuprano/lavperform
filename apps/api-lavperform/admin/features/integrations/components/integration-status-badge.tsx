import { Badge } from "@/components/ui/badge"

export function IntegrationStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Ativa" : "Inativa"}
    </Badge>
  )
}
