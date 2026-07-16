import Link from "next/link"
import { FileQuestionIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function AdminNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <FileQuestionIcon className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>Página não encontrada</CardTitle>
          <CardDescription>
            A rota que você tentou acessar não existe ou ainda não foi
            implementada.
          </CardDescription>
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
