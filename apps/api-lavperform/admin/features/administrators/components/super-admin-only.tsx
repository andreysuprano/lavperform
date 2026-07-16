"use client"

import Link from "next/link"
import { ShieldAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useIsSuperAdmin } from "@/hooks/use-is-super-admin"

export function SuperAdminOnly({
  children,
}: {
  children: React.ReactNode
}) {
  const isSuperAdmin = useIsSuperAdmin()

  if (isSuperAdmin) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlertIcon className="size-8 text-muted-foreground" />
            <div>
              <CardTitle>Acesso restrito</CardTitle>
              <CardDescription>
                Esta área é exclusiva para super administradores.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/" />}>
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
