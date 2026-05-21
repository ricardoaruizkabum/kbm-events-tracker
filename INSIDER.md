# Integração com Insider One

Este documento descreve como utilizar a `@kbm/events-tracker` como camada de rastreamento em aplicações que precisam se integrar com a plataforma [Insider One](https://insiderone.com/).

---

## Visão geral

O Insider Web SDK funciona a partir de um array global `window.InsiderQueue` para o qual se faz pushes de dados de usuário, contexto de página e eventos de interação. A `@kbm/events-tracker` se encaixa nesse modelo por meio de um **adapter customizado**: os eventos disparados pela lib (via `useTrack`, `data-event-name` ou `tracker.track`) são traduzidos e enviados para o `InsiderQueue` de forma transparente.

### O que a lib cobre nessa integração

| Responsabilidade | Coberta pela lib? |
|---|---|
| Inicialização da página (`type: 'user'`, `type: 'product'`, `type: 'init'`) | ❌ — feita no bootstrap da app |
| Eventos de interação (`custom_event`, `add_to_cart`, `remove_from_cart`) | ✅ — via `insiderAdapter` |
| Fila com retry automático em caso de falha | ✅ — built-in na lib |
| Rastreamento automático via `data-event-name` com `data-event-click` / `data-event-view` | ✅ — via `initAutoTracking()` |

---

## Pré-requisitos

O Insider Tag (`ins.js`) e a inicialização do `InsiderQueue` devem estar presentes no `<head>` do HTML **antes** de qualquer push de evento. A lib assume que isso já foi feito pela aplicação.

```html
<!-- index.html -->
<head>
  <!-- 1. Define o array antes do script do Insider -->
  <script>
    window.InsiderQueue = window.InsiderQueue || [];
  </script>

  <!-- 2. Carrega o Insider Tag (substitua {partnerName} e {partnerId}) -->
  <script async src="//{partnerName}.api.useinsider.com/ins.js?id={partnerId}"></script>
</head>
```

A inicialização completa da página (user data + page type + `type: 'init'`) deve ser feita no bootstrap da aplicação, antes de montar o React. Veja a seção [Inicialização da página](#inicialização-da-página).

---

## Instalação

```bash
npm install @kbm/events-tracker
```

---

## Criando o insiderAdapter

Crie um arquivo `src/adapters/insider.ts` na sua aplicação:

```ts
// src/adapters/insider.ts
import type { Adapter, TrackEvent } from '@kbm/events-tracker'

declare global {
  interface Window {
    InsiderQueue: any[]
  }
}

/**
 * Eventos que o Insider trata de forma estruturada (fora do custom_event).
 * Qualquer outro nome de evento é enviado como type: 'custom_event'.
 */
const INSIDER_STRUCTURED_EVENTS = new Set([
  'add_to_cart',
  'remove_from_cart',
])

export const insiderAdapter: Adapter = (event: TrackEvent) => {
  if (typeof window === 'undefined') return
  if (!Array.isArray(window.InsiderQueue)) return

  const { name, data = {} } = event

  if (INSIDER_STRUCTURED_EVENTS.has(name)) {
    window.InsiderQueue.push({
      type: name,
      value: data,
    })
  } else {
    window.InsiderQueue.push({
      type: 'custom_event',
      value: [{
        event_name: name,
        event_parameters: data,
      }],
    })
  }
}
```

---

## Configurando no bootstrap da aplicação

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { tracker, initAutoTracking } from '@kbm/events-tracker'
import { insiderAdapter } from './adapters/insider'
import App from './App'

// Registra o adapter do Insider
tracker.register(insiderAdapter)

// Ativa rastreamento automático via data-event-name (opcional)
initAutoTracking()

createRoot(document.getElementById('root')!).render(<App />)
```

> Em desenvolvimento, adicione também o `consoleAdapter` para inspecionar os eventos no console antes de chegarem ao Insider.

---

## Inicialização da página

A inicialização da página é responsabilidade da aplicação e deve acontecer **antes** de montar o React ou em conjunto com as rotas. O padrão mínimo para uma SPA:

```ts
// src/insider-init.ts

export function initInsiderPage(pageType: 'home' | 'product' | 'category' | 'other', pageValue?: object) {
  if (!Array.isArray(window.InsiderQueue)) return

  // Dados do usuário autenticado (se disponível)
  const user = getCurrentUser() // implemente conforme sua aplicação
  if (user) {
    window.InsiderQueue.push({
      type: 'user',
      value: {
        uuid: user.id,
        email: user.email,
        name: user.name,
        gdpr_optin: true,
      },
    })
  }

  // Tipo de página
  window.InsiderQueue.push({
    type: pageType,
    value: pageValue ?? {},
  })

  // Dispara o processamento — obrigatório
  window.InsiderQueue.push({ type: 'init' })
}
```

Chame `initInsiderPage` a cada mudança de rota em SPAs (ex: no `useEffect` das páginas ou no router).

---

## Exemplos de uso

### Evento customizado via `useTrack`

```tsx
import { useTrack } from '@kbm/events-tracker'

export function BannerCTA() {
  const track = useTrack()

  return (
    <button
      onClick={() =>
        track({
          name: 'banner_cta_clicked',
          data: { banner_id: 'summer-sale', position: 'hero' },
        })
      }
    >
      Ver promoção
    </button>
  )
}
```

Resultado no Insider:
```js
window.InsiderQueue.push({
  type: 'custom_event',
  value: [{
    event_name: 'banner_cta_clicked',
    event_parameters: { banner_id: 'summer-sale', position: 'hero' },
  }],
})
```

---

### Add to cart via `useTrack`

```tsx
import { useTrack } from '@kbm/events-tracker'

export function ProductCard({ product }) {
  const track = useTrack()

  const handleAddToCart = () => {
    addToCart(product) // sua lógica de carrinho

    track({
      name: 'add_to_cart',
      data: {
        id: product.id,
        name: product.name,
        taxonomy: product.categories,
        unit_price: product.originalPrice,
        unit_sale_price: product.price,
        quantity: 1,
        url: product.url,
        product_image_url: product.imageUrl,
        stock: product.stock,
        color: product.selectedColor,
        size: product.selectedSize,
      },
    })
  }

  return <button onClick={handleAddToCart}>Adicionar ao carrinho</button>
}
```

---

### Remove from cart via `useTrack`

```tsx
track({
  name: 'remove_from_cart',
  data: {
    id: product.id,
    name: product.name,
    taxonomy: product.categories,
    unit_price: product.originalPrice,
    unit_sale_price: product.price,
    quantity: 1,
    url: product.url,
    product_image_url: product.imageUrl,
  },
})
```

---

### Rastreamento automático via `data-event-name`

Após chamar `initAutoTracking()`, elementos com `data-event-name` são rastreados de acordo com os atributos booleanos `data-event-click` e `data-event-view`. Cliques e impressões são capturados automaticamente e repassados ao adapter do Insider.

**Clique simples:**
```html
<button
  data-event-click
  data-event-name="newsletter_subscribed"
>
  Assinar newsletter
</button>
```

**Clique com parâmetros extras via `data-event-object`:**
```html
<button
  data-event-click
  data-event-name="plan_selected"
  data-event-object='{"plan":"pro","price":49.9,"billing":"monthly"}'
>
  Assinar plano Pro
</button>
```

**Add to cart via DOM (structured event):**
```html
<button
  data-event-click
  data-event-name="add_to_cart"
  data-event-object='{"id":"abc1234","name":"Blue Dress","unit_price":100,"unit_sale_price":95.2,"quantity":1,"taxonomy":["Dresses","Night Dresses"],"url":"https://example.com/dress","product_image_url":"https://example.com/dress.png"}'
>
  Adicionar ao carrinho
</button>
```

**Impressão (visibilidade):**
```html
<div
  data-event-view
  data-event-name="banner_viewed"
  data-event-object='{"banner_id":"summer-sale","position":"hero"}'
>
  Oferta especial
</div>
```

---

## Usando múltiplos adapters

A `@kbm/events-tracker` suporta múltiplos adapters simultaneamente. Em produção, combine o Insider com sua API interna:

```ts
import { tracker, initAutoTracking } from '@kbm/events-tracker'
import { insiderAdapter } from './adapters/insider'
import { apiAdapter } from './adapters/api' // envia para sua API interna

tracker.register(insiderAdapter)
tracker.register(apiAdapter)

initAutoTracking()
```

Cada evento disparado será entregue a todos os adapters registrados, com retry automático em caso de falha em qualquer um deles.

---

## Considerações para SPAs (React)

- O `window.InsiderQueue` e o `ins.js` devem ser carregados **uma única vez** por sessão (no `<head>` do HTML).
- A cada mudança de rota virtual, chame `initInsiderPage` com o tipo correto de página para que o Insider registre o page view.
- Os eventos de interação (`custom_event`, `add_to_cart`, `remove_from_cart`) podem ser disparados a qualquer momento após o `type: 'init'` ter sido enviado pela primeira vez.
- **Não** chame `initAutoTracking()` mais de uma vez — a lib já protege contra isso internamente com a flag `initialized`.

---

## Referências

- [Insider Web SDK Integration Guide](https://academy.insiderone.com/docs/insider-web-sdk-integration-guide)
- [Events and Attributes Guide](https://academy.insiderone.com/docs/events-attributes-guide)
- [Developer Guide Overview](https://academy.insiderone.com/docs/developer-guide-overview)
