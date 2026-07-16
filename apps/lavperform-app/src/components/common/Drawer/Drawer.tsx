import { CloseButton, Drawer, Portal } from '@chakra-ui/react'
import { memo, PropsWithChildren, useEffect, useState } from 'react'

import { Props } from './Drawer.types'

const Title = ({ children }: PropsWithChildren) => {
  return (
    <Drawer.Header
      bg="bg.muted"
      borderBottomWidth="1px"
    >
      <Drawer.Title>{children}</Drawer.Title>
    </Drawer.Header>
  )
}

const CloseTrigger = () => {
  return (
    <Drawer.CloseTrigger asChild>
      <CloseButton variant="subtle" />
    </Drawer.CloseTrigger>
  )
}

const Body = ({ children }: PropsWithChildren) => {
  return <Drawer.Body py={6}>{children}</Drawer.Body>
}

const Footer = ({ children }: PropsWithChildren) => {
  return (
    <Drawer.Footer
      bg="bg.muted"
      borderTopWidth="1px"
      py="4"
    >
      {children}
    </Drawer.Footer>
  )
}

function DrawerComponent({
  children,
  closeTrigger = true,
  footer,
  title,
  trigger,
  size = 'md',
  isOpen = false,
  onOpenChange,
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
    <Drawer.Root
      closeOnInteractOutside={false}
      onOpenChange={handleOpenChange}
      open={open}
      size={size}
      {...rest}
    >
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            {title && <Title>{title}</Title>}
            <Body>{children}</Body>
            {footer && <Footer>{footer}</Footer>}
            {closeTrigger && <CloseTrigger />}
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}

const CustomDrawer = memo(DrawerComponent) as typeof DrawerComponent

export { CustomDrawer, type Props as CustomDrawerProps }
