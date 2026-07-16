import { Box, Flex, Text } from '@chakra-ui/react'
import { memo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

function RfvMatrixAxesBase({ children }: Props) {
  return (
    <Flex
      alignItems="center"
      direction="row"
      gap={{ base: 1, md: 2 }}
      ml={{ base: 0, md: '0px' }}
      mr={{ base: 0, md: '0px' }}
      position="relative"
      w="full"
    >
      <Flex
        display={{ base: 'none', md: 'flex' }}
        direction="column-reverse"
        h={{ base: '250px', md: '350px', lg: '450px', xl: '500px' }}
        justifyContent="space-between"
        minW={{ base: '20px', md: '24px', lg: '50px' }}
        flexShrink={0}
      >
        <Box
          h={{ base: '50px', md: '70px', lg: '90px', xl: '5px' }}
          visibility="hidden"
          bottom={0}
        />
        {[2, 3, 4, 5].map((num) => (
          <Text
            key={num}
            color="fg.muted"
            fontSize="xs"
            fontWeight="medium"
            textAlign="center"
          >
            {num}
          </Text>
        ))}
      </Flex>

      <Flex
        direction="column"
        gap={{ base: 1, md: 2 }}
        w="full"
        minW={0}
      >
        {children}

        <Text
          display={{ base: 'none', md: 'block' }}
          color="fg.muted"
          fontSize="xs"
          fontWeight="medium"
          left="7"
          position="absolute"
          style={{
            bottom: '0px',
            transform: 'translate(-100%, 0)',
          }}
          textAlign="center"
          zIndex={10}
        >
          1
        </Text>

        <Flex
          display={{ base: 'none', md: 'flex' }}
          direction="row"
          justifyContent="space-between"
          w="full"
          bottom={0}
        >
          {[2, 3, 4, 5].map((num) => (
            <Text
              key={num}
              color="fg.muted"
              fontSize="xs"
              fontWeight="medium"
              textAlign="center"
              flex={1}
            >
              {num}
            </Text>
          ))}
        </Flex>
      </Flex>
    </Flex>
  )
}

const RfvMatrixAxes = memo(RfvMatrixAxesBase) as typeof RfvMatrixAxesBase

export { RfvMatrixAxes }
