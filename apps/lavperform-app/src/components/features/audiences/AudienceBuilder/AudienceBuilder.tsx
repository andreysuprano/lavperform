import { Box, Stack, Steps, Text } from '@chakra-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  useAudiencePreview,
  useCreateAudience,
  useUpdateAudience,
} from '@/hooks/queries/useAudiences'
import { audienceService } from '@/services/audience.service'
import type { Audience, AudienceDefinition } from '@/types'
import { createEmptyDefinition } from '@/types'

import { WizardNav } from './CriterionEditor'
import { hasIncludeRules, WIZARD_STEPS } from './audienceCopy'
import { DetailsStep } from './steps/DetailsStep'
import { ExcludeStep } from './steps/ExcludeStep'
import { IncludeStep } from './steps/IncludeStep'
import { ReviewStep } from './steps/ReviewStep'

type Props = {
  audience?: Audience
  onSaved?: () => void
  onCancel?: () => void
}

export function AudienceBuilder({ audience, onSaved, onCancel }: Props) {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  const [step, setStep] = useState(0)
  const [name, setName] = useState(audience?.name ?? '')
  const [description, setDescription] = useState(audience?.description ?? '')
  const [definition, setDefinition] = useState<AudienceDefinition>(
    audience?.definition ?? createEmptyDefinition(),
  )
  const [productOptions, setProductOptions] = useState<string[]>([])
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [dddOptions, setDddOptions] = useState<string[]>([])
  const [previewPage, setPreviewPage] = useState(1)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const previewPageLimit = 50

  const createAudience = useCreateAudience()
  const updateAudience = useUpdateAudience()
  const previewQuery = useAudiencePreview(companyId, definition, true, {
    page: previewPage,
    limit: previewPageLimit,
  })

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 })
  }, [step])

  useEffect(() => {
    setPreviewPage(1)
  }, [definition])

  useEffect(() => {
    if (!companyId) return

    Promise.all([
      audienceService.getProducts(companyId),
      audienceService.getNeighborhoods(companyId),
      audienceService.getCities(companyId),
      audienceService.getDdds(companyId),
    ]).then(([products, neighborhoods, cities, ddds]) => {
      setProductOptions(products.data.data)
      setNeighborhoodOptions(neighborhoods.data.data)
      setCityOptions(cities.data.data)
      setDddOptions(ddds.data.data)
    })
  }, [companyId])

  const isSaving = createAudience.isPending || updateAudience.isPending
  const canContinueInclude = useMemo(
    () => hasIncludeRules(definition.include),
    [definition.include],
  )
  const canContinueDetails = useMemo(() => name.trim().length > 0, [name])

  const goToPrevStep = () => setStep((current) => Math.max(0, current - 1))
  const goToNextStep = () =>
    setStep((current) => Math.min(WIZARD_STEPS.length - 1, current + 1))

  const handleSave = async () => {
    if (!companyId || !canContinueDetails || !canContinueInclude) return

    try {
      if (audience?.id) {
        await updateAudience.mutateAsync({
          companyId,
          audienceId: audience.id,
          data: { name, description, definition },
        })
      } else {
        await createAudience.mutateAsync({
          companyId,
          data: { name, description, definition },
        })
      }

      toaster.create({
        title: 'Sucesso',
        description: audience
          ? 'Audiência atualizada com sucesso.'
          : 'Audiência criada com sucesso.',
        type: 'success',
        closable: true,
        duration: 2000,
      })

      onSaved?.()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } }
        message?: string
      }
      const apiMessage = err.response?.data?.message
      const errorMessage = Array.isArray(apiMessage)
        ? apiMessage.join(', ')
        : apiMessage || err.message || 'Não foi possível salvar a audiência.'

      toaster.create({
        title: 'Erro ao salvar',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    }
  }

  const navProps = (() => {
    switch (step) {
      case 0:
        return {
          backLabel: 'Cancelar',
          nextDisabled: !canContinueInclude,
          onBack: onCancel,
          onNext: goToNextStep,
          showBack: Boolean(onCancel),
        }
      case 1:
        return {
          nextLabel: definition.exclude ? 'Continuar' : 'Pular esta etapa',
          onBack: goToPrevStep,
          onNext: goToNextStep,
        }
      case 2:
        return {
          nextDisabled: !canContinueDetails,
          onBack: goToPrevStep,
          onNext: goToNextStep,
        }
      case 3:
        return {
          nextLabel: audience ? 'Salvar alterações' : 'Criar audiência',
          nextLoading: isSaving,
          onBack: goToPrevStep,
          onNext: handleSave,
        }
      default:
        return {}
    }
  })()

  return (
    <Steps.Root
      count={WIZARD_STEPS.length}
      display="flex"
      flex={1}
      flexDirection="column"
      minH={0}
      onStepChange={(details) => {
        const nextStep = details.step
        if (nextStep > 0 && !canContinueInclude) return
        if (nextStep > 2 && !canContinueDetails) return
        setStep(nextStep)
      }}
      size="sm"
      step={step}
      w="full"
    >
      <Stack
        flexShrink={0}
        gap={3}
        pb={3}
      >
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          Monte sua lista de clientes em poucos passos. Use filtros simples para
          escolher quem entra e quem fica de fora.
        </Text>

        <Steps.List>
          {WIZARD_STEPS.map((wizardStep, index) => (
            <Steps.Item
              index={index}
              key={wizardStep.id}
              title={wizardStep.title}
            >
              <Steps.Indicator />
              <Steps.Title display={{ base: 'none', md: 'block' }}>
                {wizardStep.title}
              </Steps.Title>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>
      </Stack>

      <Box
        flex={1}
        minH={0}
        overflowY="auto"
        pb={2}
        ref={scrollAreaRef}
      >
        <Steps.Content index={0}>
          <IncludeStep
            cityOptions={cityOptions}
            dddOptions={dddOptions}
            group={definition.include}
            neighborhoodOptions={neighborhoodOptions}
            onChange={(include) => setDefinition({ ...definition, include })}
            previewCount={previewQuery.data?.count}
            previewLoading={previewQuery.isFetching}
            productOptions={productOptions}
          />
        </Steps.Content>

        <Steps.Content index={1}>
          <ExcludeStep
            cityOptions={cityOptions}
            dddOptions={dddOptions}
            group={definition.exclude}
            neighborhoodOptions={neighborhoodOptions}
            onChange={(exclude) => setDefinition({ ...definition, exclude })}
            previewCount={previewQuery.data?.count}
            previewLoading={previewQuery.isFetching}
            productOptions={productOptions}
          />
        </Steps.Content>

        <Steps.Content index={2}>
          <DetailsStep
            description={description}
            name={name}
            onDescriptionChange={setDescription}
            onNameChange={setName}
          />
        </Steps.Content>

        <Steps.Content index={3}>
          <ReviewStep
            definition={definition}
            description={description}
            name={name}
            onPreviewPageChange={setPreviewPage}
            previewCount={previewQuery.data?.count}
            previewLoading={previewQuery.isFetching}
            previewMeta={previewQuery.data?.meta}
            sample={previewQuery.data?.sample}
          />
        </Steps.Content>
      </Box>

      <Box
        borderTopWidth="1px"
        flexShrink={0}
        pt={3}
      >
        <WizardNav {...navProps} />
      </Box>
    </Steps.Root>
  )
}
