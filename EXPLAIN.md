# @kbm/events-tracker

Biblioteca leve de rastreamento de eventos para aplicações React, sem dependências externas. Ela captura interações do usuário e as despacha para múltiplos destinos (adapters) de forma assíncrona, com suporte a fila e retry automático em caso de falha.

---

## Arquitetura

```
src/
├── adapters/
│   ├── console.ts       # Adapter de desenvolvimento: imprime eventos no console
│   └── api.ts           # Adapter de produção: envia eventos via navigator.sendBeacon
├── hooks/
│   └── useTrack.ts      # Hook React: expõe o método track para componentes
├── tracking/
│   ├── tracker.ts       # Núcleo: classe Tracker com fila e despacho para adapters
│   ├── demo-setup.ts    # Demo only: registra os adapters no tracker singleton
│   └── init-tracker.ts  # Rastreamento automático via atributo data-track no DOM
└── types/
    └── index.ts         # Tipos compartilhados: TrackEvent, Adapter
```

### Fluxo de dados

```
Evento gerado  { app: "minha-app", name: "...", data: {...} }
  │
  ├─ useTrack()  →  tracker.track()   (rastreamento manual em componentes)
  └─ data-track  →  tracker.track()   (rastreamento automático via DOM)
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

// Ativa rastreamento automático via data-track (opcional)
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

### 3. Rastreamento automático com `data-track`

Após chamar `initAutoTracking()`, dois tipos de interação são capturados automaticamente em elementos com `data-track`:

- **Clique** — dispara quando o usuário clica no elemento
- **Visibilidade** — dispara quando o elemento entra na viewport (via `IntersectionObserver`)

Elementos adicionados dinamicamente ao DOM também são observados automaticamente via `MutationObserver`.

Use `data-track-object` para incluir dados adicionais no evento:

```tsx
{/* Evento simples — sem dados extras */}
<button data-track="banner_cta_clicked">
  Saiba mais
</button>

{/* Evento com dados extras via data-track-object (JSON) */}
<button
  data-track="plan_selected"
  data-track-object='{"plan":"pro","price":49.9}'
>
  Assinar plano Pro
</button>

{/* Rastreado ao entrar na viewport (impressão de banner, por exemplo) */}
<div
  data-track="banner_viewed"
  data-track-object='{"banner":"black-friday"}'
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

> **Atenção:** O campo `data` contém exclusivamente os valores de `data-track-object`. O `textContent` do elemento **não** é capturado automaticamente — inclua os dados relevantes explicitamente em `data-track-object`.

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

Inicia o rastreamento automático de elementos com `data-track`. O `app` informado é injetado em todos os eventos gerados. Internamente, instala três mecanismos:

| Mecanismo | Gatilho |
|---|---|
| `addEventListener('click', …, true)` | Clique em qualquer elemento com `data-track` |
| `IntersectionObserver` | Elemento com `data-track` entra na viewport |
| `MutationObserver` | Novo elemento com `data-track` adicionado ao DOM |

A função é idempotente — chamadas subsequentes são ignoradas.

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
