import { Box, Button, Center, Input, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuCheck, LuSearch } from 'react-icons/lu'

import { useColorModeValue } from '@/components/ui/color-mode'
import { useAuth } from '@/context/AuthContext'
import type { UserCompany } from '@/types'

import { shellDark } from './shellPalette'
import { filterStoreGroups, groupStores, unitInitials } from './storeGroups'

export function StoreSwitchPage() {
  const { companies, selectedCompany, selectCompany } = useAuth()
  const [query, setQuery] = useState('')
  const card = useColorModeValue('white', shellDark.card)
  const border = useColorModeValue('#E4E4E7', shellDark.border)
  const muted = useColorModeValue('#71717A', shellDark.muted)
  const text = useColorModeValue('#18181B', 'gray.100')
  const page = useColorModeValue('#F7F7F8', shellDark.background)
  const line = useColorModeValue('#E4E4E7', shellDark.border)
  const groups = useMemo(
    () => filterStoreGroups(groupStores(companies), query),
    [companies, query]
  )

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
      {groups.map((group) => (
        <Box
          key={group.id}
          mb={4}
        >
          <Box
            alignItems="center"
            display="flex"
            justifyContent="space-between"
            mb={2}
            px={1}
          >
            <Text
              color={muted}
              fontSize="12px"
              fontWeight="semibold"
              letterSpacing="0.04em"
              textTransform="uppercase"
            >
              {group.label}
            </Text>
            <Text
              color={muted}
              fontSize="12px"
              fontWeight="semibold"
            >
              {group.stores.length} {group.stores.length === 1 ? 'loja' : 'lojas'}
            </Text>
          </Box>
          <Box
            bg={card}
            borderColor={border}
            borderRadius="12px"
            borderWidth="1px"
            overflow="hidden"
          >
            {group.stores.map((store, index) => {
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
                      left="54px"
                      position="absolute"
                      right={0}
                      top={0}
                    />
                  ) : null}
                  <Center
                    bg={selected ? '#093A58' : '#64748B'}
                    borderRadius="8px"
                    boxSize="28px"
                    color="white"
                    fontSize="11px"
                    fontWeight="bold"
                  >
                    {unitInitials(store.name)}
                  </Center>
                  <Box
                    flex="1"
                    minW={0}
                  >
                    <Text
                      color={text}
                      fontSize="12px"
                      fontWeight="semibold"
                      truncate
                    >
                      {store.name}
                    </Text>
                    <Text
                      color={muted}
                      fontSize="11px"
                      truncate
                    >
                      {store.slug}
                    </Text>
                  </Box>
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
        </Box>
      ))}
      <Text
        color={muted}
        fontSize="11px"
        px={1}
      >
        A troca vale para todo o app: dashboard, clientes, posts e campanhas
        passam a mostrar a loja escolhida.
      </Text>
    </Box>
  )
}
