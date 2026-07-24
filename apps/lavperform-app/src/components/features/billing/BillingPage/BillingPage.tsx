import { Flex, Heading, Stack } from '@chakra-ui/react'
import { useState } from 'react'

import {
  AddCreditCardForm,
  BillingInfoCard,
  InvoiceDetailsDrawer,
  InvoiceTable,
  PaymentMethodCard,
  SubscriptionTable,
} from '@/components'
import type { InvoiceItem } from '@/components/features/billing/InvoiceDetailsDrawer/InvoiceDetailsDrawer.types'
import { useSettingsAccountLogic } from '@/hooks/useSettingsAccountLogic'

export function BillingPage() {
  const {
    company,
    subscription,
    assas,
    isLoading,
    handleLimitChange,
    handlePageChange,
    isLastInvoiceBoletoOrPix,
    subscriptionCard,
    hasCard,
    allowBoleto,
    allowPix,
    planAllowsAlternativePayments,
    alternativePaymentLabel,
    register,
    control,
    handleSubmit,
    handleSave,
    handleValidationErrors,
  } = useSettingsAccountLogic()

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(
    null
  )
  const [isAddCardFormOpen, setIsAddCardFormOpen] = useState(false)

  return (
    <>
      <Stack
        gap={4}
        mb={4}
      >
        <Heading
          fontWeight="bold"
          size="lg"
        >
          Assinaturas e Faturamento
        </Heading>
      </Stack>

      <Flex
        alignItems="flex-start"
        direction={['column', 'column', 'column', 'row']}
        gap={6}
      >
        {/* Coluna Esquerda: Tabelas */}
        <Stack
          gap={8}
          w={['100%', '100%', '100%', '70%']}
        >
          <SubscriptionTable
            companyName={company?.name}
            data={subscription}
            isLoading={isLoading}
            onItemClick={setSelectedInvoice}
            onLimitChange={handleLimitChange}
            onPageChange={handlePageChange}
          />

          <Stack gap={4}>
            <Heading
              fontWeight="bold"
              size="lg"
            >
              Faturas
            </Heading>
            <InvoiceTable
              data={assas}
              isLoading={isLoading}
              onItemClick={setSelectedInvoice}
              onLimitChange={handleLimitChange}
              onPageChange={handlePageChange}
            />
          </Stack>
        </Stack>

        {/* Coluna Direita: Cards */}
        <Stack
          gap={6}
          w={['100%', '100%', '100%', '30%']}
        >
          <PaymentMethodCard
            allowBoleto={allowBoleto}
            allowPix={allowPix}
            alternativePaymentLabel={alternativePaymentLabel}
            hasCard={!!hasCard}
            isLoading={isLoading}
            onAddCard={() => setIsAddCardFormOpen(true)}
            planAllowsAlternativePayments={planAllowsAlternativePayments}
            subscriptionCard={subscriptionCard}
          />
          <BillingInfoCard company={company} />
        </Stack>
      </Flex>

      {/* Modais/Drawers */}
      <InvoiceDetailsDrawer
        allowBoleto={allowBoleto}
        allowPix={allowPix}
        alternativePaymentLabel={alternativePaymentLabel}
        company={company}
        data={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        planAllowsAlternativePayments={planAllowsAlternativePayments}
      />

      <AddCreditCardForm
        control={control}
        handleSubmit={handleSubmit}
        isLastInvoiceBoletoOrPix={isLastInvoiceBoletoOrPix}
        isLoading={isLoading}
        isOpen={isAddCardFormOpen}
        onOpenChange={setIsAddCardFormOpen}
        onSave={handleSave}
        onValidationError={handleValidationErrors}
        register={register}
      />
    </>
  )
}
