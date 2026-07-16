import { Box, Image as ChakraImage, Skeleton } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'

import { Props } from './LazyImage.types'

function LazyImage({
  src,
  alt,
  placeholderSrc,
  threshold = 0.1,
  ...rest
}: Props) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if ('loading' in HTMLImageElement.prototype) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      { threshold }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  const imageSrc = isInView ? src : placeholderSrc || src

  return (
    <Box
      position="relative"
      {...rest}
    >
      {!isLoaded && !hasError && (
        <Skeleton
          bottom={0}
          left={0}
          position="absolute"
          right={0}
          top={0}
        />
      )}
      <ChakraImage
        alt={alt}
        loading="lazy"
        onError={() => setHasError(true)}
        onLoad={() => setIsLoaded(true)}
        opacity={isLoaded ? 1 : 0}
        ref={imgRef}
        src={imageSrc}
        transition="opacity 0.3s ease-in-out"
        {...rest}
      />
    </Box>
  )
}

function useImagePreload(imageUrls: string[]) {
  useEffect(() => {
    imageUrls.forEach((url) => {
      const img = new Image()
      img.src = url
    })
  }, [imageUrls])
}

export { LazyImage, type Props as LazyImageProps, useImagePreload }
