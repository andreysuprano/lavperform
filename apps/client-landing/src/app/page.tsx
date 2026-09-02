import { getLaundryData } from "@/lib/landing-data"
import { Metadata } from "next"
import { TemplateRenderer } from "@/templates"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  try {
    const data = await getLaundryData()

    return {
      title: `${data.branding.name} | ${data.branding.slogan}`,
      description: data.hero.subtitle,
    }
  } catch {
    return {
      title: "Página não encontrada",
    }
  }
}

export default async function Home() {
  const data = await getLaundryData()

  return <TemplateRenderer data={data} />
}
