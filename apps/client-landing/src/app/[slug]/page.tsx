import { getLaundryData } from "@/lib/landing-data"
import { Metadata } from "next"
import { TemplateRenderer } from "@/templates"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const data = await getLaundryData(slug)

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

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getLaundryData(slug)

  return <TemplateRenderer data={data} />
}
