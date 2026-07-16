import {
  Box,
  Button,
  Code,
  Flex,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import Papa from 'papaparse'
import { useState } from 'react'
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDownloadLine,
  RiInformationLine,
  RiUploadLine,
} from 'react-icons/ri'

import { CustomDrawer, FileUploadInput } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { customerService } from '@/services'
import type { CustomerImport } from '@/types'
import { ClientTypes } from '@/utils/constants/clientType'
import { logger } from '@/utils/logger'

import { FormattedCustomer } from './ImportCustomersWizard.types'

export function ImportCustomersWizard() {
  const { selectedCompany } = useAuth()

  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle')
  const [importedData, setImportedData] = useState<FormattedCustomer[]>([])
  const [importError, setImportError] = useState<string>('')
  const [parsedData, setParsedData] = useState<any[] | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [totalProcessed, setTotalProcessed] = useState(0)

  const formatCustomerData = (csvData: any[]): FormattedCustomer[] => {
    return csvData.map((customer) => ({
      name: customer.nome || null,
      phone: customer.telefone || null,
      email: customer.email || null,
      birthDate: customer.data_nascimento || null,
      firstOrderDate: customer.data_primeiro_pedido || null,
      rfvClassification: ClientTypes.Novo,
      gender: customer.genero || null,
      observations: customer.observacoes || null,
      whatsappOptin: true,
      averageTicket: customer.valor_medio_ticket
        ? parseFloat(customer.valor_medio_ticket)
        : 0,
      address: {
        street: customer.rua || null,
        number: customer.numero || null,
        complement: customer.complemento || null,
        neighborhood: customer.bairro || null,
        city: customer.cidade || null,
        state: customer.estado || null,
        zipCode: customer.cep || null,
      },
    }))
  }

  const handleFileSelect = async (file: File) => {
    setImportStatus('idle')
    setImportError('')

    try {
      // Configuração do Papa Parse
      const config = {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          const { data, errors } = results

          if (errors.length > 0) {
            throw new Error(
              `Erro na linha ${errors[0].row}: ${errors[0].message}`
            )
          }

          // Valida os dados
          if (!data || data.length === 0) {
            throw new Error('Arquivo vazio ou formato inválido')
          }

          // Verifica se todos os campos obrigatórios estão presentes
          const requiredFields = ['nome', 'telefone']
          const missingFields = requiredFields.filter(
            // eslint-disable-next-line no-prototype-builtins
            (field) => !data[0].hasOwnProperty(field)
          )

          if (missingFields.length > 0) {
            throw new Error(
              `Campos obrigatórios ausentes: ${missingFields.join(', ')}`
            )
          }

          setParsedData(data)
          setImportStatus('idle')
        },
        error: (error: Papa.ParseError) => {
          throw new Error(`Erro ao processar arquivo: ${error.message}`)
        },
      }

      // Inicia o parsing do arquivo
      Papa.parse(await file.text(), config)
    } catch (error) {
      logger.error('Erro ao processar arquivo:', error)
      setImportStatus('error')
      setImportError(
        error instanceof Error ? error.message : 'Erro desconhecido'
      )
      setParsedData(null)
    }
  }

  const processBatch = async (
    customers: FormattedCustomer[],
    startIndex: number,
    batchSize: number
  ) => {
    const endIndex = Math.min(startIndex + batchSize, customers.length)
    const batch = customers.slice(startIndex, endIndex)

    await customerService.importCustomers(
      selectedCompany!.id,
      batch as CustomerImport[]
    )

    const newProcessed = totalProcessed + batch.length
    setTotalProcessed(newProcessed)
    setImportProgress((newProcessed / customers.length) * 100)
  }

  const handleImport = async () => {
    if (!parsedData || !selectedCompany?.id) return

    setImportStatus('uploading')
    setIsImporting(true)
    setImportProgress(0)
    setTotalProcessed(0)

    try {
      // Formata os dados para o formato do backend
      const formattedData = formatCustomerData(parsedData)
      const BATCH_SIZE = 150
      const totalBatches = Math.ceil(formattedData.length / BATCH_SIZE)

      for (let i = 0; i < totalBatches; i++) {
        await processBatch(formattedData, i * BATCH_SIZE, BATCH_SIZE)
      }

      setImportedData(formattedData)
      setImportStatus('success')
    } catch (error) {
      logger.error('Erro ao importar dados:', error)
      setImportStatus('error')
      setImportError(
        error instanceof Error ? error.message : 'Erro desconhecido'
      )
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const csvContent =
      'nome,telefone,email,data_nascimento,data_primeiro_pedido,genero,observacoes,valor_medio_ticket,rua,numero,complemento,bairro,cidade,estado,cep\nJoão Silva,(14) 99299-9909,joao@exemplo.com,1990-01-01,2023-01-01,M,Cliente prefere entrega após as 18h,,Av. Paulista,1000,Apto 123,Bela Vista,São Paulo,SP,01310-100'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'modelo_clientes.csv'
    link.click()
  }

  return (
    <CustomDrawer
      closeTrigger
      size="sm"
      title="Importar clientes"
      trigger={
        <Button
          variant="surface"
          w={{ base: 'full', md: 'auto' }}
        >
          <RiUploadLine />
          Importar
        </Button>
      }
    >
      <VStack
        align="stretch"
        gap={4}
      >
        <Box>
          <Text
            fontWeight="bold"
            mb={2}
          >
            Instruções:
          </Text>
          <VStack
            align="stretch"
            gap={2}
          >
            <HStack>
              <Icon
                as={RiInformationLine}
                color="blue.500"
              />
              <Text>O arquivo deve estar no formato CSV</Text>
            </HStack>
            <HStack>
              <Icon
                as={RiInformationLine}
                color="blue.500"
              />
              <Text>Use vírgula como separador</Text>
            </HStack>
            <HStack>
              <Icon
                as={RiInformationLine}
                color="blue.500"
              />
              <Text>Mantenha a ordem das colunas conforme abaixo</Text>
            </HStack>
          </VStack>
        </Box>
        <Box
          borderColor="gray.200"
          borderTopWidth="1px"
          pt={4}
        >
          <Text
            fontWeight="bold"
            mb={2}
          >
            Campos do CSV:
          </Text>
          <Box
            bg={{ base: 'bg.subtle', _dark: 'bg.emphasized' }}
            borderRadius="md"
            p={4}
          >
            <VStack
              align="stretch"
              gap={4}
            >
              <Box>
                <Text
                  color="primary"
                  fontWeight="bold"
                  mb={2}
                >
                  Dados Pessoais
                </Text>
                <SimpleGrid
                  columns={2}
                  gap={2}
                >
                  <Code>nome</Code>
                  <Code>telefone</Code>
                  <Code>email</Code>
                  <Code>data_nascimento</Code>
                  <Code>data_primeiro_pedido</Code>
                  <Code>genero</Code>
                  <Code>observacoes</Code>
                  <Code>valor_medio_ticket</Code>
                </SimpleGrid>
              </Box>
              <Box>
                <Text
                  color="primary"
                  fontWeight="bold"
                  mb={2}
                >
                  Endereço
                </Text>
                <SimpleGrid
                  columns={2}
                  gap={2}
                >
                  <Code>rua</Code>
                  <Code>numero</Code>
                  <Code>complemento</Code>
                  <Code>bairro</Code>
                  <Code>cidade</Code>
                  <Code>estado</Code>
                  <Code>cep</Code>
                </SimpleGrid>
              </Box>
            </VStack>
          </Box>
        </Box>
        <Button
          colorScheme="blue"
          onClick={handleDownloadTemplate}
          variant="outline"
        >
          <Icon
            as={RiDownloadLine}
            color="blue.500"
          />
          Baixar CSV Modelo
        </Button>
        {importStatus === 'idle' && parsedData && (
          <Flex
            bg="blue.50"
            borderRadius="md"
            flexDirection="column"
            p={4}
          >
            <HStack>
              <Icon
                as={RiInformationLine}
                color="blue.500"
              />
              <Text
                color="blue.700"
                fontWeight="bold"
              >
                Arquivo pronto para importação
              </Text>
            </HStack>
            <Text
              color="blue.600"
              fontSize="sm"
              mb={4}
            >
              Encontramos {parsedData.length} clientes no arquivo.
            </Text>
            <Button
              colorScheme="blue"
              loading={isImporting}
              onClick={handleImport}
            >
              Importar Clientes
            </Button>
          </Flex>
        )}
        {importStatus === 'uploading' && (
          <Flex
            bg="blue.50"
            borderRadius="md"
            flexDirection="column"
            p={4}
          >
            <HStack>
              <Icon
                as={RiCheckboxCircleLine}
                color="blue.500"
              />
              <Text
                color="blue.700"
                fontWeight="bold"
              >
                Importando arquivo...
              </Text>
            </HStack>
            <Text
              color="blue.600"
              fontSize="sm"
              mb={2}
            >
              Processando {totalProcessed} de {parsedData?.length} clientes
            </Text>
            <Box
              bg="gray.100"
              borderRadius="md"
              h="8px"
              overflow="hidden"
              w="100%"
            >
              <Box
                bg="blue.500"
                h="100%"
                transition="width 0.3s ease"
                w={`${importProgress}%`}
              />
            </Box>
          </Flex>
        )}
        {importStatus === 'success' && (
          <Flex
            bg="green.50"
            borderRadius="md"
            flexDirection="column"
            p={4}
          >
            <HStack>
              <Icon
                as={RiCheckboxCircleLine}
                color="green.500"
              />
              <Text
                color="green.700"
                fontWeight="bold"
              >
                Arquivo recebido com sucesso!
              </Text>
            </HStack>
            <Text
              color="green.600"
              fontSize="sm"
            >
              Encontramos {importedData.length} clientes no arquivo. Você será
              notificado quando a importação for concluída.
            </Text>
          </Flex>
        )}
        {importStatus === 'error' && (
          <Flex
            bg="red.50"
            borderRadius="md"
            flexDirection="column"
            p={4}
          >
            <HStack>
              <Icon
                as={RiCloseCircleLine}
                color="red.500"
              />
              <Text
                color="red.700"
                fontWeight="bold"
              >
                Erro ao importar arquivo
              </Text>
            </HStack>
            <Text
              color="red.600"
              fontSize="sm"
            >
              {importError ||
                'Ocorreu um erro durante a importação. Por favor, tente novamente.'}
            </Text>
          </Flex>
        )}
        {importStatus !== 'uploading' && (
          <FileUploadInput onFileSelect={handleFileSelect} />
        )}
      </VStack>
    </CustomDrawer>
  )
}
