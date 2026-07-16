"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

type CampaignImagePreviewProps = {
  label?: string
  urls: string[]
  className?: string
}

function CampaignImageItem({ url }: { url: string }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-xs text-muted-foreground underline"
      >
        {url}
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-md border bg-muted/30"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        loading="lazy"
        className="max-h-48 w-full object-contain transition-opacity group-hover:opacity-90"
        onError={() => setError(true)}
      />
    </a>
  )
}

export function CampaignImagePreview({
  label,
  urls,
  className,
}: CampaignImagePreviewProps) {
  const validUrls = urls.filter(Boolean)
  if (validUrls.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {validUrls.map((url) => (
          <CampaignImageItem key={url} url={url} />
        ))}
      </div>
    </div>
  )
}
