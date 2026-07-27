# Favicon Dinâmico por Cliente

## Implementação

O favicon agora é configurado dinamicamente usando a logo do cliente (branding) em vez de um favicon fixo.

## Como Funciona

### Antes
- Favicon fixo definido em `layout.tsx` (`/favicon.png`)
- Todos os clientes viam o mesmo ícone na aba do navegador

### Agora
- Favicon dinâmico baseado em `data.branding.logo`
- Cada cliente tem seu próprio ícone na aba do navegador
- Funciona tanto em domínios customizados quanto em slugs

## Arquivos Modificados

### 1. `src/app/page.tsx`
Adicionado `icons` ao `generateMetadata`:
```tsx
return {
  title: `${data.branding.name} | ${data.branding.slogan}`,
  description: data.hero.subtitle,
  icons: {
    icon: data.branding.logo,
    shortcut: data.branding.logo,
    apple: data.branding.logo,
  },
}
```

### 2. `src/app/[slug]/page.tsx`
Mesma implementação para páginas com slug.

## Tipos de Ícones Suportados

O favicon é configurado para 3 contextos:
- **`icon`**: Favicon padrão (aparece na aba do navegador)
- **`shortcut`**: Atalho para desktop/mobile
- **`apple`**: Apple Touch Icon (quando salvar no iOS)

## Formatos Suportados

Funciona com qualquer formato de imagem:
- ✅ PNG (recomendado)
- ✅ SVG (vetorial, melhor qualidade)
- ✅ JPG
- ✅ ICO
- ✅ WebP

## Exemplo de Resposta da API

```json
{
  "branding": {
    "name": "24/7 Lavanderia",
    "logo": "https://firebasestorage.googleapis.com/.../logo.svg"
  }
}
```

O valor de `branding.logo` é usado automaticamente como favicon.

## Fallback

Se houver erro ao carregar os dados do cliente:
- Título: "Página não encontrada"
- Favicon: Usa o padrão do `layout.tsx` (`/favicon.png`)

## Benefícios

1. ✅ **Identidade Visual**: Cada cliente tem sua marca na aba do navegador
2. ✅ **Profissional**: Reforça o branding do cliente
3. ✅ **Reconhecimento**: Fácil identificar a aba quando múltiplas estão abertas
4. ✅ **Automático**: Nenhuma configuração manual necessária
5. ✅ **PWA Ready**: Funciona com Apple Touch Icons para mobile

## Onde Aparece

O favicon dinâmico é exibido em:
- 🔹 Aba do navegador (Chrome, Firefox, Safari, etc)
- 🔹 Favoritos/bookmarks
- 🔹 Barra de tarefas (Windows)
- 🔹 Tela inicial (iOS/Android quando salvo)
- 🔹 Histórico do navegador

## Resultado

Agora cada landing page tem seu próprio favicon personalizado, aumentando o profissionalismo e reforçando a identidade visual do cliente! 🎨
