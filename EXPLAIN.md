# @kbm/events-tracker

Biblioteca leve de rastreamento de eventos para aplicações React, sem dependências externas. Ela captura interações do usuário e as despacha para múltiplos destinos (adapters) de forma assíncrona, com suporte a fila e retry automático em caso de falha.

---

## Arquitetura

```
src/
├── adapters/
│   ├── console/
│   │   ├── index.ts     # Adapter de desenvolvimento: imprime eventos no console
│   │   └── handlers/
│   │       ├── favorite.ts
│   │       ├── addToCart.ts
│   │       ├── bannerViewed.ts
│   │       └── index.ts
│   └── api/
│       ├── index.ts     # Adapter de produção: envia eventos via navigator.sendBeacon
│       └── handlers/
│           ├── viewDetails.ts
│           └── index.ts
├── hooks/
│   └── useTrack.ts      # Hook React: expõe o método track para componentes
├── tracking/
│   ├── tracker.ts       # Núcleo: classe Tracker com fila e despacho para adapters
│   ├── demo-setup.ts    # Demo only: registra os adapters no tracker singleton
│   └── init-tracker.ts  # Rastreamento automático via data-event-name + data-event-click/data-event-view no DOM
└── types/
    └── index.ts         # Tipos compartilhados: TrackEvent, Adapter, EventHandler
```

### Fluxo de dados

```
Evento gerado  { app: "minha-app", name: "...", data: {...} }
  │
  ├─ useTrack()  →  tracker.track()   (rastreamento manual em componentes)
  └─ data-event-name  →  tracker.track()   (rastreamento automático via DOM)
            │
            ▼
       Fila isolada por app  Map<app, TrackEvent[]>
            │
            ▼
       flush(app) — processa eventos da app, filtra apenas os adapters dela
            │
            ├──▶ consoleAdapter  →  console.log
            └──▶ apiAdapter      →  navigator.sendBeacon("/api/events")
```

Cada aplicação tem sua própria fila e seu próprio lock de envio — uma falha em adapters de uma app não bloqueia o processamento das demais. Em caso de falha, o evento **permanece na fila** e é retentado após 500 ms.

---

## Instalação

```bash
npm install @kbm/events-tracker
```

> **Requisito:** `react >= 18` como peer dependency no projeto consumidor.

---

## Como usar em outro projeto

### 1. Registrar adapters na inicialização

`@kbm/events-tracker` não registra nenhum adapter automaticamente. Na entrada da sua aplicação, importe `tracker` e registre os adapters desejados:

```tsx
// src/main.tsx (ou src/index.tsx)
import {
  tracker,
  consoleAdapter,
  apiAdapter,
  initAutoTracking,
} from "@kbm/events-tracker";

// Registre os adapters associando-os ao nome da sua aplicação
tracker.register(consoleAdapter, "minha-app"); // imprime no console (útil em dev)
tracker.register(apiAdapter, "minha-app"); // envia via sendBeacon para /api/events

// Ativa rastreamento automático via data-event-name (opcional)
// O app informado aqui será injetado em todos os eventos gerados automaticamente
initAutoTracking({ app: "minha-app" });

createRoot(document.getElementById("root")!).render(<App />);
```

### 2. Rastreamento manual com `useTrack`

```tsx
import { useTrack } from "@kbm/events-tracker";

export default function CheckoutButton() {
  const track = useTrack();

  return (
    <button
      onClick={() =>
        track({
          app: "minha-app",
          name: "checkout_clicked",
          data: { plan: "pro", price: 49.9 },
        })
      }
    >
      Assinar plano Pro
    </button>
  );
}
```

### 3. Rastreamento automático com `data-event-name`

Após chamar `initAutoTracking()`, elementos com `data-event-name` são rastreados de acordo com os atributos booleanos `data-event-click` e `data-event-view`:

| Atributo | Gatilho |
|---|---|
| `data-event-click` | Usuário clica no elemento |
| `data-event-view` | Elemento entra na viewport (`IntersectionObserver`) |

Elementos adicionados dinamicamente ao DOM também são observados automaticamente via `MutationObserver`.

Use `data-event-object` para incluir dados adicionais no evento:

```tsx
{/* Clique simples — sem dados extras */}
<button
  data-event-click
  data-event-name="banner_cta_clicked"
>
  Saiba mais
</button>

{/* Clique com dados extras via data-event-object (JSON) */}
<button
  data-event-click
  data-event-name="plan_selected"
  data-event-object='{"plan":"pro","price":49.9}'
>
  Assinar plano Pro
</button>

{/* Visibilidade — dispara ao entrar na viewport */}
<div
  data-event-view
  data-event-name="banner_viewed"
  data-event-object='{"banner":"black-friday"}'
>
  Oferta especial
</div>
```

O evento gerado terá a estrutura:

```json
{
  "app": "minha-app",
  "name": "plan_selected",
  "data": { "plan": "pro", "price": 49.9 },
  "ts": 1747699200000
}
```

> **Atenção:** O campo `data` contém exclusivamente os valores de `data-event-object`. O `textContent` do elemento **não** é capturado automaticamente — inclua os dados relevantes explicitamente em `data-event-object`.

> **Nota:** Cada elemento é observado pelo `IntersectionObserver` a partir do momento em que é montado no DOM. Se o elemento já estiver visível ao ser inserido, o evento de visibilidade dispara imediatamente.

### 4. Criar um adapter customizado

Implemente a interface `Adapter` para enviar eventos a qualquer destino:

```ts
import type { Adapter } from "@kbm/events-tracker";

export const segmentAdapter: Adapter = async (event) => {
  await fetch("https://api.segment.io/v1/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic <BASE64_WRITE_KEY>",
    },
    body: JSON.stringify({
      event: event.name,
      properties: event.data,
      timestamp: new Date(event.ts!).toISOString(),
    }),
  });
};
```

Registre-o na inicialização:

```ts
import { tracker } from "@kbm/events-tracker";
import { segmentAdapter } from "./adapters/segment";

tracker.register(segmentAdapter, "minha-app");
```

---

---

## Demo local (este repositório)

O projeto inclui uma aplicação de demonstração em `src/App.tsx` e `src/main.tsx`.

### Inicializar na entrada da aplicação (`main.tsx`)

```tsx
// src/main.tsx
import "./tracking/demo-setup"; // registra consoleAdapter + apiAdapter para "demo-app"
import { initAutoTracking } from "./tracking/init-tracker";

initAutoTracking({ app: "demo-app" });

createRoot(document.getElementById("root")!).render(<App />);
```

> `demo-setup.ts` é exclusivo da demo — não faz parte da API pública da lib. No seu projeto, registre os adapters diretamente como mostrado acima.

---

## Referência da API

### `tracker.track(event: TrackEvent): void`

Enfileira e despacha um evento.

| Campo  | Tipo                  | Obrigatório | Descrição                                                         |
| ------ | --------------------- | ----------- | ----------------------------------------------------------------- |
| `app`  | `string`              | ✅          | Nome da aplicação — determina quais adapters processarão o evento |
| `name` | `string`              | ✅          | Identificador do evento                                           |
| `data` | `Record<string, any>` | ❌          | Dados adicionais do contexto                                      |
| `ts`   | `number`              | ❌          | Timestamp (preenchido automaticamente)                            |

### `tracker.register(adapter: Adapter, app: string): void`

Registra um adapter vinculado a uma aplicação. O adapter só será acionado por eventos cujo campo `app` coincida com o nome informado aqui.

### `useTrack(): (event: TrackEvent) => void`

Hook React que retorna a função `track` do singleton global.

### `initAutoTracking({ app }: { app: string }): void`

Inicia o rastreamento automático de elementos com `data-event-name`. O `app` informado é injetado em todos os eventos gerados. Internamente, instala três mecanismos:

| Mecanismo | Atributo necessário | Gatilho |
|---|---|---|
| `addEventListener('click', …, true)` | `data-event-click` | Usuário clica no elemento |
| `IntersectionObserver` | `data-event-view` | Elemento entra na viewport |
| `MutationObserver` | — | Observa novos `[data-event-view]` adicionados ao DOM |

A função é idempotente — chamadas subsequentes são ignoradas.

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

## Executar a demo

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`. Ao clicar nos botões da demo, os eventos aparecem no console do navegador e são enviados via `sendBeacon` para `/api/events`.

## Publicar a lib

```bash
npm run build   # gera dist/index.js, dist/index.cjs, dist/index.d.ts
npm publish --access restricted
```
