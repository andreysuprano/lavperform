# Comparação Visual dos Templates

Este documento compara os três templates disponíveis usando os **mesmos dados**, mostrando como cada um renderiza de forma diferente.

## 🎨 Templates Disponíveis

### 1️⃣ Template "default" - Clássico e Tradicional

```json
{ "template": "default" }
```

**Características:**
- ✅ Layout grid tradicional
- ✅ Cards de serviços em 3 colunas
- ✅ Seções alternadas branco/colorido
- ✅ Hero padrão com informações laterais
- ✅ Avaliações no final (depois de tudo)
- ✅ FAQ acordeão tradicional
- ✅ Mapa vertical em destaque

**Ideal para:**
- Negócios tradicionais
- Público mais conservador
- Layout comprovado e familiar

---

### 2️⃣ Template "modern" - Contemporâneo e Dinâmico

```json
{ "template": "modern" }
```

**Características:**
- ✅ Layout espaçado com muito ar
- ✅ Cards de serviços em 2 colunas (maiores)
- ✅ Hover effects e animações
- ✅ Avaliações ANTES da localização
- ✅ Mapa horizontal (lado a lado com info)
- ✅ Bordas coloridas nos cards
- ✅ FAQ minimalista com bordas
- ✅ Sombras pronunciadas

**Ideal para:**
- Negócios modernos e tecnológicos
- Público jovem
- Marca que quer passar inovação

---

### 3️⃣ Template "elegant" - Minimalista e Sofisticado

```json
{ "template": "elegant" }
```

**Características:**
- ✅ Hero minimalista com overlay sutil
- ✅ Avaliações LOGO APÓS o hero (primeira seção!)
- ✅ Serviços em lista vertical (preço lateral)
- ✅ Muitos espaços em branco
- ✅ Tipografia GRANDE e impactante
- ✅ Cards individuais no FAQ
- ✅ Animação de slide horizontal
- ✅ Design clean e premium

**Ideal para:**
- Marcas premium e sofisticadas
- Serviços de alto valor
- Público exigente
- Foco em elegância e exclusividade

---

## 📊 Comparação Lado a Lado

| Característica | Default | Modern | Elegant |
|----------------|---------|---------|---------|
| **Hero** | Padrão | Padrão | Minimalista com overlay |
| **Ordem: Avaliações** | No final | Antes da localização | Logo após hero |
| **Serviços: Layout** | Grid 3 col | Grid 2 col | Lista vertical |
| **Serviços: Preço** | Dentro do card | Destaque no topo | Lateral colorido |
| **Espaçamento** | Compacto | Médio | Amplo |
| **Animações** | Nenhuma | Hover | Slide + Hover |
| **FAQ** | Acordeão simples | Com bordas | Cards individuais |
| **Localização** | Vertical | Horizontal | Compacto integrado |
| **Tipografia** | Normal | Grande | Muito grande |
| **White space** | Pouco | Médio | Muito |
| **Sombras** | Médias | Fortes | Suaves |

---

## 🎯 Ordem das Seções

### Template "default"
1. Hero
2. Serviços
3. Localização
4. FAQ
5. **Avaliações** ← No final
6. CTA
7. Footer

### Template "modern"
1. Hero
2. Serviços
3. **Avaliações** ← Antes da localização
4. Localização
5. FAQ
6. CTA
7. Footer

### Template "elegant"
1. Hero (minimalista)
2. **Avaliações** ← Logo após hero!
3. Serviços (lista vertical)
4. Localização (compacto)
5. FAQ (cards)
6. CTA
7. Footer

---

## 🎨 Diferenças Visuais Detalhadas

### Hero Section

**Default:**
```
┌─────────────────────────────────────┐
│  Logo    [Nav Items]                │
├─────────────────────────────────────┤
│                                     │
│      Título Grande                  │
│      Subtítulo                      │
│                                     │
│  [Info boxes lado a lado]           │
│  [Botão CTA centralizado]           │
│                                     │
└─────────────────────────────────────┘
```

**Modern:**
```
┌─────────────────────────────────────┐
│  Logo    [Nav Items]                │
├─────────────────────────────────────┤
│                                     │
│      Título MUITO Grande            │
│      Subtítulo                      │
│                                     │
│  [Info boxes estilizados]           │
│  [Botão CTA grande]                 │
│                                     │
└─────────────────────────────────────┘
```

**Elegant:**
```
┌─────────────────────────────────────┐
│  Logo    [Nav Items]                │
├─────────────────────────────────────┤
│   [ Overlay sutil de fundo ]        │
│                                     │
│   TEXTO PEQUENO UPPERCASE           │
│   Título ENORME                     │
│   Subtítulo leve                    │
│                                     │
│   [Badges arredondados brancos]     │
│   [Botão CTA com sombra grande]     │
│                                     │
└─────────────────────────────────────┘
```

### Cards de Serviços

**Default (3 colunas):**
```
┌──────┐  ┌──────┐  ┌──────┐
│Title │  │Title │  │Title │
│Desc  │  │Desc  │  │Desc  │
│Price │  │Price │  │Price │
│✓ Van │  │✓ Van │  │✓ Van │
└──────┘  └──────┘  └──────┘
```

**Modern (2 colunas maiores):**
```
┌─────────────┐  ┌─────────────┐
│   Title     │  │   Title     │
│   PRICE     │  │   PRICE     │
│   Desc      │  │   Desc      │
│   ✓ Van     │  │   ✓ Van     │
│   ✓ Van     │  │   ✓ Van     │
└─────────────┘  └─────────────┘
```

**Elegant (lista vertical):**
```
┌──────┬────────────────────────┐
│      │ Title                  │
│PRICE │ Description            │
│      │ ──────────────────     │
│      │ ✓ Vantagem 1           │
└──────┴────────────────────────┘

┌──────┬────────────────────────┐
│      │ Title                  │
│PRICE │ Description            │
│      │ ──────────────────────  │
│      │ ✓ Vantagem 1           │
└──────┴────────────────────────┘
```

---

## 💡 Casos de Uso Recomendados

### Use "default" quando:
- ✅ Cliente quer algo simples e direto
- ✅ Orçamento limitado (menos tempo de dev)
- ✅ Público tradicional
- ✅ Precisa de algo "seguro"
- ✅ Muitos serviços para mostrar (3 colunas)

### Use "modern" quando:
- ✅ Cliente quer destaque visual
- ✅ Marca jovem e inovadora
- ✅ Poucos serviços (2-4 serviços)
- ✅ Quer passar modernidade
- ✅ Prioriza avaliações (vêm antes)

### Use "elegant" quando:
- ✅ Serviço premium/sofisticado
- ✅ Foco em conversão imediata (avaliações primeiro)
- ✅ Cliente valoriza design
- ✅ Marca exclusiva/luxuosa
- ✅ Poucos serviços de alto valor
- ✅ Quer passar elegância e confiança

---

## 🔄 Como Testar

### 1. Localmente (desenvolvimento):

Edite temporariamente o retorno da API em `src/app/api/config/route.ts`:

```typescript
// Adicione antes do return
const data = await response.json()
data.template = "elegant" // ← Teste aqui: "default", "modern", ou "elegant"
return data
```

### 2. Via Backend:

Configure o backend para retornar:

```json
{
  "template": "elegant",
  "branding": { ... },
  ...
}
```

### 3. Query Parameter (dev):

```bash
# Adicione ?template=elegant na URL (se implementar)
http://localhost:3000?template=elegant
```

---

## 📱 Responsividade

Todos os três templates são **100% responsivos** e se adaptam a:

- 📱 Mobile (< 768px)
- 💻 Tablet (768px - 1024px)
- 🖥️ Desktop (> 1024px)

**Diferenças no mobile:**

| Aspecto | Default | Modern | Elegant |
|---------|---------|---------|---------|
| Serviços | 1 coluna | 1 coluna | 1 coluna (com preço no topo) |
| Localização | Vertical | Vertical | Vertical |
| FAQ | Compacto | Compacto | Cards compactos |
| Hero | Padrão | Padrão | Minimalista |

---

## 🎨 Cores e Branding

**TODOS os templates respeitam as cores do backend:**

```json
{
  "branding": {
    "primaryColor": "#FF6B6B",    // Cor principal
    "secondaryColor": "#4ECDC4",  // Cor secundária  
    "tertiaryColor": "#FFE66D"    // Cor de fundo
  }
}
```

Essas cores são aplicadas via CSS variables:
- `--brand-primary`
- `--brand-secondary`
- `--brand-tertiary`

Cada template usa essas cores de forma diferente, mas **sempre respeitando a identidade da marca**.

---

## 🚀 Performance

Todos os templates têm performance similar:

- ⚡ Imagens otimizadas com Next.js Image
- ⚡ Lazy loading de componentes
- ⚡ CSS-in-JS otimizado (Chakra UI)
- ⚡ SSR (Server-Side Rendering)
- ⚡ Cache de 60 segundos

---

## 📝 Resumo Rápido

**Escolha rápida:**

- 🟦 **Default** = Simples, tradicional, seguro
- 🟨 **Modern** = Moderno, dinâmico, jovem
- 🟪 **Elegant** = Premium, sofisticado, exclusivo

**Mesmo código, mesmos dados, aparência completamente diferente!** 🎯
