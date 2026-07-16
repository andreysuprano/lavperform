import { AspectRatio, Box } from '@chakra-ui/react'
import { memo } from 'react'

import type { Props } from './YouTubePlayer.types'

function YouTubePlayerBase({
  videoUrl,
  title,
  aspectRatio = 16 / 9,
  maxWidth = { base: '100%', sm: '600px', md: '800px' },
}: Props) {
  return (
    <Box
      bg="bg.muted"
      borderRadius="md"
      width="100%"
    >
      <Box
        display="flex"
        justifyContent="center"
        width="100%"
      >
        <AspectRatio
          maxW={maxWidth}
          ratio={aspectRatio}
          width="100%"
        >
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            src={videoUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title={title}
          />
        </AspectRatio>
      </Box>
    </Box>
  )
}

const YouTubePlayer = memo(YouTubePlayerBase) as typeof YouTubePlayerBase

export { YouTubePlayer, type Props as YouTubePlayerProps }
