import { Clipboard, IconButton } from '@chakra-ui/react'
import { memo } from 'react'

function ClipboardIconButtonBase() {
  return (
    <Clipboard.Trigger asChild>
      <IconButton
        aria-label="Copiar"
        me="-2"
        size="xs"
        variant="surface"
      >
        <Clipboard.Indicator />
      </IconButton>
    </Clipboard.Trigger>
  )
}

const ClipboardIconButton = memo(ClipboardIconButtonBase)

export { ClipboardIconButton }
