import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Section } from "@/components/section"
import { BrandTheme } from "@/components/brand-theme"
import { LocationSection } from "@/components/location-section"
import {
  Accordion,
  Center,
  HStack,
  Icon,
  List,
  Text,
  VStack,
  SimpleGrid,
  Card,
} from "@chakra-ui/react"
import { Prose } from "@/components/ui/prose"
import { FaStar } from "react-icons/fa"
import { LuCircleCheck } from "react-icons/lu"
import { LaundryData } from "@/types/laundry"

// Navegação padrão caso o backend não envie todos os itens
const DEFAULT_NAVIGATION = [
  { label: "Serviços", href: "#servicos" },
  { label: "Localização", href: "#localizacao" },
  { label: "FAQ", href: "#faq" },
  { label: "Avaliações", href: "#avaliacoes" },
]

interface ModernTemplateProps {
  data: LaundryData
}

export function ModernTemplate({ data }: ModernTemplateProps) {
  // Usa navegação do backend ou fallback para navegação padrão
  const navigation = data.navigation?.length >= 4 ? data.navigation : DEFAULT_NAVIGATION

  return (
    <BrandTheme
      primaryColor={data.branding.primaryColor}
      secondaryColor={data.branding.secondaryColor}
      tertiaryColor={data.branding.tertiaryColor}
    >
      <main>
        <Header branding={data.branding} navigation={navigation} />
        <Hero data={data.hero} brandingData={data.branding} />
        
        {/* Seção de Serviços - Layout em Grid com Cards Destacados */}
        <Section
          id="servicos"
          title={data.services.title}
          description={data.services.description}
          css={{ background: "var(--brand-tertiary)" }}
        >
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={{ base: 6, md: 8 }} maxW="6xl" mx="auto">
            {data.services.items.map((service, index) => (
              <Card.Root 
                key={index} 
                h="100%" 
                shadow="xl" 
                bg="white"
                borderTop="4px solid"
                borderColor="var(--brand-primary)"
                transition="all 0.3s"
                _hover={{ transform: "translateY(-4px)", shadow: "2xl" }}
              >
                <Card.Header pb={3}>
                  <VStack gap={2}>
                    <Card.Title
                      css={{ color: "var(--brand-primary)" }}
                      textAlign={"center"}
                      fontWeight={"black"}
                      fontSize={{ base: "xl", md: "2xl" }}
                    >
                      {service.title}
                    </Card.Title>
                    <Text
                      fontWeight={"black"}
                      textAlign={"center"}
                      fontSize={{ base: "2xl", md: "3xl" }}
                      css={{ color: "var(--brand-secondary)" }}
                    >
                      {service.price}
                    </Text>
                  </VStack>
                </Card.Header>
                <Card.Body pt={3}>
                  <Text textAlign={"center"} fontSize={{ base: "md", md: "lg" }} color="gray.600" mb={4}>
                    {service.description}
                  </Text>
                  <VStack alignItems={"stretch"} gap={3} mt={4}>
                    <List.Root gap="3" variant="plain">
                      {service.vantageList.map((vantage, vIndex) => (
                        <List.Item key={vIndex} fontSize={{ base: "sm", md: "md" }}>
                          <List.Indicator asChild css={{ color: "var(--brand-secondary)" }}>
                            <LuCircleCheck size={20} />
                          </List.Indicator>
                          <Text as="span" fontWeight="medium">{vantage}</Text>
                        </List.Item>
                      ))}
                    </List.Root>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Section>

        {/* Seção de Avaliações - Antes da Localização */}
        <Section
          id="avaliacoes"
          title={data.testimonials.title}
          description={data.testimonials.description}
        >
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 6, md: 8 }}>
            {data.testimonials.items.map((testimonial, index) => (
              <Card.Root 
                key={index} 
                h="100%" 
                bg="white" 
                shadow="lg"
                borderLeft="4px solid"
                borderColor="orange.400"
                transition="all 0.3s"
                _hover={{ shadow: "xl" }}
              >
                <Card.Header as={Center} py={{ base: 4, md: 5 }}>
                  <HStack color="orange.400" gap={1}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Icon key={starIndex} boxSize={{ base: 5, md: 6 }}>
                        <FaStar />
                      </Icon>
                    ))}
                  </HStack>
                </Card.Header>
                <Card.Body gap={{ base: 3, md: 4 }} justifyContent="center" py={{ base: 3, md: 4 }}>
                  <Text
                    textAlign="center"
                    fontSize={{ base: "lg", md: "xl" }}
                    color="gray.700"
                    fontWeight="medium"
                    lineHeight="tall"
                    fontStyle="italic"
                  >
                    &quot;{testimonial.quote}&quot;
                  </Text>
                </Card.Body>
                <Card.Footer as={Center} py={{ base: 4, md: 5 }}>
                  <Text
                    fontSize={{ base: "md", md: "lg" }}
                    fontWeight="bold"
                    css={{ color: "var(--brand-primary)" }}
                  >
                      {testimonial.author}
                  </Text>
                </Card.Footer>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Section>

        {/* Seção de Localização - Layout Compacto */}
        <Section
          css={{ background: "var(--brand-tertiary)" }}
          id="localizacao"
          title={data.location.title}
          description={data.location.description}
        >
          <LocationSection items={data.location.items} />
        </Section>

        {/* Seção de FAQ - Estilo Minimalista */}
        <Section
          id="faq"
          title={data.faq.title}
          description={data.faq.description}
        >
          <Center flexDirection={"column"} gap={{ base: 4, md: 8 }} w="full">
            <Accordion.Root 
              collapsible 
              w="full" 
              maxW={"4xl"}
            >
              {data.faq.items.map((item, index) => (
                <Accordion.Item 
                  key={index} 
                  value={item.value}
                  borderBottom="2px solid"
                  borderColor="gray.200"
                  _last={{ borderBottom: "none" }}
                >
                  <Accordion.ItemTrigger py={{ base: 4, md: 5 }}>
                    <Text
                      flex="1"
                      css={{ color: "var(--brand-primary)" }}
                      fontWeight="bold"
                      fontSize={{ base: "md", md: "lg" }}
                      textAlign="left"
                    >
                      {item.title}
                    </Text>
                    <Accordion.ItemIndicator />
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    <Accordion.ItemBody color={"gray.600"} fontSize={{ base: "sm", md: "md" }} pb={4}>
                      <Prose dangerouslySetInnerHTML={{ __html: item.text }} />
                    </Accordion.ItemBody>
                  </Accordion.ItemContent>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </Center>
        </Section>

        <CTA data={data.cta} branding={data.branding} />
        <Footer data={data.footer} branding={data.branding} />
      </main>
    </BrandTheme>
  )
}
