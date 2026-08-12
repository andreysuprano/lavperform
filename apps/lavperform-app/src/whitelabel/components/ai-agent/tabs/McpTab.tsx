import {
  Badge,
  Box,
  Button,
  Card,
  Field,
  HStack,
  IconButton,
  Input,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react'
import { memo, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiPencilLine,
} from 'react-icons/ri'

import { CustomDrawer, DeleteConfirmationDialog, Empty, LoadingState } from '@/components'
import { Input as FormInput } from '@/components/forms'
import {
  useAIAgentMcpServers,
  useCreateAIAgentMcpServer,
  useDeleteAIAgentMcpServer,
  useToggleAIAgentMcpServer,
  useUpdateAIAgentMcpServer,
} from '@/whitelabel/hooks'
import type {
  AIAgent,
  AIAgentMcpServer,
  McpTransport,
} from '@/whitelabel/types'

import { TagsInput } from './TagsInput'

interface KvPair {
  key: string
  value: string
}

interface McpFormData {
  name: string
  transport: McpTransport
  enabled: boolean
  command: string
  args: string[]
  env: KvPair[]
  url: string
  headers: KvPair[]
}

function recordToKv(record?: Record<string, string>): KvPair[] {
  if (!record) return []
  return Object.entries(record).map(([key, value]) => ({ key, value }))
}

function kvToRecord(pairs: KvPair[]): Record<string, string> {
  return Object.fromEntries(
    pairs.filter((p) => p.key.trim()).map((p) => [p.key, p.value])
  )
}

function buildFormData(server?: AIAgentMcpServer): McpFormData {
  return {
    name: server?.name ?? '',
    transport: server?.transport ?? 'STDIO',
    enabled: server?.enabled ?? true,
    command: server?.command ?? '',
    args: server?.args ?? [],
    env: recordToKv(server?.env),
    url: server?.url ?? '',
    headers: recordToKv(server?.headers),
  }
}

interface KvEditorProps {
  value: KvPair[]
  onChange: (value: KvPair[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}

function KvEditor({
  value,
  onChange,
  keyPlaceholder = 'Chave',
  valuePlaceholder = 'Valor',
}: KvEditorProps) {
  return (
    <Stack gap={2}>
      {value.map((row, index) => (
        <HStack key={index} gap={2}>
          <Input
            size="sm"
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) =>
              onChange(
                value.map((r, i) =>
                  i === index ? { ...r, key: e.target.value } : r
                )
              )
            }
          />
          <Input
            size="sm"
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(e) =>
              onChange(
                value.map((r, i) =>
                  i === index ? { ...r, value: e.target.value } : r
                )
              )
            }
          />
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Remover par"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <RiCloseLine />
          </IconButton>
        </HStack>
      ))}
      <Button
        size="xs"
        variant="ghost"
        alignSelf="flex-start"
        onClick={() => onChange([...value, { key: '', value: '' }])}
      >
        <RiAddLine />
        Adicionar par
      </Button>
    </Stack>
  )
}

interface McpFormDrawerProps {
  agentId: string
  server?: AIAgentMcpServer
  isOpen: boolean
  onClose: () => void
}

function McpFormDrawer({ agentId, server, isOpen, onClose }: McpFormDrawerProps) {
  const isEditing = !!server
  const createServer = useCreateAIAgentMcpServer()
  const updateServer = useUpdateAIAgentMcpServer()

  const form = useForm<McpFormData>({
    defaultValues: buildFormData(server),
  })

  useEffect(() => {
    if (isOpen) form.reset(buildFormData(server))
  }, [isOpen, server, form])

  const transport = form.watch('transport')
  const isPending = createServer.isPending || updateServer.isPending

  const handleSubmit = form.handleSubmit(async (values) => {
    const base = {
      name: values.name,
      transport: values.transport,
      enabled: values.enabled,
    }
    const payload =
      values.transport === 'STDIO'
        ? {
            ...base,
            command: values.command,
            args: values.args,
            env: kvToRecord(values.env),
          }
        : {
            ...base,
            url: values.url,
            headers: kvToRecord(values.headers),
          }

    if (isEditing) {
      await updateServer.mutateAsync({
        agentId,
        mcpServerId: server.id,
        data: payload,
      })
    } else {
      await createServer.mutateAsync({ agentId, data: payload })
    }
    onClose()
  })

  const footer = (
    <HStack w="full" justify="flex-end" gap={3}>
      <Button variant="ghost" onClick={onClose} disabled={isPending}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit} loading={isPending}>
        {isEditing ? 'Salvar alterações' : 'Criar servidor'}
      </Button>
    </HStack>
  )

  return (
    <CustomDrawer
      isOpen={isOpen}
      onOpenChange={(e) => {
        if (!e.open) onClose()
      }}
      title={isEditing ? 'Editar servidor MCP' : 'Adicionar servidor MCP'}
      size="lg"
      footer={footer}
    >
      <Stack gap={5}>
        <FormInput
          control={form.control}
          name="name"
          label="Nome"
          placeholder="Ex: Filesystem, Slack, Web Search"
        />

        <Controller
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium">
                Habilitado
              </Text>
              <Switch.Root
                checked={field.value}
                onCheckedChange={(e) => field.onChange(e.checked)}
                size="md"
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </HStack>
          )}
        />

        <Field.Root>
          <Field.Label>Tipo de transporte</Field.Label>
          <Controller
            control={form.control}
            name="transport"
            render={({ field }) => (
              <HStack gap={2}>
                {(['STDIO', 'SSE'] as const).map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={field.value === option ? 'solid' : 'outline'}
                    onClick={() => field.onChange(option)}
                  >
                    {option}
                  </Button>
                ))}
              </HStack>
            )}
          />
        </Field.Root>

        {transport === 'STDIO' ? (
          <>
            <FormInput
              control={form.control}
              name="command"
              label="Comando"
              placeholder="Ex: npx, python, /usr/bin/node"
            />
            <Controller
              control={form.control}
              name="args"
              render={({ field }) => (
                <Field.Root>
                  <Field.Label>Argumentos</Field.Label>
                  <TagsInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Digite e pressione Enter"
                  />
                </Field.Root>
              )}
            />
            <Controller
              control={form.control}
              name="env"
              render={({ field }) => (
                <Field.Root>
                  <Field.Label>Variáveis de ambiente</Field.Label>
                  <KvEditor
                    value={field.value}
                    onChange={field.onChange}
                    keyPlaceholder="NOME_VAR"
                    valuePlaceholder="valor"
                  />
                </Field.Root>
              )}
            />
          </>
        ) : (
          <>
            <FormInput
              control={form.control}
              name="url"
              label="URL"
              placeholder="https://meu-servidor.com/sse"
              type="url"
            />
            <Controller
              control={form.control}
              name="headers"
              render={({ field }) => (
                <Field.Root>
                  <Field.Label>Cabeçalhos HTTP</Field.Label>
                  <KvEditor
                    value={field.value}
                    onChange={field.onChange}
                    keyPlaceholder="Authorization"
                    valuePlaceholder="Bearer ..."
                  />
                </Field.Root>
              )}
            />
          </>
        )}
      </Stack>
    </CustomDrawer>
  )
}

interface McpServerRowProps {
  agentId: string
  server: AIAgentMcpServer
  onEdit: (server: AIAgentMcpServer) => void
}

function McpServerRow({ agentId, server, onEdit }: McpServerRowProps) {
  const toggleServer = useToggleAIAgentMcpServer()
  const deleteServer = useDeleteAIAgentMcpServer()

  const subtitle =
    server.transport === 'STDIO'
      ? [server.command, ...(server.args ?? [])].filter(Boolean).join(' ')
      : server.url ?? ''

  return (
    <HStack
      justify="space-between"
      align="center"
      borderWidth="1px"
      borderRadius="md"
      p={3}
      opacity={server.enabled ? 1 : 0.6}
    >
      <Stack gap={0.5} minW={0} flex={1}>
        <HStack gap={2}>
          <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
            {server.name}
          </Text>
          <Badge variant="subtle">{server.transport}</Badge>
          {!server.enabled && (
            <Badge variant="subtle" colorPalette="gray">
              Desabilitado
            </Badge>
          )}
        </HStack>
        {subtitle && (
          <Text fontSize="xs" color="fg.muted" lineClamp={1}>
            {subtitle}
          </Text>
        )}
      </Stack>

      <HStack gap={1}>
        <Switch.Root
          checked={server.enabled}
          onCheckedChange={() =>
            toggleServer.mutate({ agentId, mcpServerId: server.id })
          }
          disabled={toggleServer.isPending}
          size="md"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Editar servidor"
          onClick={() => onEdit(server)}
        >
          <RiPencilLine />
        </IconButton>
        <DeleteConfirmationDialog
          title="Remover servidor MCP"
          description={`Tem certeza que deseja remover o servidor "${server.name}"? Esta ação não pode ser desfeita.`}
          isLoading={deleteServer.isPending}
          onClick={() =>
            deleteServer.mutateAsync({ agentId, mcpServerId: server.id })
          }
          trigger={
            <IconButton
              size="sm"
              variant="ghost"
              colorPalette="red"
              aria-label="Remover servidor"
            >
              <RiDeleteBinLine />
            </IconButton>
          }
        />
      </HStack>
    </HStack>
  )
}

interface McpTabProps {
  agent: AIAgent
}

function McpTabBase({ agent }: McpTabProps) {
  const { data: servers, isLoading } = useAIAgentMcpServers(agent.id)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<
    AIAgentMcpServer | undefined
  >(undefined)

  const openCreate = () => {
    setEditingServer(undefined)
    setDrawerOpen(true)
  }

  const openEdit = (server: AIAgentMcpServer) => {
    setEditingServer(server)
    setDrawerOpen(true)
  }

  const hasServers = (servers?.length ?? 0) > 0

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <HStack justify="space-between" align="flex-start">
          <Stack gap={1}>
            <Card.Title>Ferramentas MCP</Card.Title>
            <Card.Description>
              Conecte servidores MCP para estender o agente com ferramentas
              externas.
            </Card.Description>
          </Stack>
          <Button size="sm" onClick={openCreate}>
            <RiAddLine />
            Adicionar
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <LoadingState title="Carregando servidores MCP..." />
        ) : !hasServers ? (
          <Box py={4}>
            <Empty
              title="Nenhum servidor MCP configurado"
              description="Adicione servidores MCP para dar novas capacidades ao agente, como sistema de arquivos, buscas na web e integrações."
            />
          </Box>
        ) : (
          <Stack gap={2}>
            {servers?.map((server) => (
              <McpServerRow
                key={server.id}
                agentId={agent.id}
                server={server}
                onEdit={openEdit}
              />
            ))}
          </Stack>
        )}
      </Card.Body>

      {drawerOpen && (
        <McpFormDrawer
          agentId={agent.id}
          server={editingServer}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </Card.Root>
  )
}

const McpTab = memo(McpTabBase) as typeof McpTabBase

export { McpTab }
