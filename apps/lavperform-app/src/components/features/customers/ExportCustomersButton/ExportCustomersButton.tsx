import { Button } from '@chakra-ui/react'
import { useState } from 'react'
import { RiDownloadLine } from 'react-icons/ri'

import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import { customerService } from '@/services'
import { logger } from '@/utils/logger'

export function ExportCustomersButton() {
  const { selectedCompany } = useAuth()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!selectedCompany?.id || isExporting) return

    setIsExporting(true)

    try {
      const response = await customerService.exportCustomers(selectedCompany.id)
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'clientes.csv'
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
    <Button
      loading={isExporting}
      onClick={handleExport}
      variant="surface"
      w={{ base: 'full', md: 'auto' }}
    >
      <RiDownloadLine />
      Exportar
    </Button>
  )
}
