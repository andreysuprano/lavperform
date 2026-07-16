import { Button, Dialog } from '@chakra-ui/react'
import { memo, useState } from 'react'
import { FiTrash2 } from 'react-icons/fi'

import { CustomDialog } from '@/components'
import { logger } from '@/utils/logger'

import { Props } from './DeleteConfirmationDialog.types'

export function DeleteConfirmationDialogComponent({
  description = 'Atenção, essa ação não pode ser desfeita.',
  isLoading,
  onClick,
  title,
  trigger = (
    <Button
      colorPalette="red"
      size="xs"
    >
      <FiTrash2 />
    </Button>
  ),
  confirmButton = (
    <>
      <FiTrash2 />
      Excluir
    </>
  ),
}: Props) {
  const [open, setOpen] = useState(false)

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await onClick()
      setOpen(false)
    } catch (error) {
      logger.error('Erro ao excluir:', error)
    }
  }

  return (
    <CustomDialog
      description={description}
      footer={
        <>
          <Dialog.ActionTrigger asChild>
            <Button
              variant="surface"
              onClick={(e) => e.stopPropagation()}
            >
              Cancelar
            </Button>
          </Dialog.ActionTrigger>
          <Button
            colorPalette="red"
            disabled={isLoading}
            loading={isLoading}
            onClick={handleDelete}
          >
            {confirmButton}
          </Button>
        </>
      }
      isOpen={open}
      onOpenChange={(e) => setOpen(e.open)}
      title={title}
      trigger={trigger}
    />
  )
}

const DeleteConfirmationDialog = memo(
  DeleteConfirmationDialogComponent
) as typeof DeleteConfirmationDialogComponent

export { DeleteConfirmationDialog, type Props as DeleteConfirmationDialogProps }
