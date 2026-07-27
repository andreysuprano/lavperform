import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react"
import { SystemStyleObject } from "@chakra-ui/react"

interface SectionProps extends React.PropsWithChildren {
  id: string
  bgColor?: string
  title: string
  description: string
  css?: SystemStyleObject
}

export function Section({
  id,
  bgColor = "white",
  title,
  description,
  children,
  css: customCss,
}: SectionProps) {
  return (
    <Box
      id={id}
      bgColor={bgColor}
      overflow={"hidden"}
      py={{ base: 12, md: 20 }}
      style={{
        scrollMarginTop: "80px",
      }}
      css={customCss}
    >
      <Container maxW="7xl" mx="auto" px={{ base: 4, md: 6, lg: 8 }}>
        <VStack gap={{ base: 6, md: 10 }} align="center">
          <VStack gap={{ base: 2, md: 4 }} textAlign="center">
            <Heading
              as={"h2"}
              fontWeight={"bold"}
              size={{ base: "2xl", md: "3xl" }}
              letterSpacing="tight"
              css={{ color: "var(--brand-primary)" }}
            >
              {title}
            </Heading>
            <Text
              fontSize={{ base: "sm", md: "lg" }}
              color="gray.600"
              maxW="2xl"
            >
              {description}
            </Text>
          </VStack>
          <Box w="full">{children}</Box>
        </VStack>
      </Container>
    </Box>
  )
}
