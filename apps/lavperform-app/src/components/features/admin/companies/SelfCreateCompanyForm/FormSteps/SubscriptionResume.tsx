import {
  Badge,
  Box,
  Card,
  Fieldset,
  Grid,
  Heading,
  HStack,
  Icon,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { PiBuildings, PiCreditCard, PiIdentificationCard } from 'react-icons/pi'

import { useWhiteLabel } from '@/config'
import { useSubscriptionPlan } from '@/hooks/queries/useCompany'
import { cycleDescriptions, cycleLabels } from '@/utils/constants/planCycle'
import { formatCurrency } from '@/utils/money'

import { FormStepsProps } from './FormSteps.types'

function SubscriptionResumeComponent(props: FormStepsProps) {
  const { colors } = useWhiteLabel()

  const { formData } = props
  const { data: plan, isLoading, isError } = useSubscriptionPlan()

  const selectedPlan = useMemo(() => {
    if (!plan) return null

    return {
      title: plan.name || cycleLabels[plan.cycle],
      description: plan.description || cycleDescriptions[plan.cycle],
      price: parseFloat(plan.price),
      maxPayments: plan.maxPayments,
      icon: (
        <Badge
          fontSize="xs"
          rounded="full"
          size="sm"
          variant="solid"
        >
          {plan.maxPayments}
        </Badge>
      ),
    }
  }, [plan])

  return (
    <Stack gap={6}>
      <Text
        color="fg.muted"
        fontSize="sm"
      >
        Revise as informações antes de finalizar o cadastro
      </Text>
      {(isLoading || isError) && (
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          {isLoading
            ? 'Carregando plano de assinatura...'
            : 'Não foi possível carregar o plano de assinatura.'}
        </Text>
      )}
      <Card.Root size="sm">
        <Card.Header>
          <HStack gap={2}>
            <Icon
              color="blue.500"
              fontSize="xl"
            >
              <PiIdentificationCard />
            </Icon>
            <Heading
              as="h4"
              fontSize="lg"
            >
              Dados do Responsável
            </Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Fieldset.Root>
            <Fieldset.Content>
              <Grid
                gap={4}
                gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
              >
                <Box>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    Nome completo
                  </Text>
                  <Text fontWeight="medium">{formData?.name || '-'}</Text>
                </Box>
                <Box>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    E-mail
                  </Text>
                  <Text fontWeight="medium">{formData?.email || '-'}</Text>
                </Box>
                <Box>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    Telefone
                  </Text>
                  <Text fontWeight="medium">{formData?.phone || '-'}</Text>
                </Box>
              </Grid>
            </Fieldset.Content>
          </Fieldset.Root>
        </Card.Body>
      </Card.Root>
      <Card.Root size="sm">
        <Card.Header>
          <HStack gap={2}>
            <Icon
              color="green.500"
              fontSize="xl"
            >
              <PiBuildings />
            </Icon>
            <Heading
              as="h4"
              fontSize="lg"
            >
              Dados da Empresa
            </Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Fieldset.Root>
            <Fieldset.Content>
              <Grid
                gap={4}
                gridTemplateColumns="1fr"
              >
                <Box>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    Nome da empresa
                  </Text>
                  <Text fontWeight="medium">
                    {formData?.company?.name || '-'}
                  </Text>
                </Box>
                <Box>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    CNPJ
                  </Text>
                  <Text fontWeight="medium">
                    {formData?.company?.cnpj || '-'}
                  </Text>
                </Box>
                <Box>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    E-mail da empresa
                  </Text>
                  <Text
                    fontWeight="medium"
                    lineBreak="anywhere"
                  >
                    {formData?.company?.email || '-'}
                  </Text>
                </Box>
                <Box>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    Telefone da empresa
                  </Text>
                  <Text fontWeight="medium">
                    {formData?.company?.phone || '-'}
                  </Text>
                </Box>
                <Box gridColumn={{ base: '1', md: '1 / -1' }}>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                    fontWeight="medium"
                    mb={2}
                  >
                    Endereço
                  </Text>
                  <Text fontWeight="medium">
                    {formData?.company?.street
                      ? `${formData.company.street}, ${
                          formData.company.number || 'S/N'
                        } ${
                          formData.company.complement
                            ? ', Complemento: ' + formData.company.complement
                            : ''
                        } - ${formData.company.neighborhood}`
                      : '-'}
                  </Text>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                  >
                    {formData?.company?.city && formData?.company?.state
                      ? `${formData.company.city} - ${
                          formData.company.state
                        } | CEP: ${formData.company.zipCode || '-'}`
                      : '-'}
                  </Text>
                </Box>
              </Grid>
            </Fieldset.Content>
          </Fieldset.Root>
        </Card.Body>
      </Card.Root>
      <Card.Root size="sm">
        <Card.Header>
          <HStack gap={2}>
            <Icon
              color={colors.primary}
              fontSize="xl"
            >
              <PiCreditCard />
            </Icon>
            <Heading
              as="h4"
              fontSize="lg"
            >
              Assinatura
            </Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Fieldset.Root>
            <Fieldset.Content>
              {selectedPlan ? (
                <HStack
                  alignItems="flex-start"
                  bg="bg.muted"
                  borderRadius="md"
                  gap={3}
                  p={4}
                >
                  {selectedPlan.icon}
                  <Box>
                    <Text
                      fontSize="lg"
                      fontWeight="semibold"
                    >
                      {selectedPlan.title}
                    </Text>
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                    >
                      {selectedPlan.description}
                    </Text>
                    <Text
                      fontWeight="medium"
                      mt={1}
                    >
                      {formatCurrency(selectedPlan.price)} ao mês
                    </Text>
                  </Box>
                </HStack>
              ) : (
                <Text color="fg.muted">Plano de assinatura indisponível</Text>
              )}
            </Fieldset.Content>
          </Fieldset.Root>
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}

const SubscriptionResume = memo(SubscriptionResumeComponent)

export { SubscriptionResume }
