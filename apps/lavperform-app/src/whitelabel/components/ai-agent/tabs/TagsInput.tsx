import { Badge, Box, HStack, Icon, Input, Wrap } from '@chakra-ui/react'
import { memo, useState, type KeyboardEvent } from 'react'
import { RiCloseLine } from 'react-icons/ri'

interface TagsInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

function TagsInputBase({ value, onChange, placeholder }: TagsInputProps) {
  const [draft, setDraft] = useState('')

  const addTag = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setDraft('')
  }

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(draft)
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <Box>
      {value.length > 0 && (
        <Wrap gap={2} mb={2}>
          {value.map((tag, index) => (
            <Badge key={`${tag}-${index}`} variant="subtle" colorPalette="gray">
              <HStack gap={1}>
                <span>{tag}</span>
                <Icon
                  as={RiCloseLine}
                  cursor="pointer"
                  onClick={() => removeTag(index)}
                  aria-label={`Remover ${tag}`}
                />
              </HStack>
            </Badge>
          ))}
        </Wrap>
      )}
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim()) addTag(draft)
        }}
        placeholder={placeholder}
        size="sm"
      />
    </Box>
  )
}

const TagsInput = memo(TagsInputBase) as typeof TagsInputBase

export { TagsInput }
