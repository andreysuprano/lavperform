import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { Providers } from "@/components/providers"
import { createBrandMetadata, getBrandConfig } from "@/lib/brand"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const brand = getBrandConfig()

export const metadata: Metadata = createBrandMetadata({
  description: "Painel administrativo da plataforma",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
      data-brand={brand.theme}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
