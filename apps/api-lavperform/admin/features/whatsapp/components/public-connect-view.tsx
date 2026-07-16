"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { CheckCircle2Icon, Loader2, RefreshCwIcon } from "lucide-react"

import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import {
  getPublicConnectConnection,
  getPublicConnectSession,
  getPublicConnectStatus,
} from "../public-connect-api"
import type { PublicConnectConnection, PublicConnectSession } from "../types"
import { formatDate } from "../utils"

const POLL_INTERVAL_MS = 4000

export function PublicConnectView({ token }: { token: string }) {
  const [session, setSession] = useState<PublicConnectSession | null>(null)
  const [connection, setConnection] = useState<PublicConnectConnection | null>(
    null
  )
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadConnection = useCallback(async () => {
    const nextConnection = await getPublicConnectConnection(token)
    setConnection(nextConnection)
    setStatus(nextConnection.status)
    return nextConnection
  }, [token])

  const refreshStatus = useCallback(async () => {
    const nextStatus = await getPublicConnectStatus(token)
    setStatus(nextStatus.status)
    return nextStatus.status
  }, [token])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setIsLoading(true)
      setError(null)
      try {
        const nextSession = await getPublicConnectSession(token)
        if (cancelled) return
        setSession(nextSession)
        setStatus(nextSession.status)

        if (nextSession.status !== "CONNECTED") {
          await loadConnection()
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Link inválido")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [token, loadConnection])

  useEffect(() => {
    if (status === "CONNECTED" || error) return

    const interval = window.setInterval(async () => {
      try {
        const nextStatus = await refreshStatus()
        if (nextStatus !== "CONNECTED" && nextStatus !== "PENDING") return
        if (nextStatus === "CONNECTED") return
        await loadConnection()
      } catch {
        // polling silencioso
      }
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [status, error, refreshStatus, loadConnection])

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      const nextStatus = await refreshStatus()
      if (nextStatus !== "CONNECTED") {
        await loadConnection()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar")
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <PublicConnectShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Preparando conexão...
        </div>
      </PublicConnectShell>
    )
  }

  if (error || !session) {
    return (
      <PublicConnectShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link indisponível</CardTitle>
            <CardDescription>
              {error ?? "Este link não existe ou não está mais válido."}
            </CardDescription>
          </CardHeader>
        </Card>
      </PublicConnectShell>
    )
  }

  const isConnected = status === "CONNECTED"
  const qrCode = normalizeQrCode(connection?.qrcode ?? connection?.code)

  return (
    <PublicConnectShell>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>Conectar WhatsApp</CardTitle>
          <CardDescription>
            {session.companyName} · instância {session.instanceName}
          </CardDescription>
          <div className="flex justify-center pt-2">
            <ConnectionStatusBadge status={status} />
          </div>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-4">
          {isConnected ? (
            <>
              <CheckCircle2Icon className="size-16 text-green-600" />
              <p className="text-center text-sm text-muted-foreground">
                WhatsApp conectado com sucesso. Você já pode fechar esta página.
              </p>
            </>
          ) : (
            <>
              {qrCode ? (
                <img
                  src={qrCode}
                  alt="QR Code para conectar WhatsApp"
                  className="size-64 rounded-lg border bg-white p-3"
                />
              ) : (
                <div className="flex size-64 items-center justify-center rounded-lg border bg-muted/40">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {connection?.pairingCode && (
                <p className="text-sm text-muted-foreground">
                  Código de pareamento:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {connection.pairingCode}
                  </span>
                </p>
              )}

              <p className="text-center text-sm text-muted-foreground">
                Abra o WhatsApp no celular, vá em Aparelhos conectados e escaneie
                o QR Code acima.
              </p>

              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCwIcon />
                    Atualizar QR Code
                  </>
                )}
              </Button>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Link válido até {formatDate(session.expiresAt)}
          </p>
        </CardContent>
      </Card>
    </PublicConnectShell>
  )
}

function PublicConnectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh w-full flex-col items-center justify-center gap-6 overflow-hidden p-4 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-muted/80 via-background to-background"
      />
      <div className="relative flex w-full max-w-lg flex-col items-center gap-6">
        <BrandLogo
          variant="full"
          imageClassName="h-12 w-auto max-w-[220px] object-contain"
        />
        {children}
      </div>
    </div>
  )
}

function ConnectionStatusBadge({ status }: { status: string | null }) {
  if (status === "CONNECTED") {
    return <Badge variant="default">Conectado</Badge>
  }
  if (status === "PENDING") {
    return <Badge variant="outline">Aguardando leitura do QR</Badge>
  }
  return <Badge variant="secondary">Desconectado</Badge>
}

function normalizeQrCode(value?: string) {
  if (!value) return null
  if (value.startsWith("data:image")) return value
  return `data:image/png;base64,${value}`
}
