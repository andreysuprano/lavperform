# 🎨 Sistema White Label - Quick Start

Este projeto possui um sistema completo de White Label que permite personalizar cores, imagens e textos.

## 🚀 Como usar

### 1. Escolha ou crie um tema

Defina no arquivo `.env`:

```bash
VITE_THEME_ID=default
```

Temas disponíveis:

- `default` - Tema padrão FoodCRM
- `example` - Tema de exemplo
- Crie o seu próprio!

### 2. Use em seus componentes

```typescript
import { useWhiteLabel } from '@/config'
import { ThemeImage, ThemeText } from '@/components/common'

function MeuComponente() {
  const { colors, images, texts } = useWhiteLabel()

  return (
    <div>
      {/* Usando hook */}
      <h1 style={{ color: colors.primary }}>{texts.appName}</h1>

      {/* Usando componentes */}
      <ThemeImage
        imageKey="logo"
        alt="Logo"
      />
      <ThemeText
        textKey="tagline"
        as="p"
      />
    </div>
  )
}
```

## 📂 Estrutura

```
src/
├── config/
│   ├── themes/
│   │   ├── default.theme.ts    ← Tema padrão
│   │   ├── example.theme.ts    ← Tema de exemplo
│   │   └── seu-tema.theme.ts   ← Crie aqui seu tema
│   ├── white-label.types.ts
│   ├── white-label.config.ts
│   └── index.ts
└── components/common/WhiteLabel/
    ├── ThemeComponents.tsx      ← Componentes auxiliares
    └── Examples.tsx             ← Exemplos de uso

public/
├── *.png                        ← Imagens do tema default
└── custom/                      ← Suas imagens customizadas
    └── *.png
```

## 📖 Documentação Completa

Veja [WHITE_LABEL_GUIDE.md](./WHITE_LABEL_GUIDE.md) para documentação completa com:

- Como criar um novo tema
- Exemplos práticos
- Boas práticas
- Troubleshooting

## 🎯 O que pode ser customizado

✅ **Cores**: primária, secundária, sucesso, erro, etc.  
✅ **Imagens**: logos, ícones, banners, backgrounds  
✅ **Textos**: nome do app, descrições, contatos  
✅ **Fontes**: tipografias personalizadas

## 💡 Dica

Veja exemplos de uso em: `src/components/common/WhiteLabel/Examples.tsx`
