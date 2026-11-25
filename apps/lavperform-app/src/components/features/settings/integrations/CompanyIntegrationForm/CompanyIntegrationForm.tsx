import {
  Alert,
  Button,
  Card,
  Clipboard,
  Flex,
  Input as ChakraInput,
  InputGroup,
  Stack,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FaChevronRight } from 'react-icons/fa'
import { RiSaveLine } from 'react-icons/ri'

import {
  ClipboardIconButton,
  CustomDrawer,
  Input,
  LazyImage,
  toaster,
} from '@/components'
import { getBusinessCopy, useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { integrationService } from '@/services'
import { logger } from '@/utils/logger'

import { Props } from './CompanyIntegrationForm.types'
import {
  fieldCopy,
  sessionSetupHint,
  supportsHistoryImport,
} from './partner-fields'
import { buildSchema, FormData } from './schema'

function dateOnly(daysAgo: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function CompanyIntegrationForm({
  name,
  logo,
  partnerId,
  webhook,
  partnerSlug,
  codigoLoja,
  token,
  apiSecret,
  apiPassword,
  requiredFields = [],
  optionalFields = [],
  urlCardapio,
  session,
  onSuccess,
}: Props) {
  const { images, features } = useWhiteLabel()

  const [isOpen, setIsOpen] = useState(false)
  const { selectedCompany } = useAuth()
  const slug = partnerSlug?.trim().toUpperCase()
  const usesEmailPassword =
    slug === 'WINDEL' || slug === 'WAYMONEY' || slug === 'SWL'
  const catalog = requiredFields.length > 0
  const showMerchant =
    !catalog ||
    requiredFields.includes('merchantId') ||
    optionalFields.includes('merchantId')
  const showSecret =
    requiredFields.includes('apiSecret') ||
    (!catalog &&
      (name.trim().toLowerCase() === 'hybex' ||
        requiredFields.includes('apiSecret')))
  const showPassword =
    requiredFields.includes('password') ||
    (!catalog &&
      (name.trim().toLowerCase() === 'hybex' || slug === 'HYBEX_ESSENCE'))
  const sessionPartner =
    slug === 'MAXLAV' || slug === 'LAUNDRYKIT' || slug === 'SISLAV'
  const showApiUrl = sessionPartner || features.hasDelivery
  const merchantRequired = catalog
    ? requiredFields.includes('merchantId')
    : slug !== 'VMLAV' && slug !== 'MAXLAV'
  const formSchema = useMemo(
    () => buildSchema(partnerSlug, requiredFields),
    [partnerSlug, requiredFields],
  )
  const merchantCopy = fieldCopy(partnerSlug, 'merchantId')
  const tokenCopy = fieldCopy(partnerSlug, 'apiKey')
  const secretCopy = fieldCopy(partnerSlug, 'apiSecret')
  const passwordCopy = fieldCopy(partnerSlug, 'password')
  const urlCopy = fieldCopy(
    partnerSlug,
    'digitalMenuUrl',
  )
  const setupHint = sessionSetupHint(partnerSlug)
  const canImportHistory = supportsHistoryImport(partnerSlug)
  const [historyStart, setHistoryStart] = useState(() => dateOnly(90))
  const [historyEnd, setHistoryEnd] = useState(() => dateOnly(0))
  const [importingHistory, setImportingHistory] = useState(false)

  const importHistory = async () => {
    if (!selectedCompany || (slug !== 'MAXLAV' && slug !== 'LAUNDRYKIT')) return

    setImportingHistory(true)
    try {
      const response = await integrationService.importHistory({
        companyId: selectedCompany.id,
        partnerSlug: slug,
        startDate: historyStart,
        endDate: historyEnd,
      })
      const jobsCreated = response.data?.jobsCreated
      toaster.create({
        title: 'Importação iniciada',
        description:
          typeof jobsCreated === 'number'
            ? `${jobsCreated} dias entraram na fila.`
            : 'O histórico entrou na fila.',
        type: 'success',
      })
    } catch (error) {
      toaster.create({
        title: 'Erro!',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a importação do histórico.',
        type: 'error',
      })
    } finally {
      setImportingHistory(false)
    }
  }

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver<FormData, any, any>(formSchema),
    mode: 'onChange',
    values: {
      webhook: webhook ?? '',
      codigoLoja: codigoLoja ?? '',
      token: token ?? '',
      apiSecret: apiSecret ?? '',
      apiPassword: apiPassword ?? '',
      urlCardapio: urlCardapio ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    if (!selectedCompany) return

    const payload = {
      partnerId,
      apiKey: data.token || '',
      merchantId: showMerchant ? data.codigoLoja || '' : '',
      digitalMenuUrl: showApiUrl ? data.urlCardapio || '' : '',
      ...(showSecret ? { apiSecret: data.apiSecret || '' } : {}),
      ...(showPassword ? { password: data.apiPassword || '' } : {}),
    }

    try {
      await integrationService.saveUpdateCompanyIntegration({
        companyId: selectedCompany.id,
        payload,
      })

      toaster.create({
        title: 'Sucesso!',
        description: 'Integração salva com sucesso.',
        type: 'success',
      })

      setIsOpen(false)
      onSuccess()
    } catch (error) {
      toaster.create({
        title: 'Erro!',
        description: 'Não foi possível salvar a integração.',
        type: 'error',
      })
      logger.error(error)
    }
  }

  return (
    <CustomDrawer
      footer={
        <Button
          form="hook-form"
          loading={isSubmitting}
          type="submit"
        >
          <RiSaveLine />
          Salvar
        </Button>
      }
      isOpen={isOpen}
      onOpenChange={(e) => setIsOpen(e.open)}
      size="sm"
      title={name}
      trigger={
        <Card.Root
          _hover={{ bg: 'bg.muted', cursor: 'pointer' }}
          w="full"
        >
          <Card.Body
            alignItems="center"
            as={Flex}
            flexDirection="row"
            gap={2}
          >
            <LazyImage
              alt={name}
              boxSize="36px"
              src={logo || images.logoIcon}
            />
            <Stack
              flex={1}
              gap={0}
            >
              <Card.Title fontWeight="medium">{name}</Card.Title>
              {session?.status === 'NEEDS_REAUTH' && (
                <Text
                  color="fg.error"
                  fontSize="xs"
                >
                  Sessão expirada. Cole um token novo.
                </Text>
              )}
              {session?.status === 'ACTIVE' && (
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  Sessão até {formatSessionDate(session.expiresAt)}
                </Text>
              )}
            </Stack>
            <FaChevronRight
              color="gray"
              size={20}
            />
          </Card.Body>
        </Card.Root>
      }
    >
      <>
      <Stack
        as="form"
        gap={6}
        id="hook-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        {session?.status === 'NEEDS_REAUTH' ? (
          <Alert.Root
            status="error"
            variant="surface"
          >
            <Alert.Indicator />
            <Alert.Description>
              {session.lastError ||
                'A sessão expirou. Cole um token ainda válido para voltar a importar.'}
            </Alert.Description>
          </Alert.Root>
        ) : (
          <Alert.Root
            status={setupHint ? 'info' : 'warning'}
            variant="surface"
          >
            <Alert.Indicator />
            <Alert.Description>
              {setupHint ??
                `Ao integrar com ${name}, você consegue muito mais inteligência de dados e resultados nas campanhas!`}
            </Alert.Description>
          </Alert.Root>
        )}
        {webhook && (
          <Controller
            control={control}
            name="webhook"
            render={({ field }) => (
              <Clipboard.Root value={field.value ?? ''}>
                <Clipboard.Label textStyle="label">Webhook</Clipboard.Label>
                <InputGroup endElement={<ClipboardIconButton />}>
                  <Clipboard.Input asChild>
                    <ChakraInput
                      {...field}
                      disabled
                      placeholder="Seu Webhook"
                      value={field.value ?? ''}
                    />
                  </Clipboard.Input>
                </InputGroup>
              </Clipboard.Root>
            )}
          />
        )}
        {showMerchant && (
          <Stack gap={1}>
            <Input
              control={control}
              label={merchantCopy.label}
              placeholder={merchantCopy.placeholder}
              required={merchantRequired}
              {...register('codigoLoja')}
            />
            {merchantCopy.hint && (
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                {merchantCopy.hint}
              </Text>
            )}
          </Stack>
        )}
        <Stack gap={1}>
          <Input
            control={control}
            label={tokenCopy.label}
            placeholder={tokenCopy.placeholder}
            required
            type={usesEmailPassword ? 'password' : 'text'}
            {...register('token')}
          />
          {tokenCopy.hint && (
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              {tokenCopy.hint}
            </Text>
          )}
        </Stack>
        {showSecret && (
          <Stack gap={1}>
            <Input
              control={control}
              label={secretCopy.label}
              placeholder={secretCopy.placeholder}
              required={requiredFields.includes('apiSecret')}
              {...register('apiSecret')}
            />
            {secretCopy.hint && (
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                {secretCopy.hint}
              </Text>
            )}
          </Stack>
        )}
        {showPassword && (
          <Input
            control={control}
            label={passwordCopy.label}
            placeholder={passwordCopy.placeholder}
            required
            type="password"
            {...register('apiPassword')}
          />
        )}
        {showApiUrl && (
          <Stack gap={1}>
            <Input
              control={control}
              label={
                sessionPartner
                  ? urlCopy.label
                  : getBusinessCopy().digitalMenuUrlLabel
              }
              placeholder={
                sessionPartner
                  ? urlCopy.placeholder
                  : getBusinessCopy().digitalMenuUrlLabel
              }
              {...register('urlCardapio')}
            />
            {sessionPartner && urlCopy.hint && (
                <Text
                  color="fg.muted"
                  fontSize="sm"
                >
                  {urlCopy.hint}
                </Text>
              )}
          </Stack>
        )}
      </Stack>
      {canImportHistory && (
        <Stack
          gap={3}
          pt={2}
        >
          <Text fontWeight="medium">Importar histórico</Text>
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            {token
              ? 'Puxa as vendas do período, um dia por vez, com o token já salvo.'
              : 'Salve o token antes de importar o histórico.'}
          </Text>
          <Stack
            direction="row"
            gap={3}
          >
            <Stack
              flex={1}
              gap={1}
            >
              <Text fontSize="sm">De</Text>
              <ChakraInput
                disabled={!token || session?.status === 'NEEDS_REAUTH'}
                onChange={(event) => setHistoryStart(event.target.value)}
                type="date"
                value={historyStart}
              />
            </Stack>
            <Stack
              flex={1}
              gap={1}
            >
              <Text fontSize="sm">Até</Text>
              <ChakraInput
                disabled={!token || session?.status === 'NEEDS_REAUTH'}
                onChange={(event) => setHistoryEnd(event.target.value)}
                type="date"
                value={historyEnd}
              />
            </Stack>
          </Stack>
          <Button
            disabled={
              !token ||
              session?.status === 'NEEDS_REAUTH' ||
              !historyStart ||
              !historyEnd ||
              historyStart > historyEnd
            }
            loading={importingHistory}
            onClick={importHistory}
            type="button"
          >
            Importar histórico
          </Button>
        </Stack>
      )}
      </>
    </CustomDrawer>
  )
}

export { CompanyIntegrationForm, type Props as CompanyIntegrationFormProps }
