import {
  createToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  Toaster as ChakraToaster,
} from '@chakra-ui/react'

export const toaster = createToaster({
  placement: 'top-end',
  pauseOnPageIdle: true,
})

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster
        insetInline={{ mdDown: '4' }}
        toaster={toaster}
      >
        {(toast) => (
          <Toast.Root
            bg={
              toast.meta?.customStyle === 'yellowToast'
                ? 'yellow.400'
                : toast.type === 'success'
                  ? 'green.500'
                  : toast.type === 'error'
                    ? 'red.500'
                    : 'gray.500'
            }
            borderRadius="md"
            boxShadow="md"
            color={
              toast.meta?.customStyle === 'yellowToast'
                ? 'black'
                : toast.type === 'success'
                  ? 'white'
                  : toast.type === 'error'
                    ? 'white'
                    : 'white'
            }
            padding="4"
            width={{ md: 'sm' }}
          >
            {toast.type === 'loading' ? (
              <Spinner
                color="blue.solid"
                size="sm"
              />
            ) : (
              <Toast.Indicator />
            )}
            <Stack
              flex="1"
              gap="1"
              maxWidth="100%"
            >
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description>{toast.description}</Toast.Description>
              )}
            </Stack>
            {toast.action && (
              <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
            )}
            {toast.meta?.closable && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  )
}
