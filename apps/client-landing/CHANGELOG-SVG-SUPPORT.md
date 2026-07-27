# Suporte a SVG nas Logos dos Clientes

## Problema Identificado

O Next.js Image não aceita SVG por padrão por questões de segurança. Quando uma logo SVG é carregada do Firebase Storage, o erro ocorre:

```
The requested resource has type "image/svg+xml" but dangerouslyAllowSVG is disabled.
```

## Solução Implementada

Substituímos o componente `Image` do Next.js por tags `<img>` HTML regulares para **todas as logos de clientes** (branding).

### Por que essa abordagem?

1. ✅ **URLs Externas**: As logos vêm do Firebase Storage (URLs externas)
2. ✅ **Suporte Universal**: A tag `<img>` suporta SVG, PNG, JPG, WebP nativamente
3. ✅ **Sem otimização necessária**: Firebase Storage já entrega as imagens otimizadas
4. ✅ **Sem problemas de segurança**: Confiamos nas logos dos nossos clientes
5. ✅ **Simples e confiável**: Menos complexidade, mais compatibilidade

## Arquivos Modificados

### 1. Header (`src/components/header.tsx`)
- Logo principal no desktop
- Logo no menu mobile (drawer)
- Removido `Image` do Next.js
- Usando tag `<img>` HTML regular

### 2. Footer (`src/components/footer.tsx`)
- Logo no rodapé
- Removido `Image` do Next.js
- Usando tag `<img>` HTML regular

### 3. Not Found (`src/app/not-found.tsx`)
- **✅ Mantido como está** (usa `Image` do Next.js)
- Logo local do sistema (`/logo.png`)
- Não é logo de cliente, é da plataforma Lavperform

## Comparação

### Antes (com erro SVG)
```tsx
<Image
  alt={`Logo ${branding.name}`}
  height={60}
  width={200}
  src={branding.logo}
  priority
/>
```

### Depois (funcionando)
```tsx
<img
  alt={`Logo ${branding.name}`}
  src={branding.logo}
  style={{ 
    objectFit: 'contain',
    width: '100%',
    height: '100%'
  }}
/>
```

## Formatos Suportados

Agora as logos de clientes aceitam **todos os formatos**:
- ✅ SVG (vetorial)
- ✅ PNG (com transparência)
- ✅ JPG/JPEG
- ✅ WebP
- ✅ GIF

## Performance

**Não há perda de performance:**
- Firebase Storage entrega as imagens via CDN
- Browser faz cache automático
- SVG já é otimizado por natureza (vetorial)
- PNG/JPG podem ser otimizados antes do upload

## Resultado

✅ SVG funciona perfeitamente
✅ Outros formatos continuam funcionando
✅ Sem erros no console
✅ Código mais simples e limpo
✅ Compatibilidade total com Firebase Storage
