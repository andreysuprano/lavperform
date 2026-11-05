import { Box, Dialog, Flex, Portal, Text, Textarea } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuInfo, LuSparkles, LuX } from 'react-icons/lu'

import { useShellMode } from '@/components/layout/AppLayout/useShellMode'

import {
  objectiveTitle,
  placementTitle,
  WIZARD_OBJECTIVES,
  WIZARD_PLACEMENTS,
  WIZARD_TONES,
  type WizardStep,
} from './postLibrary'
import { useSocialMediaTokens } from './socialMediaTokens'
import { SocialPostPhotosStep } from './SocialPostPhotosStep'

export interface WizardSnapshot {
  id?: string
  objective: string
  theme: string
  placement: string
  format: string
  tone: string
  creativeFreedom: boolean
  wizardStep: WizardStep
  mediaIds: string[]
}

interface Props {
  open: boolean
  initial?: Partial<WizardSnapshot>
  step?: WizardStep
  onClose: (snapshot: WizardSnapshot | null) => void
  onGenerate: (snapshot: WizardSnapshot) => void
}

const STEP_LABELS = [
  'Objetivo & tema',
  'Fotos',
  'Formato & tom',
  'Revisar & gerar',
] as const

export function SocialPostWizard({
  open,
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
  const [placement, setPlacement] = useState(initial?.placement ?? 'feed')
  const [tone, setTone] = useState(initial?.tone ?? 'Amigável')
  const creativeFreedom = Boolean(initial?.creativeFreedom)

  useEffect(() => {
    if (!open) return
    setCurrent(step)
    setObjective(initial?.objective ?? 'atrair')
    setTheme(initial?.theme ?? '')
    setPlacement(initial?.placement ?? 'feed')
    setTone(initial?.tone ?? 'Amigável')
  }, [open, step, initial])

  const snapshot = (wizardStep: WizardStep): WizardSnapshot => {
    const place = WIZARD_PLACEMENTS.find((item) => item.value === placement)
    return {
      id: initial?.id,
      objective,
      theme,
      placement,
      format: place?.format ?? 'feed',
      tone,
      creativeFreedom,
      wizardStep,
      mediaIds: initial?.mediaIds ?? [],
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
                {`PASSO ${current} DE 4 · ${STEP_LABELS[current - 1].toUpperCase()}`}
              </Text>
              <Flex
                gap={2}
                mb={2}
              >
                {[1, 2, 3, 4].map((item) => (
                  <Box
                    bg={item <= current ? tokens.deep : tokens.track}
                    borderRadius="full"
                    flex="1"
                    h="6px"
                    key={item}
                  />
                ))}
              </Flex>
              <Flex
                aria-label="Progresso"
                aria-valuemax={4}
                aria-valuemin={1}
                aria-valuenow={current}
                justify="space-between"
                mb={6}
                role="progressbar"
              >
                {STEP_LABELS.map((label, index) => (
                  <Text
                    color={index + 1 === current ? tokens.text : tokens.muted}
                    fontSize="11px"
                    fontWeight={index + 1 === current ? 'semibold' : 'normal'}
                    key={label}
                  >
                    {label}
                  </Text>
                ))}
              </Flex>
              {current === 1 && (
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
              {current === 2 && <SocialPostPhotosStep />}
              {current === 3 && (
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
                      Onde vai aparecer?
                    </Text>
                    <Flex
                      direction="column"
                      gap={2}
                    >
                      {WIZARD_PLACEMENTS.map((item) => {
                        const active = placement === item.value
                        return (
                          <Box
                            as="button"
                            bg={active ? tokens.selectedBg : tokens.card}
                            borderColor={active ? tokens.accent : tokens.border}
                            borderRadius="12px"
                            borderWidth="1px"
                            key={item.value}
                            minH="52px"
                            onClick={() => setPlacement(item.value)}
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
              {current === 4 && (
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
                        ['Objetivo', objectiveTitle(objective), 1],
                        ['Tema', theme, 1],
                        ['Fotos', 'Opcional', 2],
                        ['Formato', placementTitle(placement), 3],
                        ['Jeito de falar', tone, 3],
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
                {current < 4 ? (
                  <Box
                    as="button"
                    bg={tokens.accent}
                    borderRadius="10px"
                    color={tokens.deep}
                    data-testid="wizard-next"
                    disabled={current === 1 && !canContinue}
                    flex={phone ? 1 : undefined}
                    fontSize="14px"
                    fontWeight="semibold"
                    h="44px"
                    onClick={() => {
                      if (current === 1 && !canContinue) return
                      setCurrent((value) => (value < 4 ? ((value + 1) as WizardStep) : value))
                    }}
                    opacity={current === 1 && !canContinue ? 0.5 : 1}
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
                    onClick={() => onGenerate(snapshot(4))}
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
