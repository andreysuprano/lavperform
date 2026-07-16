import { useMutation, useQuery } from '@tanstack/react-query'

import { queryKeys, invalidateQueries } from '@/lib/react-query'
import { toaster } from '@/components/ui/toaster'
import { aiAgentService } from '@/whitelabel/services'
import { uploadImage } from '@/utils/upload'

import type {
  AIAgentKnowledgeFile,
  AIAgentKnowledgeFileResponse,
  AIAgentKnowledgeFileStatus,
  AIAgentKnowledgeFileStatusBackend,
  AIAgentKnowledgeFileType,
  CreateKnowledgeFilePayload,
  UpdateKnowledgeFilePayload,
} from '@/whitelabel/types'

const STATUS_MAP: Record<AIAgentKnowledgeFileStatusBackend, AIAgentKnowledgeFileStatus> = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  ERROR: 'error',
}

function resolveFileType(fileName: string): AIAgentKnowledgeFileType {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.csv')) return 'csv'
  return 'markdown'
}

function mapKnowledgeFile(raw: AIAgentKnowledgeFileResponse): AIAgentKnowledgeFile {
  return {
    id: raw.id,
    name: raw.fileName,
    fileUrl: raw.fileUrl,
    type: resolveFileType(raw.fileName),
    status: STATUS_MAP[raw.status],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

export function useAIAgentKnowledgeBase(
  companyId: string | undefined,
  agentId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.knowledgeFiles(
      companyId || '',
      agentId || ''
    ),
    queryFn: async () => {
      if (!companyId || !agentId) {
        throw new Error('Company ID and Agent ID are required')
      }

      const response = await aiAgentService.listKnowledgeFiles(
        companyId,
        agentId
      )
      return response.data.map(mapKnowledgeFile)
    },
    enabled: !!companyId && !!agentId,
    staleTime: 1000 * 60 * 5,
  })
}

interface UploadVariables {
  companyId: string
  agentId: string
  file: File
}

export function useUploadAIAgentKnowledgeFile() {
  return useMutation({
    mutationFn: async ({ companyId, agentId, file }: UploadVariables) => {
      const uploadResult = await uploadImage({
        file,
        folder: 'ai-agent-knowledge',
      })

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(
          uploadResult.error || 'Falha ao fazer upload do arquivo.'
        )
      }

      const payload: CreateKnowledgeFilePayload = {
        fileName: file.name,
        fileUrl: uploadResult.url,
        active: true,
      }

      const response = await aiAgentService.createKnowledgeFile(
        companyId,
        agentId,
        payload
      )

      return mapKnowledgeFile(response.data)
    },
    onSuccess: (_data, variables) => {
      invalidateQueries.aiAgentKnowledgeFiles(
        variables.companyId,
        variables.agentId
      )

      toaster.create({
        title: 'Arquivo enviado',
        description: 'A base de conhecimento foi atualizada com sucesso.',
        type: 'success',
      })
    },
    onError: (error) => {
      toaster.create({
        title: 'Erro no upload',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível enviar o arquivo. Tente novamente.',
        type: 'error',
      })
    },
  })
}

interface DeleteVariables {
  companyId: string
  agentId: string
  fileId: string
}

export function useDeleteAIAgentKnowledgeFile() {
  return useMutation({
    mutationFn: async ({ companyId, agentId, fileId }: DeleteVariables) => {
      await aiAgentService.deleteKnowledgeFile(companyId, agentId, fileId)
    },
    onSuccess: (_data, variables) => {
      invalidateQueries.aiAgentKnowledgeFiles(
        variables.companyId,
        variables.agentId
      )

      toaster.create({
        title: 'Arquivo removido',
        description: 'O arquivo foi removido da base de conhecimento.',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o arquivo. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useUpdateAIAgentKnowledgeFile() {
  return useMutation({
    mutationFn: async ({
      companyId,
      agentId,
      fileId,
      data,
    }: {
      companyId: string
      agentId: string
      fileId: string
      data: UpdateKnowledgeFilePayload
    }) => {
      const response = await aiAgentService.updateKnowledgeFile(
        companyId,
        agentId,
        fileId,
        data
      )
      return mapKnowledgeFile(response.data)
    },
    onSuccess: (_data, variables) => {
      invalidateQueries.aiAgentKnowledgeFiles(
        variables.companyId,
        variables.agentId
      )

      toaster.create({
        title: 'Arquivo atualizado',
        description: 'O arquivo foi atualizado com sucesso.',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o arquivo. Tente novamente.',
        type: 'error',
      })
    },
  })
}