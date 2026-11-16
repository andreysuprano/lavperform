import { Avatar, Box, Button, Input, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuCheck, LuSearch } from 'react-icons/lu'

import { useColorModeValue } from '@/components/ui/color-mode'
import { useAuth } from '@/context/AuthContext'
import { convertLinkToResizedImage } from '@/firebase/storage'
import type { UserCompany } from '@/types'

import { shellDark } from './shellPalette'

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function StoreSwitchPage() {
  const { companies, selectedCompany, selectCompany } = useAuth()
  const [query, setQuery] = useState('')
  const card = useColorModeValue('white', shellDark.card)
  const border = useColorModeValue('#E4E4E7', shellDark.border)
  const muted = useColorModeValue('#71717A', shellDark.muted)
  const text = useColorModeValue('#18181B', 'gray.100')
  const page = useColorModeValue('#F7F7F8', shellDark.background)
  const line = useColorModeValue('#E4E4E7', shellDark.border)
  const stores = useMemo(() => {
    const normalized = normalize(query)
    if (!normalized) return companies
    return companies.filter((store) =>
      normalize(`${store.name} ${store.slug}`).includes(normalized)
    )
  }, [companies, query])

  const choose = (company: UserCompany) => {
    selectCompany(company.id)
  }

  return (
    <Box
      bg={page}
      data-testid="store-switch-page"
      mx={-4}
      my={-4}
      p={4}
    >
      <Box
        alignItems="center"
        bg={card}
        borderColor={border}
        borderRadius="10px"
        borderWidth="1px"
        display="flex"
        gap={2}
        h="44px"
        mb={4}
        px={3}
      >
        <LuSearch
          color={muted}
          size={18}
        />
        <Input
          aria-label="Buscar loja ou cidade"
          border="none"
          h="40px"
          onChange={(event) => setQuery(event.target.value)}
          outline="none"
          placeholder="Buscar loja ou cidade"
          px={0}
          value={query}
        />
      </Box>
      <Box
        bg={card}
        borderColor={border}
        borderRadius="12px"
        borderWidth="1px"
        overflow="hidden"
      >
        {stores.map((store, index) => {
          const selected = store.id === selectedCompany?.id
          return (
            <Button
              alignItems="center"
              display="flex"
              gap={3}
              h="52px"
              justifyContent="flex-start"
              key={store.id}
              minH="44px"
              onClick={() => choose(store)}
              position="relative"
              px="14px"
              textAlign="left"
              type="button"
              variant="ghost"
              w="full"
            >
              {index > 0 ? (
                <Box
                  bg={line}
                  h="1px"
                  left="58px"
                  position="absolute"
                  right={0}
                  top={0}
                />
              ) : null}
              <Avatar.Root
                borderRadius="8px"
                boxSize="32px"
                shape="rounded"
              >
                <Avatar.Fallback name={store.name} />
                <Avatar.Image
                  alt={store.name}
                  src={
                    store.avatarUrl
                      ? convertLinkToResizedImage(store.avatarUrl)
                      : undefined
                  }
                />
              </Avatar.Root>
              <Text
                color={text}
                flex="1"
                fontSize="14px"
                fontWeight="semibold"
                minW={0}
                truncate
              >
                {store.name}
              </Text>
              {selected ? (
                <LuCheck
                  color="#093A58"
                  size={20}
                />
              ) : null}
            </Button>
          )
        })}
      </Box>
      {stores.length === 0 ? (
        <Text
          color={muted}
          fontSize="13px"
          mb={4}
          px={1}
        >
          Nenhuma loja encontrada
        </Text>
      ) : null}
      <Text
        color={muted}
        fontSize="11px"
        mt={4}
        px={1}
      >
        A troca vale para todo o app: dashboard, clientes, posts e campanhas
        passam a mostrar a loja escolhida.
      </Text>
    </Box>
  )
}
