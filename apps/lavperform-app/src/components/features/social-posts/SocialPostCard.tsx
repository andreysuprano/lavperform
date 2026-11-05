import { Box, Flex, Text } from '@chakra-ui/react'

import { useShellMode } from '@/components/layout/AppLayout/useShellMode'
import type { SocialLibraryPost } from '@/types'

import { postWhenLabel, STATUS_LABEL } from './postLibrary'
import { STATUS_STYLE, useSocialMediaTokens } from './socialMediaTokens'

interface Props {
  post: SocialLibraryPost
  onOpen: (post: SocialLibraryPost) => void
  onView: (post: SocialLibraryPost) => void
  onEdit: (post: SocialLibraryPost) => void
  onSchedule: (post: SocialLibraryPost) => void
}

export function SocialPostCard({
  post,
  onOpen,
  onView,
  onEdit,
  onSchedule,
}: Props) {
  const phone = useShellMode() === 'phone'
  const tokens = useSocialMediaTokens()
  const chip = STATUS_STYLE[post.status] ?? STATUS_STYLE.rascunho
  const title = post.headline || post.theme || 'Post sem título'
  const generating = post.status === 'gerando'

  const thumb = generating ? (
    <Flex
      align="center"
      bg="linear-gradient(90deg, #ECEEF1 0%, #F7F8FA 45%, #ECEEF1 90%)"
      borderRadius="8px"
      css={{
        '@keyframes socialShimmer': {
          '0%': { backgroundPosition: '-180% 0' },
          '100%': { backgroundPosition: '180% 0' },
        },
        animation: 'socialShimmer 1.4s linear infinite',
        backgroundSize: '200% 100%',
      }}
      data-testid="post-card-loading"
      direction="column"
      h={phone ? '72px' : '120px'}
      justify="center"
      w={phone ? '72px' : 'full'}
    >
      <Box
        borderColor="rgba(123,201,241,0.7)"
        borderRadius="full"
        borderTopColor="transparent"
        borderWidth="2px"
        boxSize="18px"
        css={{
          '@keyframes socialSpin': { to: { transform: 'rotate(360deg)' } },
          animation: 'socialSpin 0.8s linear infinite',
        }}
      />
      {phone ? null : (
        <Text
          color="#52525B"
          fontSize="12px"
          fontWeight="semibold"
          mt={2}
        >
          Criando seu post…
        </Text>
      )}
    </Flex>
  ) : (
    <Box
      bg="linear-gradient(180deg, #BEE6FA 0%, #7BC9F1 45%, #1E6FA8 75%, #093A58 100%)"
      borderRadius="10px"
      h={phone ? '72px' : '120px'}
      overflow="hidden"
      position="relative"
      w={phone ? '72px' : 'full'}
    >
      {post.thumbnail ? (
        <Box
          alt=""
          as="img"
          h="full"
          objectFit="cover"
          src={post.thumbnail}
          w="full"
        />
      ) : (
        <Text
          bottom="2"
          color="white"
          fontSize={phone ? '10px' : '14px'}
          fontWeight="extrabold"
          left="2"
          lineHeight="1.05"
          position="absolute"
          right="2"
        >
          {title}
        </Text>
      )}
    </Box>
  )

  const meta = (
    <Flex
      align="center"
      justify="space-between"
      w="full"
    >
      <Flex
        align="center"
        bg={chip.bg}
        borderRadius="full"
        gap="6px"
        h="24px"
        px="10px"
      >
        <Box
          bg={chip.color}
          borderRadius="full"
          boxSize="6px"
        />
        <Text
          color={chip.color}
          fontSize="12px"
          fontWeight="semibold"
        >
          {STATUS_LABEL[post.status]}
        </Text>
      </Flex>
      <Text
        color={tokens.muted}
        fontSize="11px"
      >
        {postWhenLabel(post)}
      </Text>
    </Flex>
  )

  return (
    <Box
      bg={tokens.card}
      borderColor={generating ? tokens.accent : tokens.border}
      borderRadius="12px"
      borderWidth={generating ? '2px' : '1px'}
      boxShadow={generating ? '0 0 0 4px rgba(123,201,241,0.2)' : undefined}
      data-status={post.status}
      data-testid={`social-post-${post.id}`}
      p={phone ? '16px' : '24px'}
    >
      <Flex
        align="stretch"
        cursor={generating ? 'default' : 'pointer'}
        direction={phone ? 'row' : 'column'}
        gap={phone ? 3 : 4}
        onClick={() => {
          if (!generating) onOpen(post)
        }}
        textAlign="left"
      >
        {thumb}
        <Flex
          direction="column"
          flex="1"
          gap={phone ? 1 : 4}
          minW={0}
        >
          {generating && !phone ? (
            <Flex
              direction="column"
              gap={2}
            >
              <Box
                bg="#ECEEF1"
                borderRadius="8px"
                h="14px"
                w="70%"
              />
              <Box
                bg="#ECEEF1"
                borderRadius="8px"
                h="12px"
                w="90%"
              />
            </Flex>
          ) : (
            <Box>
              <Text
                color={tokens.text}
                fontSize="15px"
                fontWeight="semibold"
                lineClamp={1}
              >
                {title}
              </Text>
              <Text
                color={tokens.muted}
                fontSize="12px"
                lineClamp={2}
                mt="6px"
              >
                {post.captionExcerpt || post.theme}
              </Text>
            </Box>
          )}
          {meta}
        </Flex>
      </Flex>
      {post.status === 'gerado' && (
        <Flex
          gap={2}
          mt={3}
          onClick={(event) => event.stopPropagation()}
        >
          {(
            [
              ['Ver', onView],
              ['Editar', onEdit],
              ['Agendar', onSchedule],
            ] as const
          ).map(([label, action]) => (
            <Box
              as="button"
              borderColor={tokens.border}
              borderRadius="10px"
              borderWidth="1px"
              color={tokens.text}
              flex="1"
              fontSize="13px"
              fontWeight="semibold"
              h="44px"
              key={label}
              onClick={() => action(post)}
              type="button"
            >
              {label}
            </Box>
          ))}
        </Flex>
      )}
    </Box>
  )
}
