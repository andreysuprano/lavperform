import {
  Alert,
  Button,
  Card,
  Clipboard,
  Flex,
  Input as ChakraInput,
  InputGroup,
  Stack,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
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
import { FormData, schema } from './schema'

function CompanyIntegrationForm({
  name,
  logo,
  partnerId,
  webhook,
  codigoLoja,
  token,
  urlCardapio,
  onSuccess,
}: Props) {
  const { images, features } = useWhiteLabel()

  const [isOpen, setIsOpen] = useState(false)
  const { selectedCompany } = useAuth()

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver<FormData, any, any>(schema),
    mode: 'onChange',
    values: {
      webhook: webhook ?? '',
      codigoLoja: codigoLoja ?? '',
      token: token ?? '',
      urlCardapio: urlCardapio ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    if (!selectedCompany) return

    const payload = {
      partnerId,
      apiKey: data.token || '',
      apiSecret: '',
      merchantId: data.codigoLoja || '',
      digitalMenuUrl: data.urlCardapio || '',
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
            <Card.Title
              flex={1}
              fontWeight="medium"
            >
              {name}
            </Card.Title>
            <FaChevronRight
              color="gray"
              size={20}
            />
          </Card.Body>
        </Card.Root>
      }
    >
      <Stack
        as="form"
        gap={6}
        id="hook-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Alert.Root
          status="warning"
          variant="surface"
        >
          <Alert.Indicator />
          <Alert.Description>
            Ao integrar com <strong>{name}</strong>, você consegue muito mais
            inteligência de dados e resultados nas campanhas!
          </Alert.Description>
        </Alert.Root>
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
        <Input
          control={control}
          label="Código da loja"
          placeholder="Código da loja"
          required
          {...register('codigoLoja')}
        />
        <Input
          control={control}
          label="Token / Apikey"
          placeholder="Token / Apikey"
          required
          {...register('token')}
        />
        {features.hasDelivery && (
          <Input
            control={control}
            label={getBusinessCopy().digitalMenuUrlLabel}
            placeholder={getBusinessCopy().digitalMenuUrlLabel}
            {...register('urlCardapio')}
          />
        )}
      </Stack>
    </CustomDrawer>
  )
}

export { CompanyIntegrationForm, type Props as CompanyIntegrationFormProps }
