import { HoverCard, Portal } from '@chakra-ui/react'
import { memo, useState } from 'react'

import { LazyImage } from '@/components'

import { Props } from './ZoomableImage.types'

const ZoomableImageComponent = ({
  src,
  alt,
  minBoxSize = '60px',
  maxBoxSize = '200px',
}: Props) => {
  const [open, setOpen] = useState(false)

  return (
    <HoverCard.Root
      closeDelay={100}
      onOpenChange={(e) => setOpen(e.open)}
      open={open}
      openDelay={300}
      size="sm"
    >
      <HoverCard.Trigger asChild>
        <LazyImage
          alt={alt}
          boxSize={minBoxSize}
          fit="cover"
          rounded="md"
          src={src}
        />
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner>
          <HoverCard.Content maxWidth="240px">
            <HoverCard.Arrow />
            <LazyImage
              alt={alt}
              boxSize={maxBoxSize}
              fit="cover"
              rounded="md"
              src={src}
            />
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  )
}

const ZoomableImage = memo(ZoomableImageComponent)

export { ZoomableImage, type Props as ZoomableImageProps }
