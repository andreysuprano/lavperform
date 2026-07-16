import {
  FileUpload,
  Float,
  HStack,
  Text,
  useFileUploadContext,
} from '@chakra-ui/react'
import { memo } from 'react'
import { LuX } from 'react-icons/lu'

import { Props } from './FileUploadList.types'

const FileUploadListComponent = ({ title = '' }: Props) => {
  const fileUpload = useFileUploadContext()

  const files = fileUpload.acceptedFiles

  if (files.length === 0) return null

  return (
    <>
      {!!title && <Text mb="2">{title}</Text>}
      <FileUpload.ItemGroup>
        <HStack
          gap={4}
          wrap="wrap"
        >
          {files.map((file) => (
            <FileUpload.Item
              file={file}
              key={file.name}
              p="2"
              w="fit-content"
            >
              <FileUpload.ItemPreviewImage
                maxH="100px"
                maxW="100px"
              />
              <Float placement="top-end">
                <FileUpload.ItemDeleteTrigger
                  boxSize="4"
                  layerStyle="fill.solid"
                >
                  <LuX />
                </FileUpload.ItemDeleteTrigger>
              </Float>
            </FileUpload.Item>
          ))}
        </HStack>
      </FileUpload.ItemGroup>
    </>
  )
}

const FileUploadList = memo(
  FileUploadListComponent
) as typeof FileUploadListComponent

export { FileUploadList, type Props as FileUploadListProps }
