import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Section } from "@/components/section"
import { BrandTheme } from "@/components/brand-theme"
import { LocationSection } from "@/components/location-section"
import {
  Accordion,
  Card,
  Center,
  HStack,
  Icon,
  List,
  Text,
  VStack,
  SimpleGrid,
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

interface DefaultTemplateProps {
  data: LaundryData
}

export function DefaultTemplate({ data }: DefaultTemplateProps) {
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
        
        {/* Seção de Serviços */}
        <Section
          id="servicos"
          title={data.services.title}
          description={data.services.description}
        >
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={{ base: 4, md: 6 }}>
            {data.services.items.map((service, index) => (
              <Card.Root key={index} h="100%" shadow="md">
                <Card.Header pb={2}>
                  <Card.Title
                    css={{ color: "var(--brand-primary)" }}
                    textAlign={"center"}
                    fontWeight={"black"}
                    fontSize={{ base: "lg", md: "xl" }}
                  >
                    {service.title}
                  </Card.Title>
                </Card.Header>
                <Card.Body pt={2}>
                  <Text textAlign={"center"} fontSize={{ base: "sm", md: "md" }} color="gray.600">
                    {service.description}
                  </Text>
                  <Text
                    fontWeight={"black"}
                    textAlign={"center"}
                    fontSize={{ base: "lg", md: "xl" }}
                    css={{ color: "var(--brand-primary)" }}
                    mt={2}
                  >
                    {service.price}
                  </Text>
                  <VStack alignItems={"start"} mt={4} gap={2}>
                    <List.Root gap="2" variant="plain" align="center">
                      {service.vantageList.map((vantage, vIndex) => (
                        <List.Item key={vIndex} fontSize={{ base: "sm", md: "md" }}>
                          <List.Indicator asChild css={{ color: "var(--brand-secondary)" }}>
                            <LuCircleCheck />
                          </List.Indicator>
                          <Text as="span">{vantage}</Text>
                        </List.Item>
                      ))}
                    </List.Root>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Section>

        {/* Seção de Localização */}
        <Section
          css={{ background: "var(--brand-tertiary)" }}
          id="localizacao"
          title={data.location.title}
          description={data.location.description}
        >
          <LocationSection items={data.location.items} />
        </Section>

        {/* Seção de FAQ */}
        <Section
          id="faq"
          title={data.faq.title}
          description={data.faq.description}
        >
          <Center flexDirection={"column"} gap={{ base: 4, md: 8 }} w="full">
            <Accordion.Root collapsible w="full" maxW={"3xl"}>
              {data.faq.items.map((item, index) => (
                <Accordion.Item key={index} value={item.value}>
                  <Accordion.ItemTrigger py={{ base: 3, md: 4 }}>
                    <Text
                      flex="1"
                      color={"gray.900"}
                      fontWeight="semibold"
                      fontSize={{ base: "sm", md: "md" }}
                      textAlign="left"
                    >
                      {item.title}
                    </Text>
                    <Accordion.ItemIndicator />
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    <Accordion.ItemBody color={"gray.600"} fontSize={{ base: "sm", md: "md" }}>
                      <Prose dangerouslySetInnerHTML={{ __html: item.text }} />
                    </Accordion.ItemBody>
                  </Accordion.ItemContent>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </Center>
        </Section>

        {/* Seção de Avaliações */}
        <Section
          css={{ background: "var(--brand-tertiary)" }}
          id="avaliacoes"
          title={data.testimonials.title}
          description={data.testimonials.description}
        >
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={{ base: 4, md: 6 }}>
            {data.testimonials.items.map((testimonial, index) => (
              <Card.Root key={index} h="100%" bg="white" shadow="md">
                <Card.Header as={Center} py={{ base: 3, md: 4 }}>
                  <HStack color="orange.400" gap={1}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Icon key={starIndex} boxSize={{ base: 4, md: 5 }}>
                        <FaStar />
                      </Icon>
                    ))}
                  </HStack>
                </Card.Header>
                <Card.Body gap={{ base: 2, md: 4 }} justifyContent="center" py={{ base: 2, md: 4 }}>
                  <Text
                    textAlign="center"
                    fontSize={{ base: "md", md: "lg" }}
                    color="gray.700"
                    fontWeight="medium"
                    lineHeight="tall"
                    fontStyle="italic"
                  >
                    &quot;{testimonial.quote}&quot;
                  </Text>
                </Card.Body>
                <Card.Footer as={Center} py={{ base: 3, md: 4 }}>
                  <Text
                    fontSize={{ base: "sm", md: "md" }}
                    fontWeight="bold"
                    color="gray.800"
                  >
                      {testimonial.author}
                  </Text>
                </Card.Footer>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Section>

        <CTA data={data.cta} branding={data.branding} />
        <Footer data={data.footer} branding={data.branding} />
      </main>
    </BrandTheme>
  )
}
