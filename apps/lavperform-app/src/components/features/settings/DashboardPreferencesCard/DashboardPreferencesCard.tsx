import { Card, Switch, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import { companyService } from '@/services'
import type { Company } from '@/types'
import { logger } from '@/utils/logger'

function buildCompanyUpdatePayload(
  company: Company,
  showTodayPurchases: boolean
) {
  return {
    name: company.name,
    cnpj: company.cnpj,
    email: company.email,
    phone: company.phone,
    address: {
      zipCode: company.address.zipCode,
      street: company.address.street,
      number: company.address.number,
      complement: company.address.complement,
      neighborhood: company.address.neighborhood,
      city: company.address.city,
      state: company.address.state,
    },
    showTodayPurchases,
  }
}

export function DashboardPreferencesCard() {
  const { selectedCompany, updateCompanyFlags } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadCompanyData = useCallback(async () => {
    if (!selectedCompany?.id) return

    try {
      const response = await companyService.getCompany(selectedCompany.id)
      setCompany(response.data)
    } catch (error) {
      logger.error('Erro ao carregar preferências da dashboard:', error)
    }
  }, [selectedCompany?.id])

  useEffect(() => {
    loadCompanyData()
  }, [loadCompanyData])

  const isChecked = company?.showTodayPurchases === true

  const handleToggle = async ({ checked }: { checked: boolean }) => {
    if (!selectedCompany?.id || !company || isSaving) return

    const previous = isChecked
    setCompany({ ...company, showTodayPurchases: checked })
    updateCompanyFlags(selectedCompany.id, { showTodayPurchases: checked })
    setIsSaving(true)

    try {
      await companyService.updateCompany(
        selectedCompany.id,
        buildCompanyUpdatePayload(company, checked)
      )
    } catch (error) {
      logger.error('Erro ao salvar preferência de compras do dia:', error)
      setCompany({ ...company, showTodayPurchases: previous })
      updateCompanyFlags(selectedCompany.id, { showTodayPurchases: previous })
      toaster.create({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar a lista de compras do dia.',
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!company) {
    return null
  }

  return (
    <Card.Root size="sm">
      <Card.Header>
        <Card.Title>Dashboard</Card.Title>
      </Card.Header>
      <Card.Body>
        <Switch.Root
          checked={isChecked}
          colorPalette="green"
          disabled={isSaving}
          onCheckedChange={handleToggle}
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>
            <Text fontWeight="medium">Mostrar compras do dia</Text>
            <Text
              color="fg.muted"
              fontSize="sm"
              fontWeight="normal"
            >
              Quando ligado, a lista de compras do dia aparece na home. O admin
              também pode alterar essa opção; vale a última alteração.
            </Text>
          </Switch.Label>
        </Switch.Root>
      </Card.Body>
    </Card.Root>
  )
}
