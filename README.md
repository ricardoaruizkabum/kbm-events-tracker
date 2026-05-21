# @kbm/events-tracker

Biblioteca leve de rastreamento de eventos para aplicações React, sem dependências externas. Captura interações do usuário e as despacha para múltiplos destinos (adapters) de forma assíncrona, com fila isolada por aplicação e retry automático em caso de falha.

---

## Funcionalidades

- **Rastreamento manual** via hook `useTrack` em componentes React
- **Rastreamento automático** via atributo `data-event-name` no DOM — `data-event-click` para cliques, `data-event-view` para visibilidade
- **Rastreamento de visibilidade exclusivo** via `IntersectionObserver` — apenas elementos com `data-event-view`
- **Suporte a elementos dinâmicos** via `MutationObserver`
- **Múltiplos adapters** simultâneos por aplicação (console, API, Insider, etc.)
- **Fila isolada por app** com lock de envio e retry automático (500 ms)
- **TypeScript** nativo, zero dependências em runtime

---

## Instalação

```bash
npm install @kbm/events-tracker
```

> **Peer dependency:** `react >= 18`

---

## Início rápido

### 1. Registrar adapters na inicialização

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { tracker, consoleAdapter, apiAdapter, initAutoTracking } from '@kbm/events-tracker'
import App from './App'

tracker.register(consoleAdapter, 'minha-app') // imprime no console (dev)
tracker.register(apiAdapter, 'minha-app')     // envia via sendBeacon para /api/events

initAutoTracking({ app: 'minha-app' })        // ativa rastreamento automático (opcional)

createRoot(document.getElementById('root')!).render(<App />)
```

### 2. Rastreamento manual com `useTrack`

```tsx
import { useTrack } from '@kbm/events-tracker'

export function CheckoutButton() {
  const track = useTrack()

  return (
    <button
      onClick={() =>
        track({
          app: 'minha-app',
          name: 'checkout_clicked',
          data: { plan: 'pro', price: 49.9 },
        })
      }
    >
      Assinar plano Pro
    </button>
  )
}
```

### 3. Rastreamento automático com `data-event-name`

Após chamar `initAutoTracking()`, elementos com `data-event-name` são rastreados de acordo com os atributos booleanos `data-event-click` e `data-event-view`:

| Atributo | Gatilho |
|---|---|
| `data-event-click` | Usuário clica no elemento |
| `data-event-view` | Elemento entra na viewport (`IntersectionObserver`) |

```html
<!-- Rastreado ao clicar -->
<button
  data-event-click
  data-event-name="banner_cta_clicked"
>
  Saiba mais
</button>

<!-- Rastreado ao entrar na viewport (impressão) -->
<div
  data-event-view
  data-event-name="banner_viewed"
  data-event-object='{"banner":"black-friday","position":"hero"}'
>
  Oferta especial
</div>

<!-- Clique com dados extras -->
<button
  data-event-click
  data-event-name="plan_selected"
  data-event-object='{"plan":"pro","price":49.9}'
>
  Assinar plano Pro
</button>
```

O evento gerado tem a estrutura:

```json
{
  "app": "minha-app",
  "name": "plan_selected",
  "data": { "plan": "pro", "price": 49.9 },
  "ts": 1747699200000
}
```

> O campo `data` contém exclusivamente os valores de `data-event-object`. O `textContent` do elemento não é capturado.

---

## Adapters incluídos

| Adapter | Descrição |
|---|---|
| `consoleAdapter` | Imprime o evento com `console.log` — útil em desenvolvimento |
| `apiAdapter` | Envia o evento via `navigator.sendBeacon('/api/events')` |

### Criar um adapter customizado

Implemente a interface `Adapter` para enviar eventos a qualquer destino:

```ts
import type { Adapter } from '@kbm/events-tracker'

export const segmentAdapter: Adapter = async (event) => {
  await fetch('https://api.segment.io/v1/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic <BASE64_WRITE_KEY>',
    },
    body: JSON.stringify({
      event: event.name,
      properties: event.data,
      timestamp: new Date(event.ts!).toISOString(),
    }),
  })
}
```

Registre-o na inicialização:

```ts
import { tracker } from '@kbm/events-tracker'
import { segmentAdapter } from './adapters/segment'

tracker.register(segmentAdapter, 'minha-app')
```

---

## API

### `tracker.track(event: TrackEvent): void`

Enfileira e despacha um evento.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `app` | `string` | ✅ | Nome da aplicação — determina quais adapters processarão o evento |
| `name` | `string` | ✅ | Identificador do evento |
| `data` | `Record<string, any>` | ❌ | Dados adicionais do contexto |
| `ts` | `number` | ❌ | Timestamp (preenchido automaticamente) |

### `tracker.register(adapter: Adapter, app: string): void`

Registra um adapter vinculado a uma aplicação. O adapter só é acionado por eventos cujo `app` coincida com o nome informado.

### `useTrack(): (event: TrackEvent) => void`

Hook React que retorna a função `track` do singleton global.

### `initAutoTracking({ app }: { app: string }): void`

Ativa rastreamento automático em elementos com `data-event-name`. Instala três mecanismos:

| Mecanismo | Atributo necessário | Gatilho |
|---|---|---|
| `addEventListener('click', …, true)` | `data-event-click` | Usuário clica no elemento |
| `IntersectionObserver` | `data-event-view` | Elemento entra na viewport |
| `MutationObserver` | — | Observa novos `[data-event-view]` adicionados ao DOM |

Idempotente — chamadas subsequentes são ignoradas.

### `EventHandler<TReturn = void>`

Tipo para handlers individuais dentro de um adapter. O generic `TReturn` permite tipar o retorno da função:

```ts
import type { EventHandler } from '@kbm/events-tracker'

// Retorno void (padrão)
const myHandler: EventHandler = (event) => { ... }

// Retorno tipado
const myHandler: EventHandler<{ success: boolean }> = async (event) => {
  return { success: true }
}
```

---

## Integrações

- **[Insider One](./INSIDER.md)** — adapter e guia de integração com a plataforma Insider

---

## Desenvolvimento local

```bash
npm install
npm run dev       # inicia a demo em http://localhost:5173
npm run typecheck # verifica tipos TypeScript
```

## Publicar

```bash
npm run pack   # build + gera .tgz em releases/
npm publish --access restricted
```

Os artefatos gerados são `dist/index.js`, `dist/index.cjs` e `dist/index.d.ts`.
