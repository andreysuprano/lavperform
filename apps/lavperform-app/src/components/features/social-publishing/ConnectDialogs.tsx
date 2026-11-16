import {
  Box,
  Button,
  Dialog,
  Flex,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useState } from 'react'
import { LuCheck, LuShield } from 'react-icons/lu'

import type { GoogleAssets, MetaAssets } from '@/types'

export function MetaPermissionsDialog({
  open,
  busy,
  message,
  onClose,
  onContinue,
}: {
  open: boolean
  busy?: boolean
  message?: string | null
  onClose: () => void
  onContinue: () => void
}) {
  return (
    <Dialog.Root
      onOpenChange={(details) => {
        if (!details.open) onClose()
      }}
      open={open}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="480px">
            <Dialog.Body py={6}>
              <Flex
                align="center"
                gap={3}
                justify="center"
              >
                <Flex
                  align="center"
                  bg="#E6F5FD"
                  borderRadius="lg"
                  boxSize="52px"
                  color="#093A58"
                  justify="center"
                >
                  <LuShield />
                </Flex>
                <Text fontSize="xl">→</Text>
                <Flex
                  align="center"
                  bg="#093A58"
                  borderRadius="lg"
                  boxSize="52px"
                  color="white"
                  fontSize="2xl"
                  fontWeight="bold"
                  justify="center"
                >
                  f
                </Flex>
              </Flex>
              <Text
                fontSize="xl"
                fontWeight="bold"
                mt={4}
                textAlign="center"
              >
                Conectar Meta
              </Text>
              <Text
                color="fg.muted"
                mt={1}
                textAlign="center"
              >
                O que vamos fazer com a sua conta:
              </Text>
              <Stack
                gap={3}
                mt={4}
              >
                {[
                  'Publicar os posts que você aprovar na Página e no Instagram.',
                  'Ler curtidas e comentários para mostrar o que deu certo.',
                  'Nunca postamos nada sem você mandar. Você pode desconectar quando quiser.',
                ].map((item) => (
                  <Flex
                    gap={3}
                    key={item}
                  >
                    <Flex
                      align="center"
                      bg="#E6F5FD"
                      borderRadius="full"
                      boxSize="28px"
                      color="#093A58"
                      flexShrink={0}
                      justify="center"
                    >
                      <LuCheck size={14} />
                    </Flex>
                    <Text fontSize="sm">{item}</Text>
                  </Flex>
                ))}
              </Stack>
              <Text
                color="fg.muted"
                fontSize="xs"
                mt={4}
                textAlign="center"
              >
                Na próxima tela, o Facebook vai pedir para você entrar e escolher a Página.
              </Text>
              {message ? (
                <Text
                  color="orange.600"
                  fontSize="sm"
                  mt={3}
                >
                  {message}
                </Text>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button
                onClick={onClose}
                variant="ghost"
              >
                Agora não
              </Button>
              <Button
                bg="#093A58"
                color="white"
                loading={busy}
                onClick={onContinue}
              >
                Continuar no Facebook
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function Choice({
  selected,
  title,
  detail,
  onClick,
}: {
  selected: boolean
  title: string
  detail?: string | null
  onClick: () => void
}) {
  return (
    <Button
      alignItems="center"
      borderColor={selected ? '#093A58' : 'border'}
      borderRadius="lg"
      borderWidth="1px"
      display="flex"
      gap={3}
      h="auto"
      justifyContent="flex-start"
      onClick={onClick}
      px={3}
      py={2}
      textAlign="left"
      variant="outline"
      w="full"
    >
      <Box
        borderColor={selected ? '#093A58' : 'border'}
        borderRadius="full"
        borderWidth="2px"
        boxSize="18px"
        position="relative"
      >
        {selected ? (
          <Box
            bg="#093A58"
            borderRadius="full"
            boxSize="8px"
            left="3px"
            position="absolute"
            top="3px"
          />
        ) : null}
      </Box>
      <Box>
        <Text
          fontSize="sm"
          fontWeight="medium"
        >
          {title}
        </Text>
        {detail ? (
          <Text
            color="fg.muted"
            fontSize="xs"
          >
            {detail}
          </Text>
        ) : null}
      </Box>
    </Button>
  )
}

export function MetaAccountDialog({
  open,
  assets,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  assets?: MetaAssets
  busy?: boolean
  onClose: () => void
  onConfirm: (value: { pageId: string; igUserId?: string; adAccountId?: string }) => void
}) {
  const [pageId, setPageId] = useState('')
  const [igUserId, setIgUserId] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const pages = assets?.pages ?? []
  const selected = pages.find((page) => page.id === (pageId || pages[0]?.id))
  const instagrams = pages.flatMap((page) =>
    page.instagram ? [{ ...page.instagram, pageId: page.id, pageName: page.name }] : []
  )

  return (
    <Dialog.Root
      onOpenChange={(details) => {
        if (!details.open) onClose()
      }}
      open={open}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="520px">
            <Dialog.Body>
              <Dialog.Title>Quase lá!</Dialog.Title>
              <Text
                color="fg.muted"
                fontSize="sm"
                mt={1}
              >
                Encontramos isto na sua conta. Escolha o que é da sua loja.
              </Text>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                mt={4}
              >
                Página do Facebook
              </Text>
              <Stack
                gap={2}
                mt={2}
              >
                {pages.map((page) => (
                  <Choice
                    detail={`Página · ${page.followers.toLocaleString('pt-BR')} seguidores`}
                    key={page.id}
                    onClick={() => setPageId(page.id)}
                    selected={(pageId || pages[0]?.id) === page.id}
                    title={page.name}
                  />
                ))}
              </Stack>
              {instagrams.length ? (
                <>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    mt={4}
                  >
                    Instagram
                  </Text>
                  <Stack
                    gap={2}
                    mt={2}
                  >
                    {instagrams.map((account) => (
                      <Choice
                        detail={account.pageName}
                        key={account.id}
                        onClick={() => setIgUserId(account.id)}
                        selected={(igUserId || instagrams[0]?.id) === account.id}
                        title={`@${account.username}`}
                      />
                    ))}
                  </Stack>
                </>
              ) : null}
              {assets?.adAccounts.length ? (
                <>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    mt={4}
                  >
                    Conta de anúncios
                  </Text>
                  <Stack
                    gap={2}
                    mt={2}
                  >
                    <Choice
                      onClick={() => setAdAccountId('')}
                      selected={adAccountId === ''}
                      title="Não escolher agora"
                    />
                    {assets.adAccounts.map((account) => (
                      <Choice
                        detail={account.accountId}
                        key={account.id}
                        onClick={() => setAdAccountId(account.id)}
                        selected={adAccountId === account.id}
                        title={account.name}
                      />
                    ))}
                  </Stack>
                </>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button
                onClick={onClose}
                variant="ghost"
              >
                Cancelar
              </Button>
              <Button
                bg="#093A58"
                color="white"
                disabled={!selected}
                loading={busy}
                onClick={() => {
                  if (!selected) return
                  onConfirm({
                    pageId: selected.id,
                    igUserId: igUserId || instagrams[0]?.id,
                    adAccountId: adAccountId || undefined,
                  })
                }}
              >
                Usar esta conta
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export function GoogleAccountDialog({
  open,
  assets,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  assets?: GoogleAssets
  busy?: boolean
  onClose: () => void
  onConfirm: (value: { locationId: string; adCustomerId?: string }) => void
}) {
  const locations = assets?.locations ?? []
  const ads = assets?.adAccounts ?? []
  const [locationId, setLocationId] = useState('')
  const [adCustomerId, setAdCustomerId] = useState('none')
  const location = locationId || locations[0]?.id

  return (
    <Dialog.Root
      onOpenChange={(details) => {
        if (!details.open) onClose()
      }}
      open={open}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="520px">
            <Dialog.Body>
              <Dialog.Title>Escolha sua loja no Google</Dialog.Title>
              <Text
                color="fg.muted"
                fontSize="sm"
                mt={1}
              >
                Escolha o perfil do Google desta loja e, se usar anúncios, a conta do Google Ads.
              </Text>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                mt={4}
              >
                Perfil no Google Meu Negócio
              </Text>
              <Stack
                gap={2}
                mt={2}
              >
                {locations.map((item) => (
                  <Choice
                    detail={item.address}
                    key={item.id}
                    onClick={() => setLocationId(item.id)}
                    selected={location === item.id}
                    title={item.name}
                  />
                ))}
              </Stack>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                mt={4}
              >
                Conta do Google Ads
              </Text>
              <Stack
                gap={2}
                mt={2}
              >
                {ads.map((item) => (
                  <Choice
                    detail={item.customerId}
                    key={item.id}
                    onClick={() => setAdCustomerId(item.id)}
                    selected={adCustomerId === item.id}
                    title={item.name}
                  />
                ))}
                <Choice
                  onClick={() => setAdCustomerId('none')}
                  selected={adCustomerId === 'none'}
                  title="Não uso Google Ads"
                />
              </Stack>
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button
                onClick={onClose}
                variant="ghost"
              >
                Cancelar
              </Button>
              <Button
                bg="#093A58"
                color="white"
                disabled={!location}
                loading={busy}
                onClick={() => {
                  if (!location) return
                  onConfirm({
                    locationId: location,
                    adCustomerId: adCustomerId === 'none' ? undefined : adCustomerId,
                  })
                }}
              >
                Usar este perfil
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
