import { Box, Flex, Text } from '@chakra-ui/react'
import { LuChevronLeft } from 'react-icons/lu'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'

import { LoadingState, PostArtwork } from '@/components'
import { stripHashtags } from '@/components/features/social-posts/postLibrary'
import { STATUS_STYLE, useSocialMediaTokens } from '@/components/features/social-posts/socialMediaTokens'
import { useAuth } from '@/context/AuthContext'
import { useBrandIdentity, useSocialDraft } from '@/hooks/queries/useSocialPosts'
import { activeCaptionText, DEFAULT_BRAND, type SocialPostStatus } from '@/types'

export function SocialPostDetailPage() {
  const { draftId = '' } = useParams()
  const navigate = useNavigate()
  const tokens = useSocialMediaTokens()
  const { selectedCompany } = useAuth()
  const brand = useBrandIdentity(selectedCompany?.id)
  const draft = useSocialDraft(draftId)
  const variation =
    draft.data?.variations.find((item) => item.id === draft.data?.selectedVariationId) ??
    draft.data?.variations[0]
  const caption = variation ? stripHashtags(activeCaptionText(variation)) : ''
  const status: SocialPostStatus = variation ? 'gerado' : 'rascunho'
  const chip = STATUS_STYLE[status]

  if (draft.isLoading || !draft.data) {
    return <LoadingState title="Abrindo post..." />
  }

  const identity = brand.data ?? {
    ...DEFAULT_BRAND,
    id: null,
    companyId: selectedCompany?.id ?? '',
    persisted: false,
  }

  return (
    <Box>
      <Flex
        align="center"
        color={tokens.muted}
        fontSize="12px"
        gap={2}
        mb={6}
      >
        <RouterLink to="/social/generator">Social Media</RouterLink>
        <Text>/</Text>
        <Text color={tokens.text}>{variation?.headline || draft.data.theme}</Text>
      </Flex>
      <Flex
        align="start"
        direction={{ base: 'column', lg: 'row' }}
        gap={6}
      >
        <Box
          bg={tokens.card}
          borderColor={tokens.border}
          borderRadius="12px"
          borderWidth="1px"
          p={6}
        >
          {variation?.slides[0] ? (
            <Box maxW="420px">
              <PostArtwork
                brand={identity}
                format={draft.data.format}
                slide={variation.slides[0]}
              />
            </Box>
          ) : (
            <Box
              bg="linear-gradient(180deg, #BEE6FA, #093A58)"
              borderRadius="10px"
              h="320px"
              w="320px"
            />
          )}
        </Box>
        <Box
          bg={tokens.card}
          borderColor={tokens.border}
          borderRadius="12px"
          borderWidth="1px"
          flex="1"
          p={6}
        >
          <Flex
            align="center"
            bg={chip.bg}
            borderRadius="full"
            display="inline-flex"
            gap="6px"
            h="24px"
            mb={4}
            px="10px"
          >
            <Box bg={chip.color} borderRadius="full" boxSize="6px" />
            <Text color={chip.color} fontSize="12px" fontWeight="semibold">
              {status === 'gerado' ? 'Gerado' : 'Rascunho'}
            </Text>
          </Flex>
          <Text color={tokens.text} fontSize="22px" fontWeight="bold">
            {variation?.headline || draft.data.theme}
          </Text>
          <Text color={tokens.text} fontSize="14px" mt={4} whiteSpace="pre-wrap">
            {caption || stripHashtags(draft.data.theme)}
          </Text>
          <Flex gap={3} mt={6}>
            <Box
              as="button"
              borderColor={tokens.border}
              borderRadius="10px"
              borderWidth="1px"
              flex="1"
              fontWeight="semibold"
              h="48px"
              onClick={() => navigate('/social/generator')}
              type="button"
            >
              <Flex align="center" gap={2} justify="center">
                <LuChevronLeft size={16} />
                Voltar
              </Flex>
            </Box>
          </Flex>
        </Box>
      </Flex>
    </Box>
  )
}
