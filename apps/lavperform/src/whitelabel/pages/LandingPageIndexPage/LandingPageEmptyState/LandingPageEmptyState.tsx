import { Box, Button, Flex, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { memo, useState } from 'react'
import { RiArrowRightLine, RiPagesLine } from 'react-icons/ri'

import { CreateLandingPageModal } from '../CreateLandingPageModal'

function LandingPageEmptyStateBase() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <Flex gap={8} alignItems="center" direction={{ base: 'column', md: 'row' }}>
      <Box flex={1} w="full">
        <Box
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="xl"
          overflow="hidden"
          shadow="md"
        >
          <Box
            bg="gray.100"
            _dark={{ bg: 'gray.700' }}
            px={4}
            py={2}
            borderBottomWidth="1px"
            borderColor="gray.200"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Box w={2.5} h={2.5} borderRadius="full" bg="red.300" />
            <Box w={2.5} h={2.5} borderRadius="full" bg="yellow.300" />
            <Box w={2.5} h={2.5} borderRadius="full" bg="green.300" />
            <Box flex={1} h={4} borderRadius="full" bg="gray.200" _dark={{ bg: 'gray.600' }} mx={2} />
          </Box>

          <Box bg="white" p={3}>
            <Box
              bg="gray.50"
              borderRadius="md"
              px={4}
              py={2.5}
              mb={2}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box w="18%" h={2.5} borderRadius="full" bg="gray.300" />
              <Box display="flex" gap={2}>
                <Box w={10} h={2} borderRadius="full" bg="gray.200" />
                <Box w={10} h={2} borderRadius="full" bg="gray.200" />
                <Box w={10} h={2} borderRadius="full" bg="gray.200" />
                <Box w={12} h={5} borderRadius="md" bg="gray.800" />
              </Box>
            </Box>

            <Box
              bg="gray.900"
              borderRadius="md"
              px={4}
              py={8}
              mb={2}
              textAlign="center"
            >
              <Box w="45%" h={3} borderRadius="full" bg="white" opacity={0.9} mx="auto" mb={2} />
              <Box w="65%" h={2} borderRadius="full" bg="white" opacity={0.4} mx="auto" mb={4} />
              <Box display="inline-block" w="22%" h={6} borderRadius="md" bg="white" opacity={0.9} />
            </Box>

            <SimpleGrid columns={3} gap={2} mb={2}>
              {[0, 1, 2].map((i) => (
                <Box key={i} bg="gray.50" borderRadius="md" p={3} borderWidth="1px" borderColor="gray.100">
                  <Box w={6} h={6} borderRadius="md" bg="gray.200" mb={2} />
                  <Box w="60%" h={2} borderRadius="full" bg="gray.300" mb={1.5} />
                  <Box w="80%" h={1.5} borderRadius="full" bg="gray.200" mb={1} />
                  <Box w="50%" h={1.5} borderRadius="full" bg="gray.200" />
                </Box>
              ))}
            </SimpleGrid>

            <Box
              bg="gray.900"
              borderRadius="md"
              px={4}
              py={3}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box w="16%" h={2} borderRadius="full" bg="white" opacity={0.5} />
              <Box w="28%" h={1.5} borderRadius="full" bg="white" opacity={0.3} />
            </Box>
          </Box>
        </Box>
      </Box>

      <VStack flex={1} w="full" gap={4} alignItems="flex-start">
        <Text fontSize="xl" fontWeight="bold" lineHeight="short">
          Crie uma página para{' '}
          <Text
            as="span"
            bg="fg.default"
            color="bg.default"
            px="1.5"
            py="0.5"
            borderRadius="sm"
          >
            sua marca
          </Text>{' '}
          agora
        </Text>

        <Text color="fg.muted" fontSize="sm">
          Personalize sua landing page com logo, cores, serviços e muito mais. Publique e compartilhe com seus clientes em minutos.
        </Text>

        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
        >
          <RiPagesLine />
          Começar agora
          <RiArrowRightLine />
        </Button>
      </VStack>

      <CreateLandingPageModal
        isOpen={isModalOpen}
        onOpenChange={(e) => setIsModalOpen(e.open)}
      />
    </Flex>
  )
}

const LandingPageEmptyState = memo(LandingPageEmptyStateBase)

export { LandingPageEmptyState }
