import { Box, Flex, IconButton } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'

import { useWhiteLabel } from '@/config'

import type { CarouselItem, Props } from './Carousel.types'

function CarouselBase<T extends CarouselItem>({
  items,
  renderItem,
  autoPlayInterval = 5000,
  showControls = true,
  showIndicators = true,
  onItemChange,
  height = { base: '300px', md: '400px' },
  pauseOnHover = true,
}: Props<T>) {
  const { colorPalette } = useWhiteLabel()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const sortedItems = useMemo(
    () =>
      items && items.length > 0
        ? [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [],
    [items]
  )

  const handlePrevious = useCallback(() => {
    if (!sortedItems.length) return
    const newIndex =
      currentIndex === 0 ? sortedItems.length - 1 : currentIndex - 1
    setCurrentIndex(newIndex)
    onItemChange?.(newIndex, sortedItems[newIndex])
  }, [currentIndex, sortedItems, onItemChange])

  const handleNext = useCallback(() => {
    if (!sortedItems.length) return
    const newIndex =
      currentIndex === sortedItems.length - 1 ? 0 : currentIndex + 1
    setCurrentIndex(newIndex)
    onItemChange?.(newIndex, sortedItems[newIndex])
  }, [currentIndex, sortedItems, onItemChange])

  const handleIndicatorClick = useCallback(
    (index: number) => {
      setCurrentIndex(index)
      onItemChange?.(index, sortedItems[index])
    },
    [sortedItems, onItemChange]
  )

  // Auto-play
  useEffect(() => {
    if (!sortedItems.length || sortedItems.length <= 1 || !autoPlayInterval)
      return

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) =>
          prev === sortedItems.length - 1 ? 0 : prev + 1
        )
      }, autoPlayInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sortedItems.length, autoPlayInterval, isPaused])

  if (!sortedItems.length) {
    return null
  }

  const currentItem = sortedItems[currentIndex]

  return (
    <Box
      bg="bg.subtle"
      borderRadius="lg"
      h={height}
      onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
      overflow="hidden"
      position="relative"
      w="100%"
    >
      {/* Conteúdo do Item */}
      <Box
        h="100%"
        position="relative"
        w="100%"
      >
        {renderItem(currentItem, currentIndex)}
      </Box>

      {/* Controles de Navegação */}
      {showControls && sortedItems.length > 1 && (
        <>
          <IconButton
            _hover={{ bg: 'bg.emphasized' }}
            aria-label="Anterior"
            bg="bg"
            color="bg.inverted"
            display={{ base: 'none', md: 'inline-flex' }}
            left={4}
            onClick={handlePrevious}
            position="absolute"
            size="md"
            top="50%"
            transform="translateY(-50%)"
            variant="solid"
          >
            <RiArrowLeftSLine size={24} />
          </IconButton>
          <IconButton
            _hover={{ bg: 'bg.emphasized' }}
            aria-label="Próximo"
            bg="bg"
            color="bg.inverted"
            display={{ base: 'none', md: 'inline-flex' }}
            onClick={handleNext}
            position="absolute"
            right={4}
            size="md"
            top="50%"
            transform="translateY(-50%)"
            variant="solid"
          >
            <RiArrowRightSLine size={24} />
          </IconButton>
        </>
      )}

      {/* Indicadores */}
      {showIndicators && sortedItems.length > 1 && (
        <Flex
          bottom={4}
          gap={2}
          justifyContent="center"
          left="50%"
          position="absolute"
          transform="translateX(-50%)"
        >
          {sortedItems.map((_, index) => (
            <Box
              _hover={{
                bg: index === currentIndex ? `${colorPalette}.600` : 'gray.400',
              }}
              bg={index === currentIndex ? `${colorPalette}.400` : 'white'}
              borderRadius="full"
              cursor="pointer"
              h="5px"
              key={index}
              onClick={() => handleIndicatorClick(index)}
              transition="all 0.2s"
              w="20px"
            />
          ))}
        </Flex>
      )}
    </Box>
  )
}

const Carousel = memo(CarouselBase) as typeof CarouselBase

export { Carousel, type CarouselItem, type Props as CarouselProps }
