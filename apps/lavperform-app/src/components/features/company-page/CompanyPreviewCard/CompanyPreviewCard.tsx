import { Button, Card, HStack, Link } from '@chakra-ui/react'
import { LuExternalLink } from 'react-icons/lu'

import { useAuth } from '@/context/AuthContext'
import { ClientPage } from '@/pages/organization/ClientPage'

function CompanyPreviewCard() {
  const { selectedCompany } = useAuth()

  const slug = selectedCompany?.slug

  return (
    <Card.Root
      flexGrow={1}
      flexShrink={1}
      minW={{ base: '100%', lg: '360px' }}
      overflow={'hidden'}
      position={'sticky'}
      size={'sm'}
      w="full"
    >
      <Card.Header
        alignItems={'center'}
        as={HStack}
        justifyContent={'space-between'}
        p={3}
      >
        <Card.Title>Preview</Card.Title>
        <Button
          asChild
          size={'2xs'}
        >
          <Link
            href={`/p/${slug}`}
            target="_blank"
            unstyled
          >
            Ver minha página <LuExternalLink />
          </Link>
        </Button>
      </Card.Header>
      <Card.Body p={0}>
        <ClientPage isPreview />
      </Card.Body>
    </Card.Root>
  )
}

export { CompanyPreviewCard }
