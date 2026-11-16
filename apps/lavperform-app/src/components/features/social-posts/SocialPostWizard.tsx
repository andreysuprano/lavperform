import { Box, Dialog, Flex, Portal, Text, Textarea } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuInfo, LuSparkles, LuX } from 'react-icons/lu'

import { useShellMode } from '@/components/layout/AppLayout/useShellMode'

import {
  CAROUSEL_BLOCK_MESSAGE,
  carouselBlocked,
  destinationsTitle,
  formatTitle,
  legacyPlacement,
  objectiveTitle,
  WIZARD_DESTINATIONS,
  WIZARD_FLOW,
  WIZARD_FORMATS,
  WIZARD_OBJECTIVES,
  WIZARD_TONES,
  wizardStepOf,
  type WizardStep,
} from './postLibrary'
import { useSocialMediaTokens } from './socialMediaTokens'
import {
  SocialPostPhotosStep,
  type PostPhoto,
} from './SocialPostPhotosStep'

export interface WizardSnapshot {
  id?: string
  objective: string
  theme: string
  placement: string
  destinations: string[]
  format: string
  slideCount: number
  tone: string
  creativeFreedom: boolean
  wizardStep: WizardStep
  mediaIds: string[]
  media?: PostPhoto[]
}

interface Props {
  open: boolean
  companyId: string
  initial?: Partial<WizardSnapshot>
  step?: WizardStep
  onClose: (snapshot: WizardSnapshot | null) => void
  onGenerate: (snapshot: WizardSnapshot) => void
}

export function SocialPostWizard({
  open,
  companyId,
  initial,
  step = 1,
  onClose,
  onGenerate,
}: Props) {
  const phone = useShellMode() === 'phone'
  const tokens = useSocialMediaTokens()
  const [current, setCurrent] = useState<WizardStep>(step)
  const [objective, setObjective] = useState(initial?.objective ?? 'atrair')
  const [theme, setTheme] = useState(initial?.theme ?? '')
  const [format, setFormat] = useState(initial?.format ?? 'feed')
  const [slideCount, setSlideCount] = useState(initial?.slideCount ?? 4)
  const [destinations, setDestinations] = useState<string[]>(
    initial?.destinations?.length ? initial.destinations : ['ig_feed']
  )
  const [tone, setTone] = useState(initial?.tone ?? 'Amigável')
  const [creativeFreedom, setCreativeFreedom] = useState(
    Boolean(initial?.creativeFreedom)
  )
  const [photos, setPhotos] = useState<PostPhoto[]>(initial?.media ?? [])

  useEffect(() => {
    if (!open) return
    setCurrent(step)
    setObjective(initial?.objective ?? 'atrair')
    setTheme(initial?.theme ?? '')
    setFormat(initial?.format === 'story' ? 'video' : initial?.format ?? 'feed')
    setSlideCount(initial?.slideCount ?? 4)
    setDestinations(
      initial?.destinations?.length ? initial.destinations : ['ig_feed']
    )
    setTone(initial?.tone ?? 'Amigável')
    setCreativeFreedom(Boolean(initial?.creativeFreedom))
    setPhotos(initial?.media ?? [])
  }, [open, step, initial?.id])

  const snapshot = (wizardStep: WizardStep): WizardSnapshot => {
    return {
      id: initial?.id,
      objective,
      theme,
      placement: legacyPlacement(destinations),
      destinations,
      format: format === 'story' ? 'video' : format,
      slideCount: format === 'carousel' ? slideCount : 1,
      tone,
      creativeFreedom,
      wizardStep,
      mediaIds: photos.map((photo) => photo.id),
      media: photos,
    }
  }

  const close = () => {
    if (!theme.trim() && !initial?.id) {
      onClose(null)
      return
    }
    onClose(snapshot(current))
  }

  const canContinue = theme.trim().length >= 8
  const stepId = WIZARD_FLOW[current - 1].id
  const objectiveBlocked = stepId === 'objective' && !canContinue
  const lastStep = WIZARD_FLOW.length

  return (
    <Dialog.Root
      onOpenChange={(details) => {
        if (!details.open) close()
      }}
      open={open}
      placement={phone ? 'bottom' : 'center'}
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner
          alignItems={phone ? 'flex-end' : 'center'}
          p={phone ? 0 : 4}
        >
          <Dialog.Content
            bg={tokens.card}
            borderRadius={phone ? '16px 16px 0 0' : '16px'}
            boxShadow="0 20px 25px rgba(0,0,0,0.2)"
            css={
              phone
                ? {
                    '@keyframes socialSheetUp': {
                      from: { transform: 'translateY(100%)' },
                      to: { transform: 'translateY(0)' },
                    },
                    animation: 'socialSheetUp 280ms ease-out',
                  }
                : undefined
            }
            data-layout={phone ? 'sheet' : 'modal'}
            data-testid="social-wizard"
            display="flex"
            flexDirection="column"
            h={phone ? '100dvh' : 'auto'}
            m={0}
            maxH={phone ? '100dvh' : '92vh'}
            maxW={phone ? '100%' : '560px'}
            overflow="hidden"
            w={phone ? '100%' : '560px'}
          >
            {phone && (
              <Flex
                justify="center"
                pt={2}
              >
                <Box
                  bg={tokens.track}
                  borderRadius="full"
                  h="5px"
                  w="40px"
                />
              </Flex>
            )}
            <Flex
              align="center"
              justify="space-between"
              px={phone ? 4 : 6}
              py={phone ? 3 : 6}
            >
              <Text
                color={tokens.text}
                fontSize="22px"
                fontWeight="bold"
              >
                Novo post
              </Text>
              <Box
                aria-label="Fechar"
                as="button"
                color={tokens.text}
                data-testid="wizard-close"
                h="44px"
                onClick={close}
                type="button"
                w="44px"
              >
                <LuX size={20} />
              </Box>
            </Flex>
            <Box
              flex="1"
              overflowY="auto"
              pb={4}
              px={phone ? 4 : 6}
            >
              <Text
                color={tokens.muted}
                fontSize="11px"
                fontWeight="semibold"
                letterSpacing="0.04em"
                mb={2}
              >
                {`PASSO ${current} DE ${lastStep} · ${WIZARD_FLOW[current - 1].label.toUpperCase()}`}
              </Text>
              <Flex
                gap={2}
                mb={2}
              >
                {WIZARD_FLOW.map((item, index) => (
                  <Box
                    bg={index < current ? tokens.deep : tokens.track}
                    borderRadius="full"
                    flex="1"
                    h="6px"
                    key={item.id}
                  />
                ))}
              </Flex>
              <Flex
                aria-label="Progresso"
                aria-valuemax={lastStep}
                aria-valuemin={1}
                aria-valuenow={current}
                justify="space-between"
                mb={6}
                role="progressbar"
              >
                {WIZARD_FLOW.map((item, index) => (
                  <Text
                    color={index + 1 === current ? tokens.text : tokens.muted}
                    fontSize="11px"
                    fontWeight={index + 1 === current ? 'semibold' : 'normal'}
                    key={item.id}
                  >
                    {item.label}
                  </Text>
                ))}
              </Flex>
              {stepId === 'objective' && (
                <Flex
                  direction="column"
                  gap={6}
                >
                  <Box>
                    <Text
                      color={tokens.text}
                      fontSize="14px"
                      fontWeight="semibold"
                      mb={3}
                    >
                      O que você quer com este post?
                    </Text>
                    <Flex
                      direction="column"
                      gap={2}
                    >
                      {WIZARD_OBJECTIVES.map((item) => {
                        const active = objective === item.value
                        return (
                          <Box
                            as="button"
                            bg={active ? tokens.selectedBg : tokens.card}
                            borderColor={active ? tokens.accent : tokens.border}
                            borderRadius="12px"
                            borderWidth="1px"
                            key={item.value}
                            minH="52px"
                            onClick={() => setObjective(item.value)}
                            px={4}
                            py={3}
                            textAlign="left"
                            type="button"
                            w="full"
                          >
                            <Flex
                              align="center"
                              gap={3}
                            >
                              <Box
                                borderColor={active ? tokens.deep : tokens.border}
                                borderRadius="full"
                                borderWidth={active ? '7px' : '2px'}
                                boxSize="22px"
                              />
                              <Box>
                                <Text
                                  color={tokens.text}
                                  fontSize="12px"
                                  fontWeight="semibold"
                                >
                                  {item.title}
                                </Text>
                                <Text
                                  color={tokens.muted}
                                  fontSize="11px"
                                >
                                  {item.hint}
                                </Text>
                              </Box>
                            </Flex>
                          </Box>
                        )
                      })}
                    </Flex>
                  </Box>
                  <Box>
                    <Text
                      color={tokens.text}
                      fontSize="14px"
                      fontWeight="semibold"
                      mb={2}
                    >
                      Sobre o que é?
                    </Text>
                    <Textarea
                      borderColor={tokens.border}
                      borderRadius="10px"
                      data-testid="briefing-theme"
                      minH="72px"
                      onChange={(event) => setTheme(event.target.value)}
                      placeholder="Coleta grátis no Batel nesta semana"
                      value={theme}
                    />
                    <Text
                      color={tokens.muted}
                      fontSize="11px"
                      mt={2}
                    >
                      Escreva do seu jeito. Ex.: “edredom com 20% off até sexta”.
                    </Text>
                  </Box>
                </Flex>
              )}
              {stepId === 'photos' && (
                <SocialPostPhotosStep
                  companyId={companyId}
                  creativeFreedom={creativeFreedom}
                  format={format}
                  onCreativeFreedom={setCreativeFreedom}
                  onPhotos={setPhotos}
                  photos={photos}
                />
              )}
              {stepId === 'format' && (
                <Flex
                  direction="column"
                  gap={6}
                >
                  <Box>
                    <Text
                      color={tokens.text}
                      fontSize="14px"
                      fontWeight="semibold"
                      mb={3}
                    >
                      <Text as="span">Onde postar</Text>
                      <Text
                        as="span"
                        color={tokens.muted}
                        fontWeight="normal"
                      >
                        {' '}
                        (pode escolher vários)
                      </Text>
                    </Text>
                    <Flex
                      gap={2}
                      wrap="wrap"
                    >
                      {WIZARD_DESTINATIONS.map((item) => {
                        const active = destinations.includes(item.value)
                        return (
                          <Box
                            aria-pressed={active}
                            as="button"
                            bg={active ? tokens.selectedBg : tokens.card}
                            borderColor={active ? tokens.accent : tokens.border}
                            borderRadius="10px"
                            borderWidth="1px"
                            color={tokens.text}
                            fontSize="13px"
                            fontWeight="medium"
                            h="40px"
                            key={item.value}
                            onClick={() => {
                              const selected = destinations.includes(item.value)
                              const next = selected
                                ? destinations.length === 1
                                  ? destinations
                                  : destinations.filter((value) => value !== item.value)
                                : [...destinations, item.value]
                              if (format === 'carousel' && carouselBlocked(next)) {
                                setFormat('feed')
                              }
                              setDestinations(next)
                            }}
                            px={3}
                            type="button"
                          >
                            <Flex
                              align="center"
                              gap={2}
                            >
                              <Box
                                bg={active ? tokens.deep : 'transparent'}
                                borderColor={active ? tokens.deep : tokens.border}
                                borderRadius="4px"
                                borderWidth="1px"
                                boxSize="16px"
                              />
                              {item.title}
                            </Flex>
                          </Box>
                        )
                      })}
                    </Flex>
                  </Box>
                  <Box>
                    <Text
                      color={tokens.text}
                      fontSize="14px"
                      fontWeight="semibold"
                      mb={3}
                    >
                      Formato
                    </Text>
                    <Flex
                      direction={phone ? 'column' : 'row'}
                      gap={2}
                    >
                      {WIZARD_FORMATS.map((item) => {
                        const blocked =
                          item.value === 'carousel' && carouselBlocked(destinations)
                        const active = format === item.value
                        return (
                          <Box
                            aria-disabled={blocked}
                            as="button"
                            bg={active ? tokens.selectedBg : tokens.card}
                            borderColor={active ? tokens.accent : tokens.border}
                            borderRadius="12px"
                            borderWidth="1px"
                            disabled={blocked}
                            flex="1"
                            key={item.value}
                            minH="72px"
                            onClick={() => {
                              if (blocked) return
                              setFormat(item.value)
                            }}
                            opacity={blocked ? 0.45 : 1}
                            px={3}
                            py={3}
                            textAlign="left"
                            type="button"
                          >
                            <Text
                              color={tokens.text}
                              fontSize="13px"
                              fontWeight="semibold"
                            >
                              {item.title}
                            </Text>
                            <Text
                              color={tokens.muted}
                              fontSize="12px"
                            >
                              {item.hint}
                            </Text>
                          </Box>
                        )
                      })}
                    </Flex>
                    {carouselBlocked(destinations) && (
                      <Flex
                        bg="#FEF3C7"
                        borderRadius="10px"
                        data-testid="carousel-block-notice"
                        mt={3}
                        px={3}
                        py={2}
                      >
                        <Text
                          color="#92400E"
                          fontSize="12px"
                          fontWeight="medium"
                        >
                          {CAROUSEL_BLOCK_MESSAGE}
                        </Text>
                      </Flex>
                    )}
                    {format === 'carousel' && (
                      <Flex
                        align="center"
                        gap={2}
                        mt={3}
                        wrap="wrap"
                      >
                        <Text
                          color={tokens.muted}
                          fontSize="12px"
                        >
                          Slides
                        </Text>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                          <Box
                            as="button"
                            bg={slideCount === count ? tokens.deep : tokens.card}
                            borderColor={tokens.border}
                            borderRadius="full"
                            borderWidth="1px"
                            color={slideCount === count ? 'white' : tokens.text}
                            fontSize="12px"
                            h="32px"
                            key={count}
                            onClick={() => setSlideCount(count)}
                            type="button"
                            w="32px"
                          >
                            {count}
                          </Box>
                        ))}
                      </Flex>
                    )}
                  </Box>
                  <Box>
                    <Text
                      color={tokens.text}
                      fontSize="14px"
                      fontWeight="semibold"
                      mb={3}
                    >
                      Jeito de falar
                    </Text>
                    <Flex
                      gap={2}
                      wrap="wrap"
                    >
                      {WIZARD_TONES.map((item) => {
                        const active = tone === item
                        return (
                          <Box
                            as="button"
                            bg={active ? tokens.selectedBg : tokens.card}
                            borderColor={active ? tokens.accent : tokens.border}
                            borderRadius="full"
                            borderWidth="1px"
                            color={active ? tokens.deep : tokens.text}
                            fontSize="13px"
                            fontWeight="medium"
                            h="36px"
                            key={item}
                            onClick={() => setTone(item)}
                            px="14px"
                            type="button"
                          >
                            {item}
                          </Box>
                        )
                      })}
                    </Flex>
                    <Text
                      color={tokens.muted}
                      fontSize="11px"
                      mt={3}
                    >
                      Usamos as cores e o logo da sua marca.
                    </Text>
                  </Box>
                </Flex>
              )}
              {stepId === 'review' && (
                <Flex
                  direction="column"
                  gap={4}
                >
                  <Box
                    borderColor={tokens.border}
                    borderRadius="12px"
                    borderWidth="1px"
                  >
                    {(
                      [
                        ['Objetivo', objectiveTitle(objective), wizardStepOf('objective')],
                        ['Tema', theme, wizardStepOf('objective')],
                        ['Destinos', destinationsTitle(destinations), wizardStepOf('format')],
                        ['Formato', formatTitle(format, slideCount), wizardStepOf('format')],
                        ['Jeito de falar', tone, wizardStepOf('format')],
                        [
                          'Fotos',
                          photos.length
                            ? `${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'} · liberdade criativa ${creativeFreedom ? 'ligada' : 'desligada'}`
                            : `Nenhuma foto · liberdade criativa ${creativeFreedom ? 'ligada' : 'desligada'}`,
                          wizardStepOf('photos'),
                        ],
                      ] as const
                    ).map(([label, value, target], index) => (
                      <Flex
                        borderColor={tokens.border}
                        borderTopWidth={index === 0 ? 0 : '1px'}
                        justify="space-between"
                        key={label}
                        px={4}
                        py="14px"
                      >
                        <Box>
                          <Text
                            color={tokens.muted}
                            fontSize="11px"
                          >
                            {label}
                          </Text>
                          <Text
                            color={tokens.text}
                            fontSize="12px"
                            fontWeight="semibold"
                          >
                            {value}
                          </Text>
                        </Box>
                        <Box
                          as="button"
                          color={tokens.deep}
                          fontSize="12px"
                          fontWeight="semibold"
                          onClick={() => setCurrent(target)}
                          type="button"
                        >
                          Alterar
                        </Box>
                      </Flex>
                    ))}
                  </Box>
                  <Flex
                    color={tokens.muted}
                    gap={2}
                  >
                    <LuSparkles size={16} />
                    <Text fontSize="12px">
                      Vamos criar o texto e a imagem. Leva cerca de 1 minuto.
                    </Text>
                  </Flex>
                </Flex>
              )}
            </Box>
            <Flex
              align={phone ? 'stretch' : 'center'}
              borderColor={tokens.border}
              borderTopWidth="1px"
              direction={phone ? 'column' : 'row'}
              gap={3}
              justify="space-between"
              px={phone ? 4 : 6}
              py={4}
            >
              <Flex
                align="center"
                color={tokens.muted}
                gap={2}
              >
                <LuInfo size={14} />
                <Text fontSize="11px">
                  Se você fechar, salvamos como rascunho.
                </Text>
              </Flex>
              <Flex gap={3}>
                {current === 1 ? (
                  <Box
                    as="button"
                    bg={tokens.card}
                    borderColor={tokens.border}
                    borderRadius="10px"
                    borderWidth="1px"
                    color={tokens.text}
                    flex={phone ? 1 : undefined}
                    fontSize="14px"
                    fontWeight="semibold"
                    h="44px"
                    onClick={close}
                    px="18px"
                    type="button"
                  >
                    Cancelar
                  </Box>
                ) : (
                  <Box
                    as="button"
                    bg={tokens.card}
                    borderColor={tokens.border}
                    borderRadius="10px"
                    borderWidth="1px"
                    color={tokens.text}
                    data-testid="wizard-back"
                    flex={phone ? 1 : undefined}
                    fontSize="14px"
                    fontWeight="semibold"
                    h="44px"
                    onClick={() =>
                      setCurrent((value) => (value > 1 ? ((value - 1) as WizardStep) : value))
                    }
                    px="18px"
                    type="button"
                  >
                    Voltar
                  </Box>
                )}
                {current < lastStep ? (
                  <Box
                    as="button"
                    bg={tokens.accent}
                    borderRadius="10px"
                    color={tokens.deep}
                    data-testid="wizard-next"
                    disabled={objectiveBlocked}
                    flex={phone ? 1 : undefined}
                    fontSize="14px"
                    fontWeight="semibold"
                    h="44px"
                    onClick={() => {
                      if (objectiveBlocked) return
                      setCurrent((value) =>
                        value < lastStep ? ((value + 1) as WizardStep) : value
                      )
                    }}
                    opacity={objectiveBlocked ? 0.5 : 1}
                    px="20px"
                    type="button"
                  >
                    Continuar
                  </Box>
                ) : (
                  <Box
                    as="button"
                    bg={tokens.accent}
                    borderRadius="10px"
                    color={tokens.deep}
                    data-testid="wizard-generate"
                    disabled={!canContinue}
                    flex={phone ? 1 : undefined}
                    fontSize="14px"
                    fontWeight="semibold"
                    h="44px"
                    onClick={() => onGenerate(snapshot(lastStep as WizardStep))}
                    opacity={!canContinue ? 0.5 : 1}
                    px="20px"
                    type="button"
                  >
                    <Flex
                      align="center"
                      gap={2}
                      justify="center"
                    >
                      <LuSparkles size={16} />
                      Gerar post
                    </Flex>
                  </Box>
                )}
              </Flex>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
