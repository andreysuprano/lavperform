import { readFile } from "fs/promises"
import path from "path"

export async function createStoreIconResponse(
  logoUrl?: string | null
): Promise<Response> {
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl, {
        next: { revalidate: 3600 },
      })

      if (response.ok) {
        const buffer = await response.arrayBuffer()
        const contentType = response.headers.get("content-type") || "image/png"

        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control":
              "public, max-age=3600, stale-while-revalidate=86400",
          },
        })
      }
    } catch {
      // Usa o fallback abaixo
    }
  }

  return createDefaultIconResponse()
}

async function createDefaultIconResponse(): Promise<Response> {
  const filePath = path.join(process.cwd(), "public/favicon.png")
  const buffer = await readFile(filePath)

  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
