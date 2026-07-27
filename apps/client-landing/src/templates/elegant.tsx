import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { BrandTheme } from "@/components/brand-theme"
import { LocationSection } from "@/components/location-section"
import {
  Accordion,
  Box,
  Button,
  Center,
  Container,
  Flex,
  HStack,
  Icon,
  Text,
  VStack,
  Stack,
  Badge,
  Separator,
} from "@chakra-ui/react"
import { Prose } from "@/components/ui/prose"
import { FaStar, FaQuoteLeft, FaCheck } from "react-icons/fa"
import { LaundryData } from "@/types/laundry"

// Navegação padrão caso o backend não envie todos os itens
const DEFAULT_NAVIGATION = [
  { label: "Serviços", href: "#servicos" },
  { label: "Localização", href: "#localizacao" },
  { label: "FAQ", href: "#faq" },
  { label: "Avaliações", href: "#avaliacoes" },
]

interface ElegantTemplateProps {
  data: LaundryData
}

export function ElegantTemplate({ data }: ElegantTemplateProps) {
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
        
        {/* Hero Section - Estilo Minimalista */}
        <Box
          position="relative"
          minH={{ base: "70vh", md: "80vh" }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
          css={{
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: data.hero.backgroundImage 
                ? `url(${data.hero.backgroundImage})` 
                : "linear-gradient(135deg, var(--brand-tertiary) 0%, var(--brand-secondary) 100%)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.15,
              zIndex: 0,
            }
          }}
        >
          <Container maxW="6xl" position="relative" zIndex={1}>
            <VStack gap={{ base: 6, md: 10 }} textAlign="center" py={{ base: 8, md: 12 }}>
              <VStack gap={{ base: 3, md: 4 }}>
                <Text
                  fontSize={{ base: "sm", md: "md" }}
                  fontWeight="medium"
                  letterSpacing="wider"
                  textTransform="uppercase"
                  css={{ color: "var(--brand-secondary)" }}
                >
                  {data.hero.title}
                </Text>
                <Text
                  as="h1"
                  fontSize={{ base: "4xl", md: "6xl", lg: "7xl" }}
                  fontWeight="black"
                  lineHeight="1.1"
                  css={{ color: "var(--brand-primary)" }}
                >
                  {data.hero.highlightWord}
                </Text>
                <Text
                  fontSize={{ base: "lg", md: "xl", lg: "2xl" }}
                  color="gray.600"
                  maxW="3xl"
                  fontWeight="light"
                >
                  {data.hero.subtitle}
                </Text>
              </VStack>

              <HStack gap={{ base: 4, md: 8 }} flexWrap="wrap" justify="center">
                <Badge
                  size={{ base: "md", md: "lg" }}
                  px={{ base: 4, md: 6 }}
                  py={{ base: 2, md: 3 }}
                  rounded="full"
                  bg="white"
                  shadow="md"
                >
                  <Text fontSize={{ base: "sm", md: "md" }} color="gray.700">
                    📍 {data.hero.location}
                  </Text>
                </Badge>
                <Badge
                  size={{ base: "md", md: "lg" }}
                  px={{ base: 4, md: 6 }}
                  py={{ base: 2, md: 3 }}
                  rounded="full"
                  bg="white"
                  shadow="md"
                >
                  <Text fontSize={{ base: "sm", md: "md" }} color="gray.700">
                    🕐 {data.hero.hours.time}
                  </Text>
                </Badge>
              </HStack>

              <Button
                asChild
                size={{ base: "xl", md: "2xl" }}
                rounded="full"
                px={{ base: 8, md: 12 }}
                py={{ base: 6, md: 8 }}
                css={{
                  background: "var(--brand-primary)",
                  color: "white",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                  "&:hover": { 
                    transform: "translateY(-2px)",
                    boxShadow: "0 15px 50px rgba(0,0,0,0.15)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <a href={data.hero.ctaLink}>
                  {data.hero.ctaText}
                </a>
              </Button>
            </VStack>
          </Container>
        </Box>

        {/* Seção de Avaliações - Primeiro para gerar confiança */}
        <Box py={{ base: 12, md: 20 }} bg="white">
          <Container maxW="6xl">
            <VStack gap={{ base: 8, md: 12 }}>
              <VStack gap={3} textAlign="center">
                <Text
                  fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
                  fontWeight="black"
                  css={{ color: "var(--brand-primary)" }}
                >
                  {data.testimonials.title}
                </Text>
                <Text fontSize={{ base: "md", md: "lg" }} color="gray.600" maxW="2xl">
                  {data.testimonials.description}
                </Text>
              </VStack>

              <Stack
                direction={{ base: "column", lg: "row" }}
                gap={{ base: 6, md: 8 }}
                w="full"
              >
                {data.testimonials.items.map((testimonial, index) => (
                  <Box
                    key={index}
                    flex="1"
                    p={{ base: 6, md: 8 }}
                    bg="gray.50"
                    rounded="2xl"
                    position="relative"
                    borderLeft="4px solid"
                    borderColor="var(--brand-secondary)"
                    transition="all 0.3s"
                    _hover={{ transform: "translateY(-4px)", shadow: "xl" }}
                  >
                    <Icon
                      position="absolute"
                      top={{ base: 4, md: 6 }}
                      right={{ base: 4, md: 6 }}
                      boxSize={{ base: 8, md: 10 }}
                      color="var(--brand-primary)"
                      opacity={0.2}
                    >
                      <FaQuoteLeft />
                    </Icon>
                    
                    <VStack align="start" gap={{ base: 4, md: 5 }}>
                      <HStack color="orange.400" gap={1}>
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <Icon key={starIndex} boxSize={{ base: 4, md: 5 }}>
                            <FaStar />
                          </Icon>
                        ))}
                      </HStack>
                      
                      <Text
                        fontSize={{ base: "md", md: "lg" }}
                        color="gray.700"
                        fontStyle="italic"
                        lineHeight="tall"
                      >
                        {testimonial.quote}
                      </Text>
                      
                      <Text
                        fontSize={{ base: "sm", md: "md" }}
                        fontWeight="bold"
                        css={{ color: "var(--brand-primary)" }}
                      >
                          {testimonial.author}
                      </Text>
                    </VStack>
                  </Box>
                ))}
              </Stack>
            </VStack>
          </Container>
        </Box>

        {/* Seção de Serviços - Lista Vertical Elegante */}
        <Box 
          id="servicos" 
          py={{ base: 12, md: 20 }} 
          css={{ background: "var(--brand-tertiary)" }}
        >
          <Container maxW="5xl">
            <VStack gap={{ base: 8, md: 12 }}>
              <VStack gap={3} textAlign="center">
                <Text
                  fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
                  fontWeight="black"
                  css={{ color: "var(--brand-primary)" }}
                >
                  {data.services.title}
                </Text>
                <Text fontSize={{ base: "md", md: "lg" }} color="gray.600" maxW="2xl">
                  {data.services.description}
                </Text>
              </VStack>

              <VStack gap={{ base: 4, md: 6 }} w="full">
                {data.services.items.map((service, index) => (
                  <Box
                    key={index}
                    w="full"
                    bg="white"
                    rounded="2xl"
                    overflow="hidden"
                    shadow="lg"
                    transition="all 0.3s"
                    _hover={{ shadow: "2xl", transform: "translateX(8px)" }}
                  >
                    <Flex
                      direction={{ base: "column", md: "row" }}
                      align={{ base: "stretch", md: "center" }}
                      gap={0}
                    >
                      <Box
                        w={{ base: "full", md: "200px" }}
                        bg="var(--brand-primary)"
                        p={{ base: 6, md: 8 }}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text
                          fontSize={{ base: "2xl", md: "3xl" }}
                          fontWeight="black"
                          color="white"
                          textAlign="center"
                        >
                          {service.price}
                        </Text>
                      </Box>

                      <Box flex="1" p={{ base: 6, md: 8 }}>
                        <VStack align="start" gap={{ base: 3, md: 4 }}>
                          <Text
                            fontSize={{ base: "xl", md: "2xl" }}
                            fontWeight="bold"
                            css={{ color: "var(--brand-primary)" }}
                          >
                            {service.title}
                          </Text>
                          
                          <Text fontSize={{ base: "sm", md: "md" }} color="gray.600">
                            {service.description}
                          </Text>

                          <Separator my={2} />

                          <VStack align="start" gap={2} w="full">
                            {service.vantageList.map((vantage, vIndex) => (
                              <HStack key={vIndex} gap={3}>
                                <Icon
                                  boxSize={{ base: 4, md: 5 }}
                                  css={{ color: "var(--brand-secondary)" }}
                                >
                                  <FaCheck />
                                </Icon>
                                <Text fontSize={{ base: "sm", md: "md" }} color="gray.700">
                                  {vantage}
                                </Text>
                              </HStack>
                            ))}
                          </VStack>
                        </VStack>
                      </Box>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            </VStack>
          </Container>
        </Box>

        {/* Seção de Localização - Design Compacto */}
        <Box id="localizacao" py={{ base: 12, md: 20 }} bg="white">
          <Container maxW="5xl">
            <VStack gap={{ base: 8, md: 12 }}>
              <VStack gap={3} textAlign="center">
                <Text
                  fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
                  fontWeight="black"
                  css={{ color: "var(--brand-primary)" }}
                >
                  {data.location.title}
                </Text>
                <Text fontSize={{ base: "md", md: "lg" }} color="gray.600" maxW="2xl">
                  {data.location.description}
                </Text>
              </VStack>

              <LocationSection items={data.location.items} />
            </VStack>
          </Container>
        </Box>

        {/* Seção de FAQ - Estilo Clean */}
        <Box 
          id="faq" 
          py={{ base: 12, md: 20 }} 
          css={{ background: "var(--brand-tertiary)" }}
        >
          <Container maxW="4xl">
            <VStack gap={{ base: 8, md: 12 }}>
              <VStack gap={3} textAlign="center">
                <Text
                  fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
                  fontWeight="black"
                  css={{ color: "var(--brand-primary)" }}
                >
                  {data.faq.title}
                </Text>
                <Text fontSize={{ base: "md", md: "lg" }} color="gray.600" maxW="2xl">
                  {data.faq.description}
                </Text>
              </VStack>

              <Accordion.Root collapsible w="full" variant="plain">
                {data.faq.items.map((item, index) => (
                  <Accordion.Item 
                    key={index} 
                    value={item.value}
                    bg="white"
                    rounded="xl"
                    mb={4}
                    shadow="md"
                    overflow="hidden"
                  >
                    <Accordion.ItemTrigger 
                      py={{ base: 4, md: 5 }} 
                      px={{ base: 4, md: 6 }}
                      _hover={{ bg: "gray.50" }}
                    >
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
                      <Accordion.ItemBody 
                        color="gray.600" 
                        fontSize={{ base: "sm", md: "md" }}
                        px={{ base: 4, md: 6 }}
                        pb={{ base: 4, md: 5 }}
                      >
                        <Prose dangerouslySetInnerHTML={{ __html: item.text }} />
                      </Accordion.ItemBody>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </VStack>
          </Container>
        </Box>

        <CTA data={data.cta} branding={data.branding} />
        <Footer data={data.footer} branding={data.branding} />
      </main>
    </BrandTheme>
  )
}
