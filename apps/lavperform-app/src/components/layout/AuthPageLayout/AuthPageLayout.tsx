import {
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'

import { ThemeImage, ThemeText } from '@/components/common'
import { useWhiteLabel } from '@/config/white-label.config'

import { Props } from './AuthPageLayout.types'

function AuthPageLayoutBase({ children, title, description }: Props) {
  const { colors, getLoginLeftImage } = useWhiteLabel()
  const loginLeftImage = getLoginLeftImage()

  // Layout com imagem personalizada (esquerda e direita)
  if (loginLeftImage) {
    return (
      <Flex
        bgColor={colors.primary}
        bgImage={`linear-gradient(${colors.primary} 20%, {colors.black})`}
        minH="100vh"
      >
        <Flex
          alignItems="center"
          display={{ base: 'none', md: 'flex' }}
          flex={1}
          justifyContent="center"
          position="relative"
        >
          <Image
            alt="Login Background"
            fit="cover"
            h="100vh"
            objectFit="cover"
            src={loginLeftImage}
            w="100%"
          />
        </Flex>
        <Flex
          alignItems="center"
          bg={{ base: colors.primary, md: 'bg.emphasized' }}
          flex={1}
          justifyContent="center"
          minH="100vh"
        >
          <Card.Root
            border={{ md: 'none' }}
            m={10}
            maxW={500}
            w="full"
          >
            <CardHeader>
              <ThemeImage
                imageKey="logo"
                maxW="200px"
                mb={6}
                variant="auto"
              />
              <Text
                fontSize="2xl"
                fontWeight="bold"
              >
                {title}
              </Text>
              {description && <Text color="fg.muted">{description}</Text>}
            </CardHeader>
            <CardBody>{children}</CardBody>
          </Card.Root>
        </Flex>
      </Flex>
    )
  }

  // Layout centralizado caso nao tenha imagem personalizada
  return (
    <Flex
      alignItems="center"
      bgColor={"bg.emphasized"}
      justifyContent="center"
      minH="100vh"
    >
      <Card.Root
        border={{ md: 'none' }}
        m={10}
        maxW={500}
        w="full"
      >
        <CardHeader>
          <ThemeImage
            imageKey="logo"
            maxW="200px"
            mb={6}
            variant="auto"
          />
          <Text
            fontSize="2xl"
            fontWeight="bold"
          >
            {title}
          </Text>
          {description && <Text color="fg.muted">{description}</Text>}
        </CardHeader>
        <CardBody>{children}</CardBody>
      </Card.Root>
    </Flex>
  )
}

const AuthPageLayout = memo(AuthPageLayoutBase) as typeof AuthPageLayoutBase

export { AuthPageLayout, type Props as AuthPageLayoutProps }
