"use client"

import { useRef, useState } from "react"
import { ImagePlusIcon, Loader2, TrashIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FieldDescription } from "@/components/ui/field"
import { uploadImageToFirebase } from "@/lib/firebase/upload"
import { cn } from "@/lib/utils"

import { parseImagesJson, stringifyImagesJson } from "@/features/campaigns/utils"

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif"

type UploadOptions = {
  folder?: string
  disabled?: boolean
}

async function uploadFiles(
  files: FileList | File[],
  folder: string
): Promise<string[]> {
  const fileList = Array.from(files).filter((file) =>
    file.type.startsWith("image/")
  )

  if (fileList.length === 0) {
    throw new Error("Selecione um arquivo de imagem válido")
  }

  return Promise.all(
    fileList.map((file) => uploadImageToFirebase(file, folder))
  )
}

function UploadImagePreview({
  url,
  onRemove,
  disabled,
}: {
  url: string
  onRemove?: () => void
  disabled?: boolean
}) {
  const [error, setError] = useState(false)

  return (
    <div className="relative overflow-hidden rounded-md border bg-muted/30">
      {onRemove && (
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="absolute top-2 right-2 z-10 size-7 bg-background/90 shadow-sm"
          onClick={onRemove}
          disabled={disabled}
        >
          <XIcon />
        </Button>
      )}
      {error ? (
        <div className="flex max-h-48 items-center justify-center p-4">
          <span className="break-all text-xs text-muted-foreground">{url}</span>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt=""
          className="max-h-48 w-full object-contain"
          onError={() => setError(true)}
        />
      )}
    </div>
  )
}

export function FirebaseImageUploadField({
  value,
  onChange,
  folder = "campaigns",
  disabled,
  className,
}: {
  value: string
  onChange: (value: string) => void
  folder?: string
  disabled?: boolean
  className?: string
} & UploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleUpload(files: FileList | null) {
    if (!files?.length || disabled) return

    setIsUploading(true)
    try {
      const [url] = await uploadFiles(files, folder)
      onChange(url)
      toast.success("Imagem enviada com sucesso")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar imagem"
      )
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {value ? (
        <UploadImagePreview
          url={value}
          onRemove={() => onChange("")}
          disabled={disabled || isUploading}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) => void handleUpload(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <ImagePlusIcon />
              {value ? "Substituir imagem" : "Enviar imagem"}
            </>
          )}
        </Button>

        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => onChange("")}
          >
            <TrashIcon />
            Remover
          </Button>
        ) : null}
      </div>

      <FieldDescription>
        A imagem será enviada ao Firebase Storage e apenas o link será salvo.
      </FieldDescription>
    </div>
  )
}

export function FirebaseImagesUploadField({
  value,
  onChange,
  folder = "campaigns",
  disabled,
  className,
}: {
  value: string[]
  onChange: (value: string[]) => void
  folder?: string
  disabled?: boolean
  className?: string
} & UploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleUpload(files: FileList | null) {
    if (!files?.length || disabled) return

    setIsUploading(true)
    try {
      const urls = await uploadFiles(files, folder)
      onChange([...value, ...urls])
      toast.success(
        urls.length === 1
          ? "Imagem enviada com sucesso"
          : `${urls.length} imagens enviadas com sucesso`
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar imagens"
      )
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {value.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((url, index) => (
            <UploadImagePreview
              key={`${url}-${index}`}
              url={url}
              onRemove={() => removeAt(index)}
              disabled={disabled || isUploading}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(event) => void handleUpload(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <ImagePlusIcon />
              Adicionar imagem
            </>
          )}
        </Button>
      </div>

      <FieldDescription>
        As imagens serão enviadas ao Firebase Storage e apenas os links serão
        salvos.
      </FieldDescription>
    </div>
  )
}

export function FirebaseLegacyImagesUploadField({
  value,
  onChange,
  folder = "campaigns/legacy",
  disabled,
  className,
}: {
  value: string
  onChange: (value: string) => void
  folder?: string
  disabled?: boolean
  className?: string
} & UploadOptions) {
  const urls = parseImagesJson(value)

  return (
    <FirebaseImagesUploadField
      value={urls}
      onChange={(nextUrls) => onChange(stringifyImagesJson(nextUrls) ?? "")}
      folder={folder}
      disabled={disabled}
      className={className}
    />
  )
}
