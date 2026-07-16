import { Card, Fieldset, Stack, Switch, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { useController } from 'react-hook-form'

import { Textarea } from '@/components/forms'

import type { Props } from './AIAgentWizardStep3.types'

function AIAgentWizardStep3Base({ control }: Props) {
  const {
    field: { value: audioEnabled, onChange: setAudioEnabled },
  } = useController({ control, name: 'audioEnabled' })

  const {
    field: { value: imageEnabled, onChange: setImageEnabled },
  } = useController({ control, name: 'imageEnabled' })

  const {
    field: { value: videoEnabled, onChange: setVideoEnabled },
  } = useController({ control, name: 'videoEnabled' })

  return (
    <Fieldset.Root>
      <Fieldset.Legend>Configuração de mídia</Fieldset.Legend>
      <Fieldset.HelperText>
        Configure como o agente deve lidar com diferentes tipos de mídia
        recebidos nas conversas.
      </Fieldset.HelperText>
      <Fieldset.Content>
        <Stack gap={4}>
          {/* Áudio */}
          <Card.Root variant="outline">
            <Card.Body>
              <Stack gap={4}>
                <Stack
                  direction="row"
                  justify="space-between"
                  align="flex-start"
                  gap={4}
                >
                  <Stack gap={0.5} flex={1}>
                    <Text fontWeight="semibold" fontSize="sm">
                      Áudio
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      Permite que o agente receba e processe mensagens de áudio.
                    </Text>
                  </Stack>
                  <Switch.Root
                    checked={!!audioEnabled}
                    onCheckedChange={(e) => setAudioEnabled(e.checked)}
                    size="md"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </Stack>

                {!audioEnabled && (
                  <Textarea
                    control={control}
                    name="audioDefaultMessage"
                    label="Mensagem quando áudio está desabilitado"
                    placeholder="Ex: Desculpa, mas ainda não fui ensinado a ouvir áudios! Se precisar de ajuda posso te direcionar para um atendente humano!"
                    rows={3}
                  />
                )}
              </Stack>
            </Card.Body>
          </Card.Root>

          {/* Imagem */}
          <Card.Root variant="outline">
            <Card.Body>
              <Stack gap={4}>
                <Stack
                  direction="row"
                  justify="space-between"
                  align="flex-start"
                  gap={4}
                >
                  <Stack gap={0.5} flex={1}>
                    <Text fontWeight="semibold" fontSize="sm">
                      Imagem
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      Permite que o agente analise e responda a imagens
                      enviadas.
                    </Text>
                  </Stack>
                  <Switch.Root
                    checked={!!imageEnabled}
                    onCheckedChange={(e) => setImageEnabled(e.checked)}
                    size="md"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </Stack>

                {!imageEnabled && (
                  <Textarea
                    control={control}
                    name="imageDefaultMessage"
                    label="Mensagem quando imagem está desabilitada"
                    placeholder="Ex: Desculpa, mas ainda não fui ensinado a ver imagens! Se precisar de ajuda posso te direcionar para um atendente humano!"
                    rows={3}
                  />
                )}

                {imageEnabled && (
                  <Textarea
                    control={control}
                    name="imageExtractionPrompt"
                    label="Prompt de extração de imagem"
                    placeholder="Descreva como o agente deve analisar as imagens recebidas..."
                    rows={3}
                  />
                )}
              </Stack>
            </Card.Body>
          </Card.Root>

          {/* Vídeo */}
          <Card.Root variant="outline">
            <Card.Body>
              <Stack gap={4}>
                <Stack
                  direction="row"
                  justify="space-between"
                  align="flex-start"
                  gap={4}
                >
                  <Stack gap={0.5} flex={1}>
                    <Text fontWeight="semibold" fontSize="sm">
                      Vídeo
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      Permite que o agente analise e responda a vídeos enviados.
                    </Text>
                  </Stack>
                  <Switch.Root
                    checked={!!videoEnabled}
                    onCheckedChange={(e) => setVideoEnabled(e.checked)}
                    size="md"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </Stack>

                {!videoEnabled && (
                  <Textarea
                    control={control}
                    name="videoDefaultMessage"
                    label="Mensagem quando vídeo está desabilitado"
                    placeholder="Ex: Desculpa, mas ainda não fui ensinado a ver vídeos! Se precisar de ajuda posso te direcionar para um atendente humano!"
                    rows={3}
                  />
                )}

                {videoEnabled && (
                  <Textarea
                    control={control}
                    name="videoExtractionPrompt"
                    label="Prompt de extração de vídeo"
                    placeholder="Descreva como o agente deve analisar os vídeos recebidos..."
                    rows={3}
                  />
                )}
              </Stack>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Fieldset.Content>
    </Fieldset.Root>
  )
}

const AIAgentWizardStep3 = memo(
  AIAgentWizardStep3Base
) as typeof AIAgentWizardStep3Base

export { AIAgentWizardStep3, type Props as AIAgentWizardStep3Props }
