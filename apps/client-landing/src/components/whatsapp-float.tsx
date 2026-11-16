import { Box, Icon } from "@chakra-ui/react"
import { FaWhatsapp } from "react-icons/fa"
import { buildWhatsappUrl } from "@/lib/whatsapp"
import { LaundryData } from "@/types/laundry"

interface WhatsappFloatProps {
  cta: LaundryData["cta"]
}

export function WhatsappFloat({ cta }: WhatsappFloatProps) {
  const href = buildWhatsappUrl(cta?.whatsappNumber, cta?.whatsappMessage)
  if (!href) return null

  return (
    <Box
      asChild
      position="fixed"
      bottom={{ base: 4, md: 6 }}
      right={{ base: 4, md: 6 }}
      zIndex={40}
      display="flex"
      alignItems="center"
      justifyContent="center"
      boxSize={{ base: "56px", md: "64px" }}
      borderRadius="full"
      bg="#25D366"
      color="white"
      shadow="lg"
      css={{
        "&:hover": { background: "#1ebe5d" },
      }}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
      >
        <Icon boxSize={{ base: 7, md: 8 }}>
          <FaWhatsapp />
        </Icon>
      </a>
    </Box>
  )
}
