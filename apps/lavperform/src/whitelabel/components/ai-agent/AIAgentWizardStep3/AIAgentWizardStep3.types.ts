import type { Control } from 'react-hook-form'

export interface Step3FormData {
  audioEnabled: boolean
  audioDefaultMessage: string
  imageEnabled: boolean
  imageExtractionPrompt: string
  imageDefaultMessage: string
  videoEnabled: boolean
  videoExtractionPrompt: string
  videoDefaultMessage: string
}

export interface Props {
  control: Control<Step3FormData>
}
