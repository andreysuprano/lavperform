import { Box, Text } from '@chakra-ui/react'

import { useSocialMediaTokens } from './socialMediaTokens'

/** Passo 2 do modal. O envio, as miniaturas e a chave de liberdade criativa
 * entram neste componente. */
export function SocialPostPhotosStep() {
  const tokens = useSocialMediaTokens()
  return (
    <Box
      borderColor={tokens.border}
      borderRadius="12px"
      borderStyle="dashed"
      borderWidth="1px"
      data-testid="social-photos-step"
      px={4}
      py={8}
      textAlign="center"
    >
      <Text
        color={tokens.text}
        fontSize="14px"
        fontWeight="semibold"
      >
        Fotos para o post (opcional)
      </Text>
      <Text
        color={tokens.muted}
        fontSize="12px"
        mt={2}
      >
        JPG ou PNG. Você pode seguir sem foto.
      </Text>
    </Box>
  )
}
