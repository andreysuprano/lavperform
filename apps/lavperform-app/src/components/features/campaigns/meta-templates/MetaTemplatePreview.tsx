import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import type { MetaTemplateComponent } from '@/types/metaTemplate.types'

import { extractComponentText, extractHeaderFormat } from './metaTemplate.utils'

type Props = {
  components: MetaTemplateComponent[]
  name?: string
  headerMediaUrl?: string | null
}

function renderBodyPreview(text: string) {
  return text.replace(/\{\{(\d+)\}\}/g, (_, index) => `[${index}]`)
}

const PreviewHeaderMedia = memo(function PreviewHeaderMedia({
  format,
  mediaUrl,
  text,
}: {
  format: string | null
  mediaUrl?: string | null
  text?: string | null
}) {
  if (format === 'IMAGE') {
    return (
      <Box
        bg="bg.muted"
        flexShrink={0}
        h="140px"
        overflow="hidden"
      >
        {mediaUrl ? (
          <img
            alt="Header"
            src={mediaUrl}
            style={{
              display: 'block',
              width: '100%',
              height: '140px',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Flex
            align="center"
            color="fg.muted"
            fontSize="xs"
            h="full"
            justify="center"
          >
            Imagem do header
          </Flex>
        )}
      </Box>
    )
  }

  if (format === 'VIDEO') {
    return (
      <Box
        bg="bg.muted"
        flexShrink={0}
        h="140px"
        overflow="hidden"
      >
        {mediaUrl ? (
          <video
            controls
            src={mediaUrl}
            style={{
              width: '100%',
              height: '140px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <Flex
            align="center"
            color="fg.muted"
            fontSize="xs"
            h="full"
            justify="center"
          >
            Vídeo do header
          </Flex>
        )}
      </Box>
    )
  }

  if (format === 'DOCUMENT' && mediaUrl) {
    return (
      <Box
        bg="bg.muted"
        flexShrink={0}
        px={3}
        py={2}
      >
        <Text
          color="fg.muted"
          fontSize="xs"
        >
          Documento anexado no header
        </Text>
      </Box>
    )
  }

  if (format === 'TEXT' && text) {
    return (
      <Box
        flexShrink={0}
        px={3}
        pt={3}
      >
        <Text
          fontSize="sm"
          fontWeight="semibold"
        >
          {renderBodyPreview(text)}
        </Text>
      </Box>
    )
  }

  return null
})

export function MetaTemplatePreview({
  components,
  name,
  headerMediaUrl,
}: Props) {
  const headerFormat = extractHeaderFormat(components)
  const bodyText = extractComponentText(components, 'BODY')
  const footerText = extractComponentText(components, 'FOOTER')
  const buttonsComponent = components.find(
    (item) => item.type?.toUpperCase() === 'BUTTONS'
  )
  const headerText = extractComponentText(components, 'HEADER')
  const buttons = (buttonsComponent?.buttons ?? []) as Array<{
    type?: string
    text?: string
  }>

  return (
    <Box
      bg="bg"
      borderColor="border.emphasized"
      borderRadius="xl"
      borderWidth="1px"
      maxW="sm"
      overflow="hidden"
      w="full"
    >
      <Box
        bg="green.600"
        flexShrink={0}
        px={4}
        py={2}
      >
        <Text
          color="white"
          fontSize="xs"
          fontWeight="medium"
        >
          Prévia WhatsApp
        </Text>
        {name && (
          <Text
            color="whiteAlpha.800"
            fontSize="2xs"
          >
            {name}
          </Text>
        )}
      </Box>

      <Box
        bg="bg.subtle"
        p={4}
      >
        <Box
          bg="bg"
          borderColor="border"
          borderRadius="lg"
          borderWidth="1px"
          display="flex"
          flexDirection="column"
          maxW="xs"
          ml="auto"
          overflow="hidden"
        >
          <PreviewHeaderMedia
            format={headerFormat}
            mediaUrl={headerMediaUrl}
            text={headerText}
          />

          {bodyText && (
            <Box
              flex="1"
              maxH="220px"
              minH="48px"
              overflowY="auto"
              p={3}
            >
              <Text
                fontSize="sm"
                whiteSpace="pre-wrap"
              >
                {renderBodyPreview(bodyText)}
              </Text>
            </Box>
          )}

          {footerText && (
            <Box
              flexShrink={0}
              px={3}
              pb={2}
            >
              <Text
                color="fg.muted"
                fontSize="2xs"
              >
                {footerText}
              </Text>
            </Box>
          )}

          {buttons.length > 0 && (
            <Stack
              borderColor="border"
              borderTopWidth="1px"
              flexShrink={0}
              gap={0}
            >
              {buttons.map((button, index) => (
                <Box
                  key={`${button.type}-${index}`}
                  borderColor="border"
                  borderTopWidth={index > 0 ? '1px' : undefined}
                  px={3}
                  py={2}
                  textAlign="center"
                >
                  <Text
                    color="blue.500"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    {button.text || 'Botão'}
                  </Text>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  )
}
