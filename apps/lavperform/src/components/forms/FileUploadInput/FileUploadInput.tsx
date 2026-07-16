import { Button, Flex, Input, Text } from '@chakra-ui/react'
import { ChangeEvent, memo, useRef } from 'react'

import { Props } from './FileUploadInput.types'

function FileUploadInputComponent({ onFileSelect, accept = '.csv' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <Flex flexDirection="column">
      <Input
        accept={accept}
        display="none"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
      <Button
        colorScheme="blue"
        onClick={() => inputRef.current?.click()}
        variant="outline"
      >
        Selecionar Arquivo {accept}
      </Button>
      <Text
        color="gray.600"
        fontSize="sm"
        mt={2}
      >
        Apenas arquivos {accept} são aceitos
      </Text>
    </Flex>
  )
}

const FileUploadInput = memo(
  FileUploadInputComponent
) as typeof FileUploadInputComponent

export { FileUploadInput, type Props as FileUploadInputProps }
