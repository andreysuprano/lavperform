import { Button, Icon, Stack, Text, VStack } from '@chakra-ui/react'
import { Component, type ErrorInfo } from 'react'
import { LuRefreshCw, LuTriangleAlert } from 'react-icons/lu'

import { logger } from '@/utils/logger'

import { Props } from './ErrorBoundary.types'

type State = {
  hasError: boolean
}

/**
 * Captura erros de renderização não tratados em sua árvore de filhos e exibe
 * uma tela amigável no lugar da tela em branco que o React deixa quando um
 * erro de render sobe sem tratamento (comportamento padrão do React 18+).
 *
 * Error boundaries só podem ser implementados como componentes de classe
 * (não há equivalente em hooks até o momento).
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Erro não tratado capturado pelo ErrorBoundary:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <VStack
          gap={4}
          justify="center"
          minH="50vh"
          px={6}
          py={16}
          textAlign="center"
        >
          <Icon
            as={LuTriangleAlert}
            boxSize={10}
            color="red.500"
          />
          <Stack gap={1}>
            <Text
              fontSize="lg"
              fontWeight="semibold"
            >
              {this.props.fallbackTitle ?? 'Ops, algo deu errado'}
            </Text>
            <Text
              color="fg.muted"
              fontSize="sm"
              maxW="440px"
            >
              {this.props.fallbackDescription ??
                'Ocorreu um erro inesperado nesta tela. Recarregue a página para continuar; se o problema persistir, entre em contato com o suporte.'}
            </Text>
          </Stack>
          <Button onClick={this.handleReload}>
            <LuRefreshCw />
            Recarregar página
          </Button>
        </VStack>
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary }
