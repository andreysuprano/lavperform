import {
  Avatar,
  Box,
  Flex,
  Heading,
  HStack,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'

import { LoadingState, ThemeText } from '@/components'
import { useWhiteLabel } from '@/config'
import { usePartner } from '@/hooks/queries/useCompany'

import { Props } from './SignupPageLayout.types'

function SignupPageLayoutBase({ children, title, description, highlight }: Props) {
  const { images, texts } = useWhiteLabel()

  const { id } = useParams<{ id?: string }>()
  const { data: partner, isLoading } = usePartner(id)

  return (
    <Flex
      bg="bg.panel"
      direction={{ base: 'column', lg: 'row' }}
      minH={{ base: 'auto', lg: '100dvh' }}
    >
      <Box
        bg="black"
        flex={{ lg: '0 0 38%' }}
        flexShrink={0}
        px={{ base: 4, md: 8, lg: 10 }}
        py={{ base: 5, md: 6, lg: 10 }}
      >
        <Stack
          gap={{ base: 3, md: 5 }}
          h={{ lg: 'full' }}
          justify={{ lg: 'space-between' }}
          maxW={{ lg: 420 }}
        >
          <Stack gap={{ base: 3, md: 5 }}>
            <Image
              alt={texts.appName}
              maxW={{ base: '132px', md: '180px', lg: '220px' }}
              src={images.logoDark}
            />

            <Stack gap={{ base: 1.5, md: 2 }}>
              <Heading
                color="white"
                fontSize={{ base: 'xl', md: '2xl', lg: '3xl' }}
                fontWeight="bold"
                lineHeight="1.2"
              >
                {title}
              </Heading>
              {description && (
                <Text
                  color="whiteAlpha.800"
                  fontSize={{ base: 'sm', md: 'md', lg: 'lg' }}
                  lineHeight="1.6"
                  maxW="42ch"
                >
                  {description}
                </Text>
              )}
              {highlight && (
                <Text
                  color="white"
                  fontSize={{ base: 'xs', md: 'sm' }}
                  fontWeight="semibold"
                  letterSpacing="0.01em"
                  lineHeight="1.5"
                  maxW="42ch"
                >
                  {highlight}
                </Text>
              )}
            </Stack>

            {isLoading && <LoadingState />}
            {id && partner && (
              <HStack
                borderColor="whiteAlpha.300"
                borderRadius="lg"
                borderWidth="1px"
                gap={3}
                p={3}
              >
                <Avatar.Root size="md">
                  <Avatar.Image
                    alt={partner.name}
                    src={partner.avatarUrl}
                  />
                  <Avatar.Fallback name={partner.name} />
                </Avatar.Root>
                <Stack gap={0}>
                  <Text
                    color="whiteAlpha.600"
                    fontSize="xs"
                    fontWeight="medium"
                  >
                    Atendido por
                  </Text>
                  <Text
                    color="white"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    {partner.name}
                  </Text>
                </Stack>
              </HStack>
            )}
          </Stack>

          <Text
            color="gray.500"
            display={{ base: 'none', lg: 'block' }}
            fontSize="sm"
            pt={6}
          >
            <ThemeText textKey="copyright" />
          </Text>
        </Stack>
      </Box>

      <Flex
        flex={1}
        direction="column"
        justify={{ base: 'flex-start', lg: 'center' }}
        minH={{ base: 'auto', lg: '100dvh' }}
        pb={{ base: 4, md: 6, lg: 8 }}
        pt={{ base: 4, md: 5, lg: 8 }}
        px={{ base: 4, md: 6, lg: 10 }}
        w="full"
      >
        <Box
          maxW={520}
          mx={{ base: 'auto', lg: 0 }}
          w="full"
        >
          {children}
        </Box>

        <Text
          color="fg.muted"
          display={{ base: 'block', lg: 'none' }}
          fontSize="xs"
          mt={8}
          textAlign="center"
        >
          <ThemeText textKey="copyright" />
        </Text>
      </Flex>
    </Flex>
  )
}

const SignupPageLayout = memo(SignupPageLayoutBase) as typeof SignupPageLayoutBase

export { SignupPageLayout, type Props as SignupPageLayoutProps }
