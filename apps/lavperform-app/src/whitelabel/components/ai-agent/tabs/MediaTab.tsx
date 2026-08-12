import {
  Button,
  Card,
  Fieldset,
  HStack,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react'
import { memo, useEffect } from 'react'
import { useController, useForm } from 'react-hook-form'

import { Textarea } from '@/components/forms'
import { useUpdateAIAgentMediaConfig } from '@/whitelabel/hooks'
import type { AIAgent } from '@/whitelabel/types'

interface MediaFormData {
  audioEnabled: boolean
  audioDefaultMessage: string
  imageEnabled: boolean
  imageExtractionPrompt: string
  imageDefaultMessage: string
  videoEnabled: boolean
  videoExtractionPrompt: string
  videoDefaultMessage: string
}

function buildMediaForm(agent: AIAgent): MediaFormData {
  const mc = agent.mediaConfig
  return {
    audioEnabled: mc?.audioEnabled ?? false,
    audioDefaultMessage: mc?.audioDefaultMessage || '',
    imageEnabled: mc?.imageEnabled ?? false,
    imageExtractionPrompt: mc?.imageExtractionPrompt || '',
    imageDefaultMessage: mc?.imageDefaultMessage || '',
    videoEnabled: mc?.videoEnabled ?? false,
    videoExtractionPrompt: mc?.videoExtractionPrompt || '',
    videoDefaultMessage: mc?.videoDefaultMessage || '',
  }
}

interface MediaTabProps {
  agent: AIAgent
}

function MediaTabBase({ agent }: MediaTabProps) {
  const updateMediaConfig = useUpdateAIAgentMediaConfig()

  const form = useForm<MediaFormData>({
    defaultValues: buildMediaForm(agent),
  })

  useEffect(() => {
    form.reset(buildMediaForm(agent))
  }, [agent, form])

  const {
    field: { value: audioEnabled, onChange: setAudioEnabled },
  } = useController({ control: form.control, name: 'audioEnabled' })
  const {
    field: { value: imageEnabled, onChange: setImageEnabled },
  } = useController({ control: form.control, name: 'imageEnabled' })
  const {
    field: { value: videoEnabled, onChange: setVideoEnabled },
  } = useController({ control: form.control, name: 'videoEnabled' })

  const handleSave = async () => {
    const values = form.getValues()
    await updateMediaConfig.mutateAsync({
      agentId: agent.id,
      data: {
        audioEnabled: values.audioEnabled,
        audioDefaultMessage: values.audioDefaultMessage || undefined,
        imageEnabled: values.imageEnabled,
        imageExtractionPrompt: values.imageExtractionPrompt || undefined,
        imageDefaultMessage: values.imageDefaultMessage || undefined,
        videoEnabled: values.videoEnabled,
        videoExtractionPrompt: values.videoExtractionPrompt || undefined,
        videoDefaultMessage: values.videoDefaultMessage || undefined,
      },
    })
  }

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Card.Title>Configuração de mídia</Card.Title>
        <Card.Description>
          Controle como o agente lida com áudio, imagem e vídeo enviados pelos
          clientes.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <Fieldset.Root>
            <HStack justify="space-between" align="flex-start">
              <Stack gap={0.5}>
                <Fieldset.Legend fontSize="sm">Áudio</Fieldset.Legend>
                <Text fontSize="xs" color="fg.muted">
                  Permite que o agente processe mensagens de áudio.
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
            </HStack>
            <Fieldset.Content>
              {!audioEnabled && (
                <Textarea
                  control={form.control}
                  name="audioDefaultMessage"
                  label="Mensagem quando áudio está desabilitado"
                  placeholder="Ex: Desculpa, mas ainda não fui ensinado a ouvir áudios!"
                  rows={2}
                />
              )}
            </Fieldset.Content>
          </Fieldset.Root>

          <Fieldset.Root>
            <HStack justify="space-between" align="flex-start">
              <Stack gap={0.5}>
                <Fieldset.Legend fontSize="sm">Imagem</Fieldset.Legend>
                <Text fontSize="xs" color="fg.muted">
                  Permite que o agente analise imagens enviadas.
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
            </HStack>
            <Fieldset.Content>
              {!imageEnabled && (
                <Textarea
                  control={form.control}
                  name="imageDefaultMessage"
                  label="Mensagem quando imagem está desabilitada"
                  placeholder="Ex: Desculpa, mas ainda não fui ensinado a ver imagens!"
                  rows={2}
                />
              )}
              {imageEnabled && (
                <Textarea
                  control={form.control}
                  name="imageExtractionPrompt"
                  label="Prompt de extração de imagem"
                  placeholder="Descreva como o agente deve analisar as imagens..."
                  rows={3}
                />
              )}
            </Fieldset.Content>
          </Fieldset.Root>

          <Fieldset.Root>
            <HStack justify="space-between" align="flex-start">
              <Stack gap={0.5}>
                <Fieldset.Legend fontSize="sm">Vídeo</Fieldset.Legend>
                <Text fontSize="xs" color="fg.muted">
                  Permite que o agente analise vídeos enviados.
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
            </HStack>
            <Fieldset.Content>
              {!videoEnabled && (
                <Textarea
                  control={form.control}
                  name="videoDefaultMessage"
                  label="Mensagem quando vídeo está desabilitado"
                  placeholder="Ex: Desculpa, mas ainda não fui ensinado a ver vídeos!"
                  rows={2}
                />
              )}
              {videoEnabled && (
                <Textarea
                  control={form.control}
                  name="videoExtractionPrompt"
                  label="Prompt de extração de vídeo"
                  placeholder="Descreva como o agente deve analisar os vídeos..."
                  rows={3}
                />
              )}
            </Fieldset.Content>
          </Fieldset.Root>
        </Stack>
      </Card.Body>
      <Card.Footer justifyContent="flex-end">
        <Button
          size="sm"
          onClick={handleSave}
          loading={updateMediaConfig.isPending}
        >
          Salvar configuração de mídia
        </Button>
      </Card.Footer>
    </Card.Root>
  )
}

const MediaTab = memo(MediaTabBase) as typeof MediaTabBase

export { MediaTab }
