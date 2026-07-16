export interface Props {
  isOpen: boolean
  onOpenChange: (details: { open: boolean }) => void
  onSuccess?: () => void
}
