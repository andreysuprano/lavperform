"use client"

import {
  Box,
  Button,
  Container,
  HStack,
  Heading,
  Icon,
  Stack,
  Text,
} from "@chakra-ui/react"
import { FaWhatsapp } from "react-icons/fa"
import { LaundryData } from "@/types/laundry"

interface CTAProps {
  data: LaundryData["cta"]
  branding: LaundryData["branding"]
}

export function CTA({ data }: CTAProps) {
  return (
    <Box
      as="section"
      css={{
        backgroundImage: "linear-gradient(var(--brand-tertiary), var(--brand-secondary))",
      }}
      color="white"
      py={{ base: 10, md: 16 }}
    >
      <Container maxW="7xl" mx="auto" px={{ base: 4, md: 6, lg: 8 }}>
        <Stack
          direction={{ base: "column", lg: "row" }}
          align={{ base: "stretch", lg: "center" }}
          justify="space-between"
          gap={{ base: 6, md: 8 }}
          bg="whiteAlpha.50"
          borderRadius={{ base: "xl", md: "2xl" }}
          p={{ base: 6, md: 10 }}
          shadow="lg"
        >
          <Stack gap={{ base: 2, md: 3 }} maxW={{ base: "full", lg: "60%" }}>
            <Heading size={{ base: "xl", md: "2xl" }} lineHeight="shorter">
              {data.title}
            </Heading>
            <Text fontSize={{ base: "md", md: "lg" }} color="whiteAlpha.900">
              {data.description}
            </Text>
          </Stack>
          <Stack align={{ base: "stretch", lg: "center" }}>
            <Button
              size={{ base: "lg", md: "xl" }}
              rounded="full"
              bg="white"
              w={{ base: "full", lg: "auto" }}
              css={{
                color: "var(--brand-primary)",
                "&:hover": { opacity: 0.9 },
              }}
              onClick={() =>
                window.open(`https://wa.me/${data.whatsappNumber}`, "_blank")
              }
              aria-label="Solicitar atendimento via WhatsApp"
            >
              <HStack gap={3} align="center">
                <Icon>
                  <FaWhatsapp />
                </Icon>
                <Text fontWeight="bold">{data.buttonText}</Text>
              </HStack>
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
