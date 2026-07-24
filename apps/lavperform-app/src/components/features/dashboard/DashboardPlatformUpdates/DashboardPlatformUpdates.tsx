import {
  Box,
  Grid,
  Heading,
  HStack,
  Icon,
  Link as ChakraLink,
  Separator,
  Stack,
  Text,
} from '@chakra-ui/react'
import { Fragment, memo } from 'react'
import { LuArrowRight } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'

import { AcademyWeekEvents } from '@/components/features'
import { PLATFORM_UPDATES } from '@/utils/constants/platformUpdates'

function formatUpdateDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`))
}

function DashboardPlatformUpdatesBase() {
  return (
    <Box w="full">
      <Heading
        fontWeight="semibold"
        mb={3}
        size="md"
      >
        Novidades
      </Heading>

      <Grid
        alignItems="start"
        gap={6}
        templateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }}
      >
        <Box
          bg="bg.panel"
          borderColor="border"
          borderRadius="lg"
          borderWidth="1px"
          p={{ base: 4, md: 5 }}
        >
          <Stack gap={0}>
            {PLATFORM_UPDATES.map((update, index) => {
              const UpdateIcon = update.icon
              return (
                <Fragment key={update.id}>
                  {index > 0 ? <Separator my={3} /> : null}
                  <HStack
                    align="flex-start"
                    colorPalette={update.colorPalette}
                    gap={3}
                  >
                    <Box
                      bg="colorPalette.subtle"
                      borderRadius="md"
                      color="colorPalette.fg"
                      flexShrink={0}
                      lineHeight={0}
                      p={2.5}
                    >
                      <Icon boxSize={5}>
                        <UpdateIcon />
                      </Icon>
                    </Box>
                    <Stack
                      flex={1}
                      gap={1.5}
                      minW={0}
                    >
                      <HStack
                        align="baseline"
                        justify="space-between"
                        w="full"
                      >
                        <Text
                          color="fg"
                          fontSize="sm"
                          fontWeight="semibold"
                        >
                          {update.title}
                        </Text>
                        <Text
                          color="fg.muted"
                          fontSize="xs"
                          whiteSpace="nowrap"
                        >
                          {formatUpdateDate(update.date)}
                        </Text>
                      </HStack>
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                        lineHeight="1.45"
                      >
                        {update.summary}
                      </Text>
                      {update.href ? (
                        <ChakraLink
                          asChild
                          color="colorPalette.fg"
                          fontSize="sm"
                          fontWeight="medium"
                          mt={0.5}
                        >
                          <RouterLink to={update.href}>
                            <HStack gap={1}>
                              <Text as="span">Abrir</Text>
                              <LuArrowRight size={14} />
                            </HStack>
                          </RouterLink>
                        </ChakraLink>
                      ) : null}
                    </Stack>
                  </HStack>
                </Fragment>
              )
            })}
          </Stack>
        </Box>

        <AcademyWeekEvents />
      </Grid>
    </Box>
  )
}

const DashboardPlatformUpdates = memo(
  DashboardPlatformUpdatesBase
) as typeof DashboardPlatformUpdatesBase

export { DashboardPlatformUpdates }
