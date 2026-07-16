import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Icon,
  IconButton,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useRef } from 'react'
import { RiDeleteBinLine, RiFile3Line, RiUpload2Line } from 'react-icons/ri'

import { Empty, LoadingState, Tooltip } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  useAIAgentKnowledgeBase,
  useDeleteAIAgentKnowledgeFile,
  useUploadAIAgentKnowledgeFile,
} from '@/whitelabel/hooks'

import type { AIAgentKnowledgeFile } from '@/whitelabel/types'

import type { Props } from './AIAgentKnowledgeBaseCard.types'

function getFileTypeLabel(type: AIAgentKnowledgeFile['type']) {
  switch (type) {
    case 'pdf':
      return 'PDF'
    case 'csv':
      return 'CSV'
    case 'markdown':
      return 'Markdown'
    default:
      return type
  }
}

function getStatusBadge(status: AIAgentKnowledgeFile['status']) {
  if (status === 'ready') {
    return (
      <Badge colorPalette="green" variant="subtle">
        Pronto
      </Badge>
    )
  }

  if (status === 'error') {
    return (
      <Badge colorPalette="red" variant="subtle">
        Erro
      </Badge>
    )
  }

  return (
    <Badge colorPalette="gray" variant="subtle">
      Processando
    </Badge>
  )
}

function AIAgentKnowledgeBaseCardBase({ agentId, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { selectedCompany } = useAuth()

  const { data, isLoading } = useAIAgentKnowledgeBase(
    selectedCompany?.id,
    agentId
  )
  const uploadMutation = useUploadAIAgentKnowledgeFile()
  const deleteMutation = useDeleteAIAgentKnowledgeFile()

  const isUploading = uploadMutation.isPending
  const isDeleting = deleteMutation.isPending

  const isDisabled = disabled || !agentId

  const handleOpenFilePicker = useCallback(() => {
    if (isDisabled) return
    fileInputRef.current?.click()
  }, [isDisabled])

  const handleFilesSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files

      if (!files || !selectedCompany || !agentId) return

      const acceptedExtensions = ['.pdf', '.csv', '.md']

      const acceptedFiles = Array.from(files).filter((file) =>
        acceptedExtensions.some((ext) =>
          file.name.toLowerCase().endsWith(ext.toLowerCase())
        )
      )

      for (const file of acceptedFiles) {
        await uploadMutation.mutateAsync({
          companyId: selectedCompany.id,
          agentId,
          file,
        })
      }

      event.target.value = ''
    },
    [selectedCompany, uploadMutation, agentId]
  )

  const handleDelete = useCallback(
    async (file: AIAgentKnowledgeFile) => {
      if (!selectedCompany || !agentId) return

      await deleteMutation.mutateAsync({
        companyId: selectedCompany.id,
        agentId,
        fileId: file.id,
      })
    },
    [deleteMutation, selectedCompany, agentId]
  )

  const hasFiles = (data?.length ?? 0) > 0

  return (
    <Card.Root>
      <Card.Header>
        <Stack gap={1}>
          <Card.Title>Base de conhecimento da IA</Card.Title>
          <Card.Description>
            Envie documentos que serão usados como contexto adicional para o
            agente responder seus clientes.
          </Card.Description>
        </Stack>
      </Card.Header>

      <Card.Body>
        <Stack gap={6}>
          <Box
            borderWidth="1px"
            borderStyle="dashed"
            borderRadius="lg"
            p={4}
            bg="bg.subtle"
          >
            <Stack gap={3}>
              <Text fontSize="sm" fontWeight="semibold">
                Como essa base é usada
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Os arquivos enviados aqui serão utilizados pela IA como{' '}
                <strong>base de conhecimento</strong>. Eles influenciam
                diretamente as respostas do agente.
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Arquivos grandes ou mal estruturados podem impactar a qualidade
                das respostas. Alterações (upload ou exclusão) podem levar
                alguns segundos para refletir no comportamento do agente.
              </Text>
            </Stack>
          </Box>

          <Stack gap={4}>
            <Box
              borderWidth="1px"
              borderStyle="dashed"
              borderRadius="lg"
              p={6}
              textAlign="center"
              bg={isDisabled ? 'bg.subtle' : 'transparent'}
              opacity={isDisabled ? 0.6 : 1}
            >
              <Stack gap={3} align="center">
                <Icon as={RiUpload2Line} boxSize={8} color="fg.muted" />
                <Stack gap={1}>
                  <Text fontSize="sm" fontWeight="semibold">
                    Upload de arquivos da base de conhecimento
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Arraste e solte arquivos aqui ou clique para selecionar.
                    Formatos aceitos: PDF, CSV e Markdown (.md).
                  </Text>
                </Stack>
                <Button
                  size="sm"
                  onClick={handleOpenFilePicker}
                  loading={isUploading}
                  disabled={isDisabled || isUploading}
                >
                  <RiUpload2Line />
                  Selecionar arquivos
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.csv,.md"
                  style={{ display: 'none' }}
                  onChange={handleFilesSelected}
                />
                {isDisabled && (
                  <Text fontSize="xs" color="fg.muted">
                    {!agentId
                      ? 'Salve o agente primeiro para gerenciar arquivos da base de conhecimento.'
                      : 'Ative o agente de IA para gerenciar a base de conhecimento.'}
                  </Text>
                )}
              </Stack>
            </Box>
          </Stack>

          <Stack gap={3}>
            <Text fontSize="sm" fontWeight="semibold">
              Arquivos enviados
            </Text>

            {isLoading ? (
              <LoadingState title="Carregando base de conhecimento..." />
            ) : !hasFiles ? (
              <Empty
                title="Nenhum arquivo cadastrado"
                description="Envie documentos para começar a treinar a base de conhecimento do agente."
              />
            ) : (
              <Stack gap={2}>
                {data?.map((file) => (
                  <HStack
                    key={file.id}
                    justify="space-between"
                    align="center"
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    bg="bg.subtle"
                  >
                    <HStack gap={3}>
                      <Icon
                        as={RiFile3Line}
                        boxSize={5}
                        color="fg.muted"
                      />
                      <Stack gap={0} maxW="lg">
                        <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                          {file.name}
                        </Text>
                        <HStack gap={2}>
                          <Text fontSize="xs" color="fg.muted">
                            {getFileTypeLabel(file.type)}
                          </Text>
                          {getStatusBadge(file.status)}
                        </HStack>
                      </Stack>
                    </HStack>

                    <Tooltip content="Remover arquivo da base de conhecimento">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Remover arquivo"
                        onClick={() => handleDelete(file)}
                        disabled={isDisabled || isDeleting}
                      >
                        <RiDeleteBinLine />
                      </IconButton>
                    </Tooltip>
                  </HStack>
                ))}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const AIAgentKnowledgeBaseCard = memo(
  AIAgentKnowledgeBaseCardBase
) as typeof AIAgentKnowledgeBaseCardBase

export { AIAgentKnowledgeBaseCard, type Props as AIAgentKnowledgeBaseCardProps }

