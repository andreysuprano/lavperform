import { Badge, Card, CloseButton, IconButton, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { RiEditLine } from 'react-icons/ri'

import { useWhiteLabel } from '@/config'
import type { CompanyCoupon } from '@/types'

export type CampaignCouponCardProps = {
  coupon: CompanyCoupon
  isSelected?: boolean
  onSelect?: (id: string) => void
  /** Remover seleção (X no canto do card, ex. campanha). */
  onClearSelection?: () => void
  /** Abrir form de edição do cupom (apenas no modo static). */
  onEdit?: () => void
  /** selecionável (campanha) vs só leitura (página de listagem) */
  mode?: 'selectable' | 'static'
}

function CampaignCouponCardBase({
  coupon,
  isSelected,
  onSelect,
  onClearSelection,
  onEdit,
  mode = 'selectable',
}: CampaignCouponCardProps) {
  const { colors } = useWhiteLabel()
  const interact = mode === 'selectable' && onSelect
  const showClear =
    Boolean(isSelected && onClearSelection && mode === 'selectable')
  const showEdit = mode === 'static' && !!onEdit

  return (
    <Card.Root
      borderColor={isSelected ? colors.primary : 'border.subtle'}
      borderWidth="1px"
      cursor={interact ? 'pointer' : 'default'}
      onClick={interact ? () => onSelect(coupon.id) : undefined}
      position="relative"
      size="sm"
      transition="border-color 0.15s ease"
      variant="subtle"
    >
      {showClear && (
        <CloseButton
          aria-label="Remover cupom"
          colorPalette="red"
          onClick={(e) => {
            e.stopPropagation()
            onClearSelection?.()
          }}
          position="absolute"
          right={1}
          size="sm"
          top={1}
          variant="solid"
          zIndex={1}
        />
      )}
      {showEdit && (
        <IconButton
          aria-label="Editar cupom"
          colorPalette="gray"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          position="absolute"
          right={1}
          size="sm"
          top={1}
          variant="ghost"
          zIndex={1}
        >
          <RiEditLine />
        </IconButton>
      )}
      <Card.Body gap={2}>
        <Stack
          align="center"
          direction="row"
          justify="space-between"
          pe={showClear || showEdit ? 8 : 0}
        >
          <Text
            fontWeight="semibold"
            lineClamp={1}
          >
            {coupon.code}
          </Text>
          {coupon.active ? (
            <Badge
              colorPalette="green"
              size="sm"
            >
              Ativo
            </Badge>
          ) : (
            <Badge
              colorPalette="gray"
              size="sm"
            >
              Inativo
            </Badge>
          )}
        </Stack>
        {!!coupon.description && (
          <Text
            color="fg.muted"
            fontSize="sm"
            lineClamp={3}
          >
            {coupon.description}
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  )
}

const CampaignCouponCard = memo(
  CampaignCouponCardBase
) as typeof CampaignCouponCardBase

export { CampaignCouponCard }
