import { Box } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { markdownForDisplay } from '../PromptStudio/markdown-for-display'

type Props = {
  source: string
}

function SafeMarkdownBase({ source }: Props) {
  return (
    <Box
      css={{
        '& p': { margin: '0 0 0.5rem' },
        '& p:last-child': { marginBottom: 0 },
        '& ul, & ol': { margin: '0.25rem 0 0.5rem', paddingLeft: '1.25rem' },
        '& h1, & h2, & h3': { fontSize: '1rem', fontWeight: 600, margin: '0.5rem 0 0.25rem' },
        '& code': { fontSize: '0.9em' },
        '& pre': {
          overflowX: 'auto',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          background: 'var(--chakra-colors-bg-muted)',
        },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownForDisplay(source)}</ReactMarkdown>
    </Box>
  )
}

export { SafeMarkdownBase as SafeMarkdown }
