import { Card, Fieldset, Heading, Stack, Text } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo } from 'react'
import { useForm } from 'react-hook-form'

import { Input } from '@/components'
import { usePartner } from '@/hooks/queries'

import { FormDataPartner, schemaPartner } from '../schema'
import { FormStepsProps } from './FormSteps.types'

function PartnerComponent(props: FormStepsProps) {
  const { register, control, handleSubmit, watch } = useForm<FormDataPartner>({
    mode: 'onChange',
    resolver: yupResolver<FormDataPartner, any, any>(schemaPartner),
    defaultValues: {
      businessPartnerId: '',
    },
    values: {
      businessPartnerId: props.formData?.businessPartnerId || '',
    },
  })

  const partnerId = watch('businessPartnerId')

  const { data: partner } = usePartner(
    props.formData?.businessPartnerId || partnerId
  )

  const onSubmit = async (data: any) => {
    props.onSubmit?.(data)
  }

  return (
    <Stack
      as="form"
      gap={4}
      id={`hook-form-${props.id}`}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Fieldset.Root>
        <Fieldset.Content>
          <Input
            control={control}
            label="Parceiro"
            placeholder="Digite o ID do parceiro"
            required
            {...register('businessPartnerId')}
          />
        </Fieldset.Content>
      </Fieldset.Root>
      {partnerId.length > 0 && (
        <>
          {partner ? (
            <Card.Root
              bg="transparent"
              size="sm"
              variant="outline"
            >
              <Card.Header>
                <Heading
                  color="fg"
                  size="md"
                >
                  Parceiro:
                </Heading>
              </Card.Header>
              <Card.Body>
                <Heading
                  color="fg"
                  size="xl"
                >
                  {partner?.name || 'Parceiro'}
                </Heading>
                <Text color="fg.muted">{partner?.email || null}</Text>
              </Card.Body>
            </Card.Root>
          ) : (
            <Text color="fg.error">Nenhum parceiro encontrado.</Text>
          )}
        </>
      )}
    </Stack>
  )
}

const Partner = memo(PartnerComponent)

export { Partner }
