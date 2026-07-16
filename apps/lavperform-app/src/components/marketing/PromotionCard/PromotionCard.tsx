import { Button, Card, Link } from '@chakra-ui/react'
import { RiArrowRightLine } from 'react-icons/ri'

import { LazyImage } from '@/components'

import { Props } from './PromotionCard.types'

function PromotionCard({ image, isCard = false, title, href }: Props) {
  return isCard ? (
    <Card.Root
      maxW="sm"
      overflow="hidden"
    >
      <LazyImage
        alt={title}
        objectFit="cover"
        src={image}
      />
      <Button
        asChild
        variant="plain"
        w="full"
      >
        <Link
          href={href}
          target="_blank"
        >
          Saber mais
          <RiArrowRightLine />
        </Link>
      </Button>
    </Card.Root>
  ) : (
    <Link
      href={href}
      target="_blank"
    >
      <LazyImage
        alt={title}
        objectFit="cover"
        src={image}
      />
    </Link>
  )
}

export { PromotionCard, type Props as PromotionCardProps }
