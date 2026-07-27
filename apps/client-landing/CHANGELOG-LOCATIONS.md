# Atualização: Suporte a Múltiplas Unidades

## Resumo das Mudanças

O sistema de landing pages foi atualizado para suportar múltiplas unidades/localizações. A estrutura da seção `location` agora é um array de itens em vez de um único objeto.

## Estrutura Nova da API

### Antes (Estrutura Antiga)
```json
{
  "location": {
    "title": "Localização",
    "description": "Descrição...",
    "placeName": "Nome do Local",
    "address": "Endereço completo",
    "mapUrl": "URL do mapa",
    "mapEmbedUrl": "URL embed",
    "googleMapsLink": "Link do Google Maps"
  }
}
```

### Agora (Nova Estrutura)
```json
{
  "location": {
    "title": "Localização",
    "description": "Descrição...",
    "items": [
      {
        "placeName": "24/7 Lavanderia - Unidade 1",
        "address": "Rua Doutor Paulo Roberto de Almeida",
        "mapUrl": "https://maps.app.goo.gl/...",
        "mapEmbedUrl": "https://maps.app.goo.gl/...",
        "googleMapsLink": "https://maps.app.goo.gl/..."
      },
      {
        "placeName": "24/7 Lavanderia - Unidade 2",
        "address": "Rua Exemplo, 123",
        "mapUrl": "https://maps.app.goo.gl/...",
        "mapEmbedUrl": "https://maps.app.goo.gl/...",
        "googleMapsLink": "https://maps.app.goo.gl/..."
      }
    ]
  }
}
```

## Comportamento do Componente

### 1 Unidade (Layout Simples)
Quando `location.items` contém apenas **1 item**, o layout exibe:
- **Esquerda**: Mapa em tamanho médio
- **Direita**: Card com informações da unidade e botão "Ver no Mapa"

### Múltiplas Unidades (Layout Expandido)
Quando `location.items` contém **2 ou mais itens**, o layout exibe:
- **Esquerda**: Mapa grande ocupando 2/3 da largura
- **Direita**: Lista de unidades ocupando 1/3 da largura
  - Lista com scroll quando houver muitas unidades
  - Cards clicáveis para selecionar a unidade
  - Card selecionado fica destacado com borda azul
  - Ao clicar em uma unidade, o mapa atualiza automaticamente

## Arquivos Modificados

### 1. Tipos TypeScript
**Arquivo**: `src/types/laundry.ts`
- Atualizado interface `LaundryData.location` para aceitar array de `items`

### 2. Novo Componente
**Arquivo**: `src/components/location-section.tsx`
- Componente reutilizável que gerencia a exibição de localizações
- Lógica inteligente para layout único ou múltiplo
- Estado para controlar unidade selecionada
- Responsivo para mobile e desktop

### 3. Templates Atualizados
Todos os templates foram atualizados para usar o novo componente:
- `src/templates/modern.tsx`
- `src/templates/default.tsx`
- `src/templates/elegant.tsx`

## Recursos do Componente

### Interface Interativa
- 🖱️ **Click para selecionar**: Clique em qualquer unidade da lista para atualizar o mapa
- 🎨 **Feedback visual**: Unidade selecionada tem destaque visual
- 📱 **Responsivo**: Layout adaptado para mobile e desktop
- 🔄 **Scroll suave**: Lista de unidades com scroll personalizado

### Botões de Ação
- 📍 **Ver no Mapa**: Abre o Google Maps em nova aba
- 🗺️ **Mapa interativo**: Embed do Google Maps totalmente funcional

## Compatibilidade

✅ **Retrocompatível**: Funciona com backends que enviam:
- Array com 1 item (exibe layout simples)
- Array com múltiplos itens (exibe layout expandido)

## Exemplo de Uso

```tsx
import { LocationSection } from "@/components/location-section"

// No template
<Section
  id="localizacao"
  title={data.location.title}
  description={data.location.description}
>
  <LocationSection items={data.location.items} />
</Section>
```

## Notas Técnicas

- **Estado**: Usa React `useState` para gerenciar unidade selecionada
- **Client Component**: Marcado com `"use client"` devido ao estado interativo
- **Chakra UI**: Utiliza componentes Chakra UI para consistência visual
- **Sem erros de linter**: Código validado e sem warnings
