import { Box, Field } from '@chakra-ui/react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import { memo } from 'react'

import { useColorMode } from '@/components/ui/color-mode'

interface MarkdownFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  height?: number
  placeholder?: string
}

function MarkdownFieldBase({
  label,
  value,
  onChange,
  height = 260,
  placeholder,
}: MarkdownFieldProps) {
  const { colorMode } = useColorMode()

  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <Box data-color-mode={colorMode} w="full">
        <MDEditor
          value={value}
          onChange={(val) => onChange(val ?? '')}
          height={height}
          textareaProps={{ placeholder }}
          preview="edit"
        />
      </Box>
    </Field.Root>
  )
}

const MarkdownField = memo(MarkdownFieldBase) as typeof MarkdownFieldBase

export { MarkdownField, type MarkdownFieldProps }
