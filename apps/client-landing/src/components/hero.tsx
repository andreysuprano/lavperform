"use client"

import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Heading,
  Highlight,
  Icon,
  Stack,
  Text,
  SimpleGrid,
} from "@chakra-ui/react"
import { FaWhatsapp } from "react-icons/fa6"
import { LuClock, LuCreditCard } from "react-icons/lu"
import { LaundryData } from "@/types/laundry"

interface HeroProps {
  data: LaundryData["hero"]
  brandingData: LaundryData["branding"]
}

export function Hero({ data, brandingData }: HeroProps) {
  return (
    <Box
      id="hero"
      position="relative"
      overflow={"hidden"}
      py={{ base: 10, md: 20 }}
      css={{
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url('${data.backgroundImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "linear-gradient(135deg, var(--brand-tertiary), var(--brand-secondary))",
          opacity: 0.6,
          zIndex: 1,
        },
      }}
    >
      <Container maxW="7xl" mx="auto" px={{ base: 4, md: 6, lg: 8 }} position="relative" zIndex={2}>
        <Grid
          minH={{ base: "auto", md: "500px" }}
          gap={{ base: 8, md: 10 }}
          alignItems={"center"}
          templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }}
        >
        <Stack gap={{ base: 4, md: 6 }}>
          <Heading
            color={"white"}
            size={{ base: "3xl", md: "4xl", lg: "5xl" }}
            letterSpacing="tight"
            lineHeight="shorter"
          >
            <Highlight
              query={data.highlightWord}
              styles={{
                color: "white",
                fontWeight: "bold",
                opacity: 0.9,
              }}
            >
              {data.title}
            </Highlight>
          </Heading>
          <Text fontSize={{ base: "lg", md: "2xl" }} color="gray.200">
            {data.subtitle}
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <Stack
              direction="row"
              css={{ background: "var(--brand-secondary)" }}
              gap={3}
              color="white"
              fontSize={{ base: "md", md: "lg" }}
              p={4}
              rounded={"md"}
              opacity={0.9}
              _hover={{
                opacity: 1,
              }}
              align="center"
            >
              <Icon boxSize={{ base: 5, md: 6 }}>
                <LuClock />
              </Icon>
              <Text>
                <b>{data.hours.label}</b>
                <br />
                {data.hours.days}
              </Text>
            </Stack>
            <Stack
              direction="row"
              gap={3}
              css={{ background: "var(--brand-secondary)" }}
              color="white"
              fontSize={{ base: "md", md: "lg" }}
              p={4}
              rounded={"md"}
              opacity={0.9}
              _hover={{
                opacity: 1,
              }}
              align="center"
            >
              <Icon boxSize={{ base: 5, md: 6 }}>
                <LuCreditCard />
              </Icon>
              <Text>
                <b>{data.payment.label}</b>
                <br />
                {data.payment.methods}
              </Text>
            </Stack>
          </SimpleGrid>
        </Stack>
        <Stack align={{ base: "center", lg: "flex-end" }}>
          <Card.Root
            w={{ base: "full", sm: "auto" }}
            maxW={{ base: "full", lg: 500 }}
            textAlign={"center"}
          >
            <Card.Header p={{ base: 4, md: 6 }}>
              <Heading
                size={{ base: "xl", md: "2xl", lg: "3xl" }}
                css={{ background: "var(--brand-primary)" }}
                color={"white"}
                rounded={"xl"}
                p={{ base: 3, md: 4 }}
              >
                {brandingData.slogan}
              </Heading>
            </Card.Header>
            <Card.Body gap={3} p={{ base: 4, md: 6 }}>
              <Text
                fontSize={{ base: "md", md: "xl" }}
                css={{ color: "var(--brand-primary)" }}
                fontWeight={"bold"}
              >
                {brandingData.name} - Lave e seque suas roupas com qualidade
              </Text>
              <Button
                css={{
                  background: "var(--brand-primary)",
                  color: "white",
                  "&:hover": { opacity: 0.9 },
                }}
                size={{ base: "lg", md: "xl" }}
                rounded={"full"}
                onClick={() => window.open(data.ctaLink, "_blank")}
              >
                <Icon>
                  <FaWhatsapp />
                </Icon>
                {data.ctaText}
              </Button>
              <Text color="fg.muted" fontSize={{ base: "sm", md: "md" }}>
                MENOS TRABALHO, MAIS ECONOMIA!
              </Text>
            </Card.Body>
          </Card.Root>
        </Stack>
        </Grid>
      </Container>
    </Box>
  )
}
