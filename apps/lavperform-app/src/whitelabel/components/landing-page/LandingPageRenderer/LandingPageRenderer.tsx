import { Box } from '@chakra-ui/react'
import { memo } from 'react'

import { Navigation } from '../sections/Navigation'
import { HeroSection } from '../sections/HeroSection'
import { ServicesSection } from '../sections/ServicesSection'
import { LocationSection } from '../sections/LocationSection'
import { FaqSection } from '../sections/FaqSection'
import { TestimonialsSection } from '../sections/TestimonialsSection'
import { CtaSection } from '../sections/CtaSection'
import { FooterSection } from '../sections/FooterSection'

import { Props } from './LandingPageRenderer.types'

function LandingPageRendererBase({ data }: Props) {
  return (
    <Box bg="bg" minH="100vh">
      <Navigation navigation={data.navigation} branding={data.branding} />
      <HeroSection hero={data.hero} branding={data.branding} />
      <ServicesSection services={data.services} />
      <LocationSection location={data.location} />
      <FaqSection faq={data.faq} />
      <TestimonialsSection testimonials={data.testimonials} />
      <CtaSection cta={data.cta} />
      <FooterSection footer={data.footer} />
    </Box>
  )
}

const LandingPageRenderer = memo(
  LandingPageRendererBase
) as typeof LandingPageRendererBase

export { LandingPageRenderer, type Props as LandingPageRendererProps }
