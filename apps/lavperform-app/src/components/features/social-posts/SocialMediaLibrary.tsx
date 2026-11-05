import { Box, Flex, Text } from '@chakra-ui/react'
import { LuPlus, LuSparkles } from 'react-icons/lu'

import { useShellMode } from '@/components/layout/AppLayout/useShellMode'
import type { SocialLibraryPost } from '@/types'

import {
  filterCounts,
  filterLibrary,
  LIBRARY_FILTERS,
  type LibraryFilter,
} from './postLibrary'
import { useSocialMediaTokens } from './socialMediaTokens'
import { SocialPostCard } from './SocialPostCard'

interface Props {
  posts: SocialLibraryPost[]
  filter: LibraryFilter
  onFilter: (filter: LibraryFilter) => void
  onCreate: () => void
  onOpen: (post: SocialLibraryPost) => void
  onView: (post: SocialLibraryPost) => void
  onEdit: (post: SocialLibraryPost) => void
  onSchedule: (post: SocialLibraryPost) => void
}

export function SocialMediaLibrary({
  posts,
  filter,
  onFilter,
  onCreate,
  onOpen,
  onView,
  onEdit,
  onSchedule,
}: Props) {
  const phone = useShellMode() === 'phone'
  const tokens = useSocialMediaTokens()
  const counts = filterCounts(posts)
  const visible = filterLibrary(posts, filter)
  const emptyLibrary = posts.length === 0

  return (
    <Box>
      {!phone && (
      <Flex
        align="center"
        justify="space-between"
        mb="12px"
      >
        <Flex
          align="center"
          gap="10px"
        >
          <LuSparkles
            color={tokens.deep}
            size={22}
          />
          <Text
            color={tokens.text}
            fontSize="24px"
            fontWeight="bold"
            lineHeight="29px"
          >
            Social Media
          </Text>
        </Flex>
        <Box
          as="button"
          bg={tokens.accent}
          borderRadius="10px"
          color={tokens.deep}
          data-testid="new-social-post"
          fontSize="14px"
          fontWeight="semibold"
          h="44px"
          onClick={onCreate}
          px="18px"
          type="button"
        >
          <Flex
            align="center"
            gap={2}
          >
            <LuPlus size={16} />
            Novo post
          </Flex>
        </Box>
      </Flex>
      )}
      <Text
        color={tokens.muted}
        display={phone ? 'none' : 'block'}
        fontSize="12px"
        mb="32px"
      >
        Crie posts para Instagram, Facebook e Google com a ajuda da IA.
      </Text>
      <Flex
        gap={2}
        mb={phone ? 4 : '32px'}
        overflowX="auto"
        pb={1}
      >
        {LIBRARY_FILTERS.map((item) => {
          const active = filter === item.id
          return (
            <Box
              as="button"
              bg={active ? tokens.selectedBg : tokens.card}
              borderColor={active ? tokens.accent : tokens.border}
              borderRadius="full"
              borderWidth="1px"
              color={active ? tokens.deep : tokens.text}
              data-testid={`social-filter-${item.id}`}
              flexShrink={0}
              fontSize="13px"
              fontWeight="medium"
              h="36px"
              key={item.id}
              onClick={() => onFilter(item.id)}
              px="14px"
              type="button"
            >
              {item.label}{' '}
              <Box
                as="span"
                color={tokens.muted}
              >
                {counts[item.id]}
              </Box>
            </Box>
          )
        })}
      </Flex>
      {emptyLibrary ? (
        <Flex
          align="center"
          bg={tokens.card}
          borderColor={tokens.border}
          borderRadius="12px"
          borderWidth="1px"
          data-testid="social-empty"
          direction="column"
          px={6}
          py="48px"
          textAlign="center"
        >
          <Flex
            align="center"
            bg={tokens.selectedBg}
            borderRadius="full"
            boxSize="72px"
            color={tokens.deep}
            justify="center"
            mb={4}
          >
            <LuSparkles size={32} />
          </Flex>
          <Text
            color={tokens.text}
            fontSize="22px"
            fontWeight="bold"
          >
            Nenhum post ainda
          </Text>
          <Text
            color={tokens.muted}
            fontSize="14px"
            lineHeight="21px"
            maxW="420px"
            mt={3}
          >
            Conte o que quer divulgar e a gente cria o texto e a imagem. Você
            revisa antes de publicar.
          </Text>
          <Box
            as="button"
            bg={tokens.accent}
            borderRadius="10px"
            color={tokens.deep}
            data-testid="create-first-post"
            fontSize="15px"
            fontWeight="semibold"
            h="48px"
            mt={4}
            onClick={onCreate}
            px={6}
            type="button"
          >
            <Flex
              align="center"
              gap={2}
            >
              <LuPlus size={18} />
              Criar primeiro post
            </Flex>
          </Box>
        </Flex>
      ) : visible.length === 0 ? (
        <Text
          color={tokens.muted}
          py={8}
          textAlign="center"
        >
          Nenhum post com esse filtro.
        </Text>
      ) : (
        <Box
          display="grid"
          gap={phone ? '16px' : '24px'}
          gridTemplateColumns={
            phone
              ? '1fr'
              : { base: '1fr', md: '1fr 1fr', xl: 'repeat(4, minmax(0, 1fr))' }
          }
        >
          {visible.map((post) => (
            <SocialPostCard
              key={post.id}
              onEdit={onEdit}
              onOpen={onOpen}
              onSchedule={onSchedule}
              onView={onView}
              post={post}
            />
          ))}
        </Box>
      )}
      {phone && (
        <Box
          as="button"
          bg={tokens.accent}
          borderRadius="full"
          bottom="calc(56px + env(safe-area-inset-bottom, 0px) + 16px)"
          boxShadow="0 8px 20px rgba(0,0,0,0.16)"
          color={tokens.deep}
          data-testid="new-social-post"
          fontSize="15px"
          fontWeight="semibold"
          h="48px"
          onClick={onCreate}
          position="fixed"
          px={4}
          right={4}
          type="button"
          zIndex={15}
        >
          <Flex
            align="center"
            gap={2}
          >
            <LuPlus size={18} />
            Novo post
          </Flex>
        </Box>
      )}
    </Box>
  )
}
