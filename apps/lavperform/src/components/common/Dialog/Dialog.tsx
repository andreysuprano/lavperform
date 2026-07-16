import { Box, CloseButton, Dialog, Portal } from '@chakra-ui/react'
import { memo, PropsWithChildren, useEffect, useState } from 'react'

import { Props } from './Dialog.types'

const Title = ({ children }: PropsWithChildren) => {
  return (
    <Dialog.Header
      bg="bg.muted"
      borderBottomWidth="1px"
    >
      <Dialog.Title>{children}</Dialog.Title>
    </Dialog.Header>
  )
}

const CloseTrigger = () => {
  return (
    <Dialog.CloseTrigger asChild>
      <CloseButton variant="subtle" />
    </Dialog.CloseTrigger>
  )
}

const Body = ({ children }: PropsWithChildren) => {
  return <Dialog.Body py={6}>{children}</Dialog.Body>
}

const Footer = ({ children }: PropsWithChildren) => {
  return (
    <Dialog.Footer
      bg="bg.muted"
      borderTopWidth="1px"
      py="4"
    >
      {children}
    </Dialog.Footer>
  )
}

export function DialogComponent({
  closeTrigger = true,
  content = null,
  contentMaxW,
  description,
  footer,
  isOpen = false,
  onOpenChange,
  title,
  trigger,
  ...rest
}: Props) {
  const [open, setOpen] = useState(isOpen)

  useEffect(() => {
    setOpen(isOpen)
  }, [isOpen])

  const handleOpenChange = (e: { open: boolean }) => {
    setOpen(e.open)
    onOpenChange?.(e)
  }

  return (
    <Dialog.Root
      closeOnInteractOutside={false}
      onOpenChange={handleOpenChange}
      open={open}
      {...rest}
    >
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW={contentMaxW}
            display="flex"
            flexDirection="column"
            overflow="hidden"
          >
            {title && <Title>{title}</Title>}
            <Box
              flex={1}
              minH={0}
              overflow="auto"
              w="full"
            >
              {content ? content : <Body>{description}</Body>}
            </Box>
            {footer && <Footer>{footer}</Footer>}
            {closeTrigger && <CloseTrigger />}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const CustomDialog = memo(DialogComponent) as typeof DialogComponent

export { CustomDialog, type Props as CustomDialogProps }
