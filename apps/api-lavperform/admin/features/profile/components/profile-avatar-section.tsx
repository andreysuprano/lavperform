"use client"

import { useRef, useState } from "react"
import { CameraIcon, Loader2, TrashIcon } from "lucide-react"
import { toast } from "sonner"

import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldDescription } from "@/components/ui/field"
import { uploadImageToFirebase } from "@/lib/firebase/upload"

import { useUpdateAdminProfile } from "../profile-queries"

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif"

type ProfileAvatarSectionProps = {
  name: string
  avatarUrl: string | null
}

export function ProfileAvatarSection({
  name,
  avatarUrl,
}: ProfileAvatarSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const updateProfile = useUpdateAdminProfile()

  async function handleUpload(files: FileList | null) {
    const file = files?.[0]
    if (!file || !file.type.startsWith("image/")) return

    setIsUploading(true)
    let uploadedUrl: string | undefined

    try {
      uploadedUrl = await uploadImageToFirebase(file, "avatars")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar imagem"
      )
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    try {
      await updateProfile.mutateAsync({ avatarUrl: uploadedUrl })
    } catch {
      // Toast já é emitido pelo hook de mutation
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleRemove() {
    try {
      await updateProfile.mutateAsync({ avatarUrl: null })
    } catch {
      // Toast já é emitido pelo hook
    }
  }

  const isBusy = isUploading || updateProfile.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto de perfil</CardTitle>
        <CardDescription>
          Sua foto aparece no menu lateral e na página inicial do painel.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <UserAvatar
            name={name}
            avatarUrl={avatarUrl}
            className="size-24 text-lg"
          />
          {isBusy ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              className="hidden"
              disabled={isBusy}
              onChange={(event) => void handleUpload(event.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
            >
              <CameraIcon />
              {avatarUrl ? "Trocar foto" : "Enviar foto"}
            </Button>

            {avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isBusy}
                onClick={() => void handleRemove()}
              >
                <TrashIcon />
                Remover foto
              </Button>
            ) : null}
          </div>

          <FieldDescription>
            A imagem será enviada ao Firebase Storage. Formatos aceitos: JPEG,
            PNG, WebP e GIF.
          </FieldDescription>
        </div>
      </CardContent>
    </Card>
  )
}
