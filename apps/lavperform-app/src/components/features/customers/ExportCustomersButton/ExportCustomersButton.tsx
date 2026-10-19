import { Button, Menu, Portal } from '@chakra-ui/react'
import { useState } from 'react'
import { RiDownloadLine } from 'react-icons/ri'

import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import { customerService } from '@/services'
import { logger } from '@/utils/logger'

type ExportFormat = 'csv' | 'xlsx'

export function ExportCustomersButton() {
  const { selectedCompany } = useAuth()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: ExportFormat) => {
    if (!selectedCompany?.id || isExporting) return

    setIsExporting(true)

    try {
      const response = await customerService.exportCustomers(
        selectedCompany.id,
        format
      )
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data])
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = format === 'xlsx' ? 'clientes.xlsx' : 'clientes.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      logger.error('Erro ao exportar clientes:', error)
      toaster.create({
        title: 'Erro!',
        description: 'Não foi possível exportar a base de clientes.',
        type: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          loading={isExporting}
          variant="surface"
          w={{ base: 'full', md: 'auto' }}
        >
          <RiDownloadLine />
          Exportar
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item
              onClick={() => handleExport('csv')}
              value="csv"
            >
              CSV
            </Menu.Item>
            <Menu.Item
              onClick={() => handleExport('xlsx')}
              value="xlsx"
            >
              XLS
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
