import { Fieldset, Grid, GridItem, Stack } from '@chakra-ui/react'
import { memo, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'

import { Input, Textarea } from '@/components/forms'

import { FooterPreviewCard } from './FooterPreviewCard'
import { Props } from './FooterForm.types'

function FooterFormBase({ data, onChange, branding }: Props) {
  const { control, watch } = useForm({
    defaultValues: data,
  })

  const watchedData = watch()
  const onChangeRef = useRef(onChange)
  const previousDataRef = useRef<string>('')

  // Atualizar ref sempre que onChange mudar
  onChangeRef.current = onChange

  useEffect(() => {
    const currentDataString = JSON.stringify(watchedData)
    // Só chama onChange se os dados realmente mudaram
    if (currentDataString !== previousDataRef.current) {
      previousDataRef.current = currentDataString
      onChangeRef.current(watchedData)
    }
  }, [watchedData])

  return (
    <Grid
      gap={6}
      templateColumns={{ base: '1fr', lg: 'minmax(0, 520px) minmax(360px, 1fr)' }}
    >
      <GridItem order={{ base: 1, lg: 1 }}>
        <Stack gap={6}>
          <Fieldset.Root>
            <Fieldset.Legend>Rodapé</Fieldset.Legend>
            <Fieldset.Content>
              <Textarea
                control={control}
                label="Descrição"
                name="description"
                placeholder="Digite a descrição do rodapé"
                rows={3}
              />

              <Input
                control={control}
                label="Título do local"
                name="locationTitle"
                placeholder="Ex: Praça do Banco Redondo"
                required
              />

              <Textarea
                control={control}
                label="Endereço"
                name="address"
                placeholder="Digite o endereço completo"
                required
                rows={2}
              />

              <Input
                control={control}
                label="Copyright"
                name="copyright"
                placeholder="Ex: © 2026 InLaundry. Todos os direitos reservados."
                required
              />
            </Fieldset.Content>
          </Fieldset.Root>
        </Stack>
      </GridItem>

      <GridItem order={{ base: 2, lg: 2 }}>
        <FooterPreviewCard branding={branding} data={watchedData} />
      </GridItem>
    </Grid>
  )
}

const FooterForm = memo(FooterFormBase) as typeof FooterFormBase

export { FooterForm, type Props as FooterFormProps }
