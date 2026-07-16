import {
  Avatar,
  Bleed,
  Box,
  Button,
  Card,
  Center,
  Group,
  IconButton,
  Image,
  Link,
  Text,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { BsWhatsapp } from 'react-icons/bs'
import { FaDoorOpen } from 'react-icons/fa'
import { FiLink } from 'react-icons/fi'
import { LuClock, LuMapPinned } from 'react-icons/lu'
import { useParams } from 'react-router-dom'

import { CustomDrawer, LazyImage, LoadingState } from '@/components'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { useCompanyPage } from '@/hooks/useCompanyPage'
import { organizationPageService } from '@/services'
import type { Company } from '@/types'
import { OrganizationPage } from '@/types/organization-page.types'
import { checkIfOpen, sortOpeningHours } from '@/utils/businessHours'
import { clearPhone } from '@/utils/strings'

function ClientPage({ isPreview = false }: { isPreview?: boolean }) {
  const { images, texts } = useWhiteLabel()

  const { slug } = useParams<{ slug: string }>()

  const { selectedCompany } = useAuth()
  const { data } = useCompanyPage()

  const [companyData, setCompanyData] =
    useState<Partial<OrganizationPage> | null>(data)

  const linkPage = useMemo(
    () => companyData?.linkPages?.[0],
    [companyData]
  ) as Partial<Company>

  const addressText = useMemo(
    () =>
      companyData?.address
        ? `${companyData.address.street}, ${companyData.address.number} - ${companyData.address.city}/${companyData.address.state}`
        : 'Endereço não informado',
    [companyData]
  )

  const mapURL = useMemo(
    () =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        addressText
      )}`,
    [addressText]
  )

  const businessStatus = useMemo(
    () => checkIfOpen(companyData?.openingHours),
    [companyData?.openingHours]
  )

  const sortedOpeningHours = useMemo(
    () => sortOpeningHours(companyData?.openingHours),
    [companyData?.openingHours]
  )

  useEffect(() => {
    if (data) {
      setCompanyData((prev) => ({
        ...prev,
        ...selectedCompany,
        ...linkPage,
        ...data,
      }))
    }
  }, [data, linkPage, selectedCompany])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await organizationPageService.getBySlug(
          slug || selectedCompany?.slug || ''
        )

        if (!response) return

        const companyFormated = {
          ...response,
          ...response.linkPages?.[0],
        }

        setCompanyData((prev) => ({
          ...prev,
          ...companyFormated,
        }))
      } catch (error) {
        console.error('❌ Erro ao buscar dados da página:', error)
      }
    }
    fetchData()
  }, [slug, selectedCompany])

  if (!companyData) return <LoadingState />

  return (
    <Box
      alignItems={'center'}
      bgImage={`linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.8)), url(${images.defaultBackground})`}
      bgSize="cover"
      display="flex"
      h={{ base: isPreview ? 'auto' : '100dvh', md: '100%' }}
      justifyContent="center"
      minH={isPreview ? 'auto' : '100dvh'}
      overflow={'auto'}
      p={{ base: 0, md: isPreview ? 0 : 10 }}
    >
      <Card.Root
        // bg={companyData.bgColor || 'white'} // TODO: Habilitar seleção de cor de fundo futuramente
        borderWidth={0}
        maxW="xl"
        minH={{ base: '100dvh', md: 'auto' }}
        overflow="hidden"
        rounded={{ base: 'none', md: isPreview ? 'none' : 'xl' }}
        size="sm"
        w="full"
      >
        {!!companyData.coverImage && (
          <Bleed blockEnd={{ base: 6, md: isPreview ? 6 : 0 }}>
            <LazyImage
              alt={companyData.name || 'Cover Image'}
              h={200}
              objectFit="cover"
              src={companyData.coverImage}
              w="full"
            />
          </Bleed>
        )}
        <Card.Header
          as={Center}
          bg="bg.panel"
          flexDirection={'row'}
          gap={2}
          justifyContent={'flex-start'}
          roundedStartEnd={{ base: '3xl', md: isPreview ? '3xl' : 0 }}
          roundedStartStart={{ base: '3xl', md: isPreview ? '3xl' : 0 }}
          zIndex={1}
        >
          <Avatar.Root size="2xl">
            <Avatar.Fallback name={companyData.name} />
            <Avatar.Image src={companyData.avatarUrl} />
          </Avatar.Root>
          <Box flex={1}>
            <Center
              flexDirection={'row'}
              gap={2}
              justifyContent="flex-start"
            >
              <Card.Title>{companyData.name || 'Company Name'}</Card.Title>
            </Center>
            <Card.Description>{addressText}</Card.Description>
          </Box>
        </Card.Header>
        <Card.Header
          flexDirection={'row'}
          justifyContent={'space-between'}
        >
          {sortedOpeningHours && sortedOpeningHours.length > 0 && (
            <Button
              colorPalette={businessStatus.isOpen ? 'green' : 'red'}
              cursor={'default'}
              rounded={'lg'}
              size="xs"
              variant="solid"
            >
              <FaDoorOpen /> {businessStatus.message}
            </Button>
          )}
          <Group>
            {sortedOpeningHours && sortedOpeningHours.length > 0 && (
              <CustomDrawer
                placement="bottom"
                title="Horário de Funcionamento"
                trigger={
                  <Button
                    rounded={'lg'}
                    size="xs"
                    variant="outline"
                  >
                    <LuClock /> Horário
                  </Button>
                }
              >
                {sortedOpeningHours.map((item) => (
                  <Box
                    borderWidth={1}
                    key={item.id}
                    p={4}
                  >
                    <Text>
                      {item.dayOfWeek.charAt(0).toUpperCase() +
                        item.dayOfWeek.slice(1)}{' '}
                      {item.isOpen
                        ? `: ${item.openTime} - ${item.closeTime}`
                        : ': Fechado'}
                    </Text>
                  </Box>
                ))}
              </CustomDrawer>
            )}
            <Button
              onClick={() => {
                window.open(mapURL, '_blank')
              }}
              rounded={'lg'}
              size="xs"
              variant="outline"
            >
              <LuMapPinned /> Localização
            </Button>
          </Group>
        </Card.Header>
        <Card.Body gap={4}>
          <Text>{companyData.biography || ''}</Text>
          {companyData.links &&
            companyData.links.length > 0 &&
            companyData.links.map((item, index) => (
              <Button
                asChild
                key={index}
                size="2xl"
                variant="outline"
              >
                <Link
                  display={'flex'}
                  href={item.url}
                  justifyContent={'space-between'}
                  target="_blank"
                  unstyled
                >
                  {item.icon ? (
                    <Image
                      as="img"
                      boxSize={12}
                      objectFit="contain"
                      src={item.icon}
                    />
                  ) : (
                    <Box
                      alignItems="center"
                      boxSize={12}
                      display="flex"
                      justifyContent="center"
                    >
                      <FiLink />
                    </Box>
                  )}

                  <Text
                    flex={1}
                    lineClamp={2}
                    textAlign="center"
                  >
                    {item.label}
                  </Text>
                </Link>
              </Button>
            ))}
        </Card.Body>
        <Card.Footer>
          {companyData.digitalMenuIntegration && (
            <>
              {companyData.digitalMenuIntegration.length === 1 ? (
                <Button
                  asChild
                  flex={1}
                  size="lg"
                >
                  <Link
                    display={'flex'}
                    href={companyData.digitalMenuIntegration[0].digitalMenuUrl}
                    justifyContent={'space-between'}
                    target="_blank"
                    unstyled
                  >
                    <Text
                      flex={1}
                      textAlign="center"
                    >
                      Faça o seu Pedido!
                    </Text>
                  </Link>
                </Button>
              ) : (
                <>
                  <CustomDrawer
                    placement="bottom"
                    title="Faça o seu pedido"
                    trigger={
                      <Button
                        flex={1}
                        size="lg"
                      >
                        Faça o seu Pedido!
                      </Button>
                    }
                  >
                    <Text mb={4}>
                      Selecione um dos nossos serviços para realizar o seu
                      pedido.
                    </Text>
                    <Box
                      display="flex"
                      flexDirection="column"
                      gap={3}
                    >
                      {companyData.digitalMenuIntegration.map((item, idx) => (
                        <Button
                          asChild
                          key={idx}
                          size="2xl"
                          variant="outline"
                          w="full"
                        >
                          <Link
                            display={'flex'}
                            href={item.digitalMenuUrl}
                            justifyContent={'space-between'}
                            target="_blank"
                            unstyled
                          >
                            <Avatar.Root size="lg">
                              <Avatar.Fallback name={item.partner.name} />
                              <Avatar.Image src={item.partner.logoUrl} />
                            </Avatar.Root>
                            <Text
                              flex={1}
                              textAlign="center"
                            >
                              {item.partner.name}
                            </Text>
                          </Link>
                        </Button>
                      ))}
                    </Box>
                  </CustomDrawer>
                </>
              )}
            </>
          )}
          {companyData.phone && (
            <Link
              href={`https://wa.me/${clearPhone(
                companyData.phone
              )}?text=${encodeURIComponent(companyData.whatsappMessage || '')}`}
              target="_blank"
            >
              <IconButton
                colorPalette="green"
                size="lg"
              >
                <BsWhatsapp />
              </IconButton>
            </Link>
          )}
        </Card.Footer>
        <Card.Footer
          as={Center}
          fontSize="xs"
        >
          <Text>Desenvolvido por</Text>
          <Link
            href={texts.link}
            target="_blank"
          >
            <Image
              alt={texts.appName}
              boxSize={5}
              src={images.logoIcon}
            />
            <Text fontWeight="bold">{texts.appShortName}</Text>
          </Link>
        </Card.Footer>
      </Card.Root>
    </Box>
  )
}

export { ClientPage }
