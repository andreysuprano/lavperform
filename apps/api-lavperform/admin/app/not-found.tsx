import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function RootNotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-sm text-muted-foreground">
          A rota solicitada não existe.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/login" />}>
        Ir para o login
      </Button>
    </div>
  )
}
