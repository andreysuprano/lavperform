import {
  Button,
  Card,
  HStack,
  RadioCard,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiSaveLine } from 'react-icons/ri'

import {
  LANDING_PAGE_TEMPLATES,
  type LandingPageTemplate,
} from '../../../types'

import { Props } from './TemplatePicker.types'

function TemplatePickerBase({
  value,
  onChange,
  onSave,
  isSaving = false,
  isDirty = false,
}: Props) {
  return (
    <Card.Root variant="elevated">
      <Card.Header>
        <Card.Title>Template da Landing Page</Card.Title>
        <Card.Description>
          Escolha o visual geral da sua página pública. As seções continuam
          editáveis normalmente.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <RadioCard.Root
            name="landing-page-template"
            onValueChange={({ value: nextValue }) => {
              if (
                nextValue === 'default' ||
                nextValue === 'modern' ||
                nextValue === 'elegant'
              ) {
                onChange(nextValue as LandingPageTemplate)
              }
            }}
            value={value}
            w="full"
          >
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} w="full">
              {LANDING_PAGE_TEMPLATES.map((item) => (
                <RadioCard.Item key={item.value} value={item.value}>
                  <RadioCard.ItemHiddenInput />
                  <RadioCard.ItemControl>
                    <RadioCard.ItemContent>
                      <RadioCard.ItemText fontWeight="semibold">
                        {item.label}
                      </RadioCard.ItemText>
                      <RadioCard.ItemDescription>
                        {item.description}
                      </RadioCard.ItemDescription>
                    </RadioCard.ItemContent>
                    <RadioCard.ItemIndicator />
                  </RadioCard.ItemControl>
                </RadioCard.Item>
              ))}
            </SimpleGrid>
          </RadioCard.Root>

          <HStack justify="space-between" wrap="wrap" gap={3}>
            <Text color="fg.muted" fontSize="sm">
              {isDirty
                ? 'Há alterações não salvas no template.'
                : 'Template sincronizado com a página publicada.'}
            </Text>
            <Button
              disabled={!isDirty}
              loading={isSaving}
              onClick={onSave}
              size="sm"
            >
              <RiSaveLine />
              Salvar template
            </Button>
          </HStack>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const TemplatePicker = memo(TemplatePickerBase) as typeof TemplatePickerBase

export { TemplatePicker, type Props as TemplatePickerProps }
