import { Box, Button, Flex, SimpleGrid, Stack, Text, Textarea } from '@chakra-ui/react'
import { useState } from 'react'
import { LuStar } from 'react-icons/lu'

import type { GoogleProfileView } from '@/types'

import { formatWhen } from './monthGrid'

export function GoogleBusinessPanel({
  data,
  onReply,
}: {
  data: GoogleProfileView
  onReply: (reviewId: string, comment: string) => Promise<void>
}) {
  if (!data.connected || !data.profile) {
    return (
      <Box
        borderColor="border"
        borderRadius="xl"
        borderWidth="1px"
        p={6}
      >
        <Text fontWeight="semibold">Google Meu Negócio ainda não está conectado</Text>
        <Text
          color="fg.muted"
          mt={1}
        >
          Conecte o perfil da loja em Integrações para ver avaliações e publicar novidades.
        </Text>
        <Button
          asChild
          bg="#093A58"
          color="white"
          mt={4}
        >
          <a href="/integrations">Conectar</a>
        </Button>
      </Box>
    )
  }

  const profile = data.profile
  return (
    <Stack gap={4}>
      <Flex
        bg="bg"
        borderColor="border"
        borderRadius="xl"
        borderWidth="1px"
        direction={{ base: 'column', md: 'row' }}
        gap={4}
        justify="space-between"
        p={4}
      >
        <Flex gap={3}>
          <Flex
            align="center"
            bg="#093A58"
            borderRadius="lg"
            color="white"
            fontSize="2xl"
            fontWeight="bold"
            h="56px"
            justify="center"
            w="56px"
          >
            G
          </Flex>
          <Box>
            <Text
              fontSize="lg"
              fontWeight="semibold"
            >
              {profile.name}
            </Text>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              {[profile.address, profile.hours].filter(Boolean).join(' · ')}
            </Text>
            <Flex
              align="center"
              gap={2}
              mt={1}
            >
              <Text fontWeight="semibold">{profile.rating.toLocaleString('pt-BR')}</Text>
              <Flex color="#F5B400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <LuStar
                    fill={index < Math.round(profile.rating) ? '#F5B400' : 'none'}
                    key={index}
                    size={14}
                  />
                ))}
              </Flex>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                · {profile.reviewCount} avaliações
              </Text>
            </Flex>
          </Box>
        </Flex>
        <Button
          asChild
          variant="outline"
        >
          <a
            href={profile.mapsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Ver no Google
          </a>
        </Button>
      </Flex>
      <SimpleGrid
        columns={{ base: 1, md: 3 }}
        gap={3}
      >
        {profile.insights.map((item) => (
          <Box
            borderColor="border"
            borderRadius="xl"
            borderWidth="1px"
            key={item.label}
            p={3}
          >
            <Text
              color="fg.muted"
              fontSize="xs"
            >
              {item.label}
            </Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
            >
              {item.value}
            </Text>
            {item.delta ? (
              <Text
                color="green.600"
                fontSize="sm"
              >
                {item.delta}
              </Text>
            ) : null}
          </Box>
        ))}
      </SimpleGrid>
      <Box
        borderColor="border"
        borderRadius="xl"
        borderWidth="1px"
        p={4}
      >
        <Text
          fontWeight="semibold"
          mb={3}
        >
          Avaliações
        </Text>
        <Stack gap={4}>
          {data.reviews.map((review) => (
            <ReviewRow
              key={review.id}
              onReply={onReply}
              review={review}
            />
          ))}
          {data.reviews.length === 0 ? (
            <Text color="fg.muted">Nenhuma avaliação por aqui.</Text>
          ) : null}
        </Stack>
      </Box>
      <Box
        borderColor="border"
        borderRadius="xl"
        borderWidth="1px"
        p={4}
      >
        <Text
          fontWeight="semibold"
          mb={3}
        >
          Posts no Google
        </Text>
        <Stack gap={3}>
          {data.posts.map((post) => (
            <Flex
              justify="space-between"
              key={post.id}
            >
              <Box>
                <Text fontWeight="medium">{post.headline || post.caption.slice(0, 60)}</Text>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  {post.status === 'PUBLISHED' ? 'Publicado' : 'Agendado'} em {formatWhen(post.scheduledAt)}
                </Text>
              </Box>
            </Flex>
          ))}
        </Stack>
      </Box>
    </Stack>
  )
}

function ReviewRow({
  review,
  onReply,
}: {
  review: GoogleProfileView['reviews'][number]
  onReply: (reviewId: string, comment: string) => Promise<void>
}) {
  const [text, setText] = useState(review.reply ?? '')
  const [pending, setPending] = useState(false)
  return (
    <Box>
      <Flex
        align="center"
        gap={2}
      >
        <Text fontWeight="medium">{review.author}</Text>
        <Flex color="#F5B400">
          {Array.from({ length: review.rating }).map((_, index) => (
            <LuStar
              fill="#F5B400"
              key={index}
              size={12}
            />
          ))}
        </Flex>
      </Flex>
      <Text
        fontSize="sm"
        mt={1}
      >
        {review.comment}
      </Text>
      {review.reply ? (
        <Text
          bg="bg.muted"
          borderRadius="lg"
          fontSize="sm"
          mt={2}
          p={3}
        >
          {review.reply}
        </Text>
      ) : (
        <Stack
          gap={2}
          mt={2}
        >
          <Textarea
            onChange={(event) => setText(event.target.value)}
            placeholder="Escreva uma resposta"
            rows={2}
            value={text}
          />
          <Button
            alignSelf="flex-start"
            bg="#093A58"
            color="white"
            loading={pending}
            onClick={async () => {
              setPending(true)
              try {
                await onReply(review.id, text)
              } finally {
                setPending(false)
              }
            }}
            size="sm"
          >
            Responder
          </Button>
        </Stack>
      )}
    </Box>
  )
}
