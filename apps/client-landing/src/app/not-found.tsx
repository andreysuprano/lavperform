import {
  Box,
  Button,
  Center,
  Heading,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react"
import Image from "next/image"
import Link from "next/link"
import { LuArrowLeft } from "react-icons/lu"

export default function NotFound() {
  return (
    <Box
      minH="100vh"
      bgGradient="to-br"
      gradientFrom="blue.50"
      gradientVia="cyan.100"
      gradientTo="blue.100"
      position="relative"
      overflow="hidden"
    >
      {/* Background decoration */}
      <Box
        position="absolute"
        top={{ base: "-5rem", md: "-10rem" }}
        right={{ base: "-5rem", md: "-10rem" }}
        w={{ base: "10rem", md: "20rem" }}
        h={{ base: "10rem", md: "20rem" }}
        bg="cyan.300"
        rounded="full"
        filter="blur(100px)"
        opacity={0.3}
      />
      <Box
        position="absolute"
        bottom={{ base: "-5rem", md: "-10rem" }}
        left={{ base: "-5rem", md: "-10rem" }}
        w={{ base: "10rem", md: "20rem" }}
        h={{ base: "10rem", md: "20rem" }}
        bg="blue.300"
        rounded="full"
        filter="blur(100px)"
        opacity={0.3}
      />

      {/* Content */}
      <Center minH="100vh" px={{ base: 4, md: 6 }} position="relative" zIndex={1}>
        <VStack gap={{ base: 4, md: 6 }} textAlign="center">
          {/* Logo */}
          <Box
            position="relative"
            w={{ base: "10rem", md: "12rem" }}
            h={{ base: "3rem", md: "4rem" }}
            mb={{ base: 2, md: 4 }}
          >
            <Image
              src="/logo.png"
              alt="Lavperform"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </Box>

          <VStack gap={{ base: 2, md: 4 }}>
            <Heading
              as="h2"
              fontSize={{ base: "xl", sm: "2xl", md: "4xl" }}
              fontWeight="bold"
              color="gray.800"
            >
              Página não encontrada
            </Heading>
            <Text
              fontSize={{ base: "sm", md: "lg" }}
              color="gray.600"
              maxW="md"
              px={2}
            >
              Desculpe, não conseguimos encontrar a landing page que você está
              procurando.
            </Text>
          </VStack>

          {/* CTA Button */}
          <Button
            asChild
            size={{ base: "lg", md: "xl" }}
            rounded="full"
            colorPalette="cyan"
            mt={{ base: 2, md: 4 }}
            _hover={{
              transform: "scale(1.05)",
            }}
            transition="all 0.3s"
          >
            <Link href="https://lavperform.cloud">
              <Icon>
                <LuArrowLeft />
              </Icon>
              Ir para Lavperform
            </Link>
          </Button>

          {/* Help text */}
          <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500" mt={{ base: 2, md: 4 }} px={4}>
            Se você acredita que isso é um erro, entre em contato com o suporte.
          </Text>
        </VStack>
      </Center>

      {/* Footer */}
      <Box
        position="absolute"
        bottom={{ base: 4, md: 8 }}
        left={0}
        right={0}
        textAlign="center"
        px={4}
      >
        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">
          © 2025 Lavperform. Todos os direitos reservados.
        </Text>
      </Box>
    </Box>
  )
}
