import {
  Avatar,
  Card,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'

import { LoadingState, ThemeText } from '@/components'
import { useWhiteLabel } from '@/config'
import { usePartner } from '@/hooks/queries/useCompany'

import { Props } from './RegisterPageLayout.types'

function RegisterPageLayoutBase({ children, title, description }: Props) {
  const { images, texts } = useWhiteLabel()

  const { id } = useParams<{ id: string }>()
  const { data: partner, isLoading } = usePartner(id)

  return (
    <Flex
      bgColor="black"
      flexDirection={{ base: 'column', md: 'row' }}
      minH="100vh"
    >
      <VStack
        alignItems="center"
        flex={1}
        justifyContent="space-between"
      >
        <Stack
          maxW={500}
          p={10}
          position={{ base: 'relative', md: 'sticky' }}
          top={0}
        >
          <Image
            alt={texts.appName}
            maxW="250px"
            mb={6}
            src={images.logoDark}
          />
          <Heading
            color="white"
            size="3xl"
          >
            {title}
          </Heading>
          {description && (
            <Text
              color="whiteAlpha.700"
              fontSize="lg"
            >
              {description}
            </Text>
          )}
          {isLoading && <LoadingState />}
          {id && partner && (
            <Card.Root
              bg="transparent"
              mt={4}
              variant="outline"
            >
              <Card.Header>
                <Heading
                  color="white"
                  size="md"
                >
                  Atendido por:
                </Heading>
              </Card.Header>
              <Card.Body>
                <Flex
                  alignItems="center"
                  gap={4}
                >
                  <Avatar.Root size="xl">
                    <Avatar.Image
                      alt={partner?.name}
                      src={partner?.avatarUrl}
                    />
                    <Avatar.Fallback name={partner?.name} />
                  </Avatar.Root>
                  <Stack gap={1}>
                    <Heading
                      color="white"
                      size="xl"
                    >
                      {partner?.name || 'Parceiro'}
                    </Heading>
                    <Text color="whiteAlpha.700">{partner?.email || null}</Text>
                  </Stack>
                </Flex>
              </Card.Body>
            </Card.Root>
          )}
        </Stack>
        <Text
          bottom={0}
          color="gray.400"
          fontSize="sm"
          position={'sticky'}
          py={4}
          textAlign="center"
          w="full"
        >
          <ThemeText textKey="copyright" />
        </Text>
      </VStack>
      <Flex
        alignItems="center"
        bg="bg.panel"
        flex={1}
        flexDirection="column"
        justifyContent="center"
        minH="100vh"
      >
        {children}
      </Flex>
    </Flex>
  )
}

const RegisterPageLayout = memo(
  RegisterPageLayoutBase
) as typeof RegisterPageLayoutBase

export { RegisterPageLayout, type Props as RegisterPageLayoutProps }
