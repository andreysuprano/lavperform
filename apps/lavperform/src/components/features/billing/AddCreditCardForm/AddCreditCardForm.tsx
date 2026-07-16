import {
  Alert,
  Button,
  Dialog,
  Fieldset,
  Flex,
  Separator,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiSaveLine } from 'react-icons/ri'

import { CustomDrawer, Input } from '@/components'

import { Props } from './AddCreditCardForm.types'

function AddCreditCardFormComponent({
  isOpen,
  isLoading,
  isLastInvoiceBoletoOrPix,
  onOpenChange,
  register,
  control,
  handleSubmit,
  onSave,
  onValidationError,
}: Props) {
  return (
    <CustomDrawer
      footer={
        <>
          <Dialog.ActionTrigger asChild>
            <Button variant="surface">Cancelar</Button>
          </Dialog.ActionTrigger>
          <Dialog.ActionTrigger asChild>
            <Button
              disabled={isLoading}
              form="add-credit-card-form"
              loading={isLoading}
              type="submit"
            >
              <RiSaveLine />
              Salvar
            </Button>
          </Dialog.ActionTrigger>
        </>
      }
      isOpen={isOpen}
      onOpenChange={(e) => onOpenChange(e.open)}
      title="Adicionar cartão de crédito"
    >
      <Stack
        as="form"
        gap={6}
        id="add-credit-card-form"
        onSubmit={handleSubmit(onSave, onValidationError)}
      >
        <Fieldset.Root>
          <Fieldset.Content>
            {isLastInvoiceBoletoOrPix && (
              <Alert.Root
                borderRadius="md"
                status="warning"
                variant="surface"
              >
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    <strong>Atenção!</strong> <br />A fatura será debitada no
                    cartão apenas no próximo mês.
                  </Alert.Title>
                </Alert.Content>
              </Alert.Root>
            )}
            <Fieldset.Legend mb={4}>
              <Text fontSize={'md'}>Dados do Cartão de Crédito</Text>
            </Fieldset.Legend>
            <Input
              control={control}
              label="Nome do Titular no Cartão"
              placeholder="Ex: João M. Silva"
              required
              {...register('creditCard.name')}
            />
            <Input
              control={control}
              label="Número do Cartão"
              maxLength={19}
              placeholder="0000 0000 0000 0000"
              required
              {...register('creditCard.number')}
            />
            <Flex gap={2}>
              <Input
                control={control}
                label="Mês (MM)"
                maxLength={2}
                placeholder="MM"
                required
                {...register('creditCard.expiryMonth')}
                w="90%"
              />
              <Input
                control={control}
                label="Ano (AA)"
                maxLength={2}
                placeholder="AA"
                required
                {...register('creditCard.expiryYear')}
                w="90%"
              />
              <Input
                control={control}
                label="CVV"
                maxLength={4}
                placeholder="Ex: 123"
                required
                {...register('creditCard.ccv')}
                w="90%"
              />
            </Flex>
          </Fieldset.Content>
          <Separator />
          <Fieldset.Content>
            <Fieldset.Legend>
              Informações do Titular (Dados Pessoais)
            </Fieldset.Legend>
            <Input
              control={control}
              label="Nome Completo"
              placeholder="Nome Completo do Titular"
              required
              {...register('creditCardHolderInfo.name_holder')}
            />
            <Input
              control={control}
              label="E-mail"
              placeholder="exemplo@dominio.com"
              required
              {...register('creditCardHolderInfo.email')}
            />
            <Input
              control={control}
              label="CPF/CNPJ"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              required
              {...register('creditCardHolderInfo.cpfCnpj')}
            />
            <Input
              control={control}
              label="CEP"
              maxLength={9}
              placeholder="Digite o seu CEP - (00000-000)"
              required
              {...register('creditCardHolderInfo.postalCode')}
            />
            <Input
              control={control}
              label="Número do Endereço"
              placeholder="Ex: 123"
              required
              {...register('creditCardHolderInfo.addressNumber')}
            />
            <Input
              control={control}
              label="Telefone"
              maxLength={15}
              placeholder="(99) 99999-9999"
              required
              {...register('creditCardHolderInfo.phone')}
            />
          </Fieldset.Content>
        </Fieldset.Root>
      </Stack>
    </CustomDrawer>
  )
}

const AddCreditCardForm = memo(
  AddCreditCardFormComponent
) as typeof AddCreditCardFormComponent

export { AddCreditCardForm, type Props as AddCreditCardFormProps }
