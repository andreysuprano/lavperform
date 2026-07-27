import { Box, Container, Stack, Text } from "@chakra-ui/react"
import { LaundryData } from "@/types/laundry"

interface FooterProps {
  data: LaundryData["footer"]
  branding: LaundryData["branding"]
}

export const Footer = ({ data, branding }: FooterProps) => {
  return (
    <Box as="footer" mt={0}>
      <Box css={{ background: "var(--brand-primary)" }} color="white">
        <Container maxW="7xl" mx="auto" py={{ base: 8, md: 10 }} px={{ base: 4, md: 6, lg: 8 }}>
          <Stack align="center" gap={{ base: 4, md: 6 }} textAlign="center">
            <Stack
              direction={{ base: "column", sm: "row" }}
              gap={3}
              alignItems="center"
            >
              <Box position="relative" h={{ base: "50px", md: "60px" }} maxW={{ base: "180px", md: "200px" }}>
                <img
                  alt={`Logo ${branding.name}`}
                  src={branding.logo}
                  style={{ 
                    objectFit: 'contain',
                    width: '100%',
                    height: '100%'
                  }}
                />
              </Box>
              <Stack gap={0} align={{ base: "center", sm: "flex-start" }} color="white">
                <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="black">
                  {branding.name}
                </Text>
                <Text fontSize={{ base: "sm", md: "md" }}>{branding.slogan}</Text>
              </Stack>
            </Stack>
            <Text fontSize={{ base: "md", md: "lg" }} maxW="640px">
              {data.description}
            </Text>
            <Stack gap={1}>
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold">
                {data.locationTitle}
              </Text>
              <Text fontSize={{ base: "sm", md: "md" }} maxW="sm">
                {data.address}
              </Text>
            </Stack>
            <Text fontSize={{ base: "xs", md: "sm" }} opacity={0.9}>
              {data.copyright}
            </Text>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
