# IA Instructions

## Objetivo del proyecto

Este proyecto es un frontend en React + TypeScript para gestionar conversaciones de WhatsApp en una interfaz estilo inbox. Incluye:

- listado de conversaciones
- detalle de conversación
- login protegido
- filtros por estado, flujo y origen
- polling de actualizaciones
- acciones sobre conversaciones como tomar, cerrar y eliminar

## Stack principal

- React 18
- TypeScript
- Vite
- React Router con `HashRouter`
- Tailwind CSS
- shadcn/ui + Radix UI
- Sonner para toasts
- React Query está instalado, pero el flujo principal actual usa hooks con `useState/useEffect`

## Comandos útiles

```bash
npm run dev
npm run build
npm run lint
```

## Estructura importante

- `src/App.tsx`
  Define rutas protegidas y layout base.

- `src/pages/ConversationsPage.tsx`
  Pantalla principal del inbox. Aquí viven la barra de estados, filtro de flujo, filtro de origen y el listado.

- `src/pages/ConversationDetailPage.tsx`
  Pantalla de detalle de una conversación.

- `src/hooks/useConversations.ts`
  Hook central del módulo. Aquí se carga la lista, se filtra y se exponen acciones como:
  - `takeConversation`
  - `closeConversation`
  - `removeConversation`
  - `markRead`
  - `updateStatus`

- `src/hooks/useConversationPolling.ts`
  Hook encargado del polling de actualizaciones de conversaciones.

- `src/api/conversationsApi.ts`
  Cliente HTTP para conversaciones. Aquí se mapea la respuesta del backend al modelo de frontend.

- `src/api/messagesApi.ts`
  Cliente HTTP para mensajes.

- `src/modules/types.ts`
  Tipos principales del dominio.

## Enrutamiento

Se usa `HashRouter`, por lo que las rutas visibles se comportan como:

- `#/login`
- `#/`
- `#/conversations/:id`

No cambiar a `BrowserRouter` sin revisar despliegue y backend.

## Flujo de datos de conversaciones

1. `useConversations` obtiene conversaciones desde `getConversations`.
2. `conversationsApi.ts` transforma la respuesta del backend al tipo `Conversation`.
3. `useConversations` aplica filtros y sorting.
4. `ConversationsPage` renderiza la lista.
5. `useConversationPolling` aplica actualizaciones incrementales sin reemplazar todo el arreglo.

## Reglas importantes del dominio actual

### Estados de conversación

Los estados en frontend son:

- `active`
- `waiting_human`
- `closed`

### Significado práctico

- `active`
  Conversación todavía en bot / automatización.

- `waiting_human`
  Conversación tomada o esperando atención humana.

- `closed`
  Conversación cerrada.

### Filtro de flujo

El filtro de flujo solo aplica cuando el estado seleccionado es `active`.

Reglas actuales:

- La barra de flujo solo se muestra en `Activo`.
- Ya no se muestra en `Todos`.
- Si el usuario sale de `Activo`, el `flowFilter` debe resetearse a `all`.
- Nunca aplicar `flowFilter` cuando el estado actual no sea `active`.

Esto es importante porque ya existió un bug donde el filtro de flujo seguía afectando tabs como `En espera`.

## Polling

El polling vive en `src/hooks/useConversationPolling.ts`.

Comportamiento actual:

- corre cada 20 segundos
- usa `GET /conversations/updates?since=timestamp`
- si el endpoint devuelve updates mínimos como `{ id, updatedAt }`, el hook hace hidratación adicional con `getConversations()`
- hace merge incremental
- mueve conversaciones actualizadas al inicio
- evita múltiples intervalos
- limpia el intervalo al desmontar

No mover esta lógica al componente visual.

## Notificaciones

La app usa la Notification API del navegador.

Reglas actuales:

- si la conversación no tiene `assignedTo`, la notificación puede llegar a cualquier usuario logueado
- si sí tiene `assignedTo`, solo se notifica al usuario asignado
- no se notifica si el usuario está viendo esa conversación abierta
- ya no existe sonido personalizado en frontend; solo se usa la notificación nativa del navegador

## Contrato importante de `lastMessage`

El backend puede enviar `lastMessage` como objeto o `null`.

Ejemplo:

```json
"lastMessage": {
  "id": "67e8a8f1b9d2f3a1c4d5e701",
  "from": "user",
  "type": "text",
  "content": "Hola, quiero cotizar 50 piezas",
  "createdAt": "2026-03-30T10:01:00.000Z"
}
```

O:

```json
"lastMessage": null
```

El mapper en `src/api/conversationsApi.ts` debe soportar:

- `lastMessageId`
- `lastMessageSender`
- preview de `lastMessage`
- `lastMessageAt`

Si no hay contenido, el fallback visual actual es `Sin mensajes`.

## Convenciones para tocar API mappings

Antes de cambiar UI, revisar si el problema realmente está en el mapper de `src/api/conversationsApi.ts`.

Muchos bugs de listado vienen de aquí:

- `lastMessage` llega como objeto y no como string
- `_id` e `id` pueden variar
- `assignedTo` puede venir ausente
- `lastMessageSender` puede venir con otro nombre

Cuando se toque el mapper:

- preferir funciones pequeñas de normalización
- mantener fallbacks seguros
- no asumir que backend siempre manda todos los campos

## Convenciones UI

- mantener el estilo actual móvil-first
- preservar componentes de `shadcn/ui`
- evitar rediseños grandes si la tarea es funcional
- usar textos en español, porque la UI actual está en español

## Convenciones de estado local

- este proyecto usa bastante `useState`, `useEffect`, `useMemo`, `useCallback`
- no introducir herramientas nuevas de estado global sin necesidad
- no reemplazar todo el arreglo de conversaciones si solo hay updates parciales
- preferir updates optimistas cuando ya existe ese patrón

## Cosas sensibles

### `useConversations`

Es un hook muy importante. Cambios aquí afectan:

- listado principal
- filtros
- detalle
- acciones de conversación
- polling

Antes de tocarlo, revisar:

- dependencias de hooks
- reseteos de filtros
- actualizaciones optimistas

### `ConversationDetailPage`

Aquí ya existe lógica de:

- tomar conversación
- cerrar conversación
- eliminar conversación
- mostrar lead panel

No asumir que `active` significa “humano atendiendo”; en este proyecto significa lo contrario.

## Qué revisar antes de implementar cambios

1. Si el problema está en UI o en el mapper de API.
2. Si el filtro depende del estado activo actual.
3. Si el polling puede romper sorting o duplicar conversaciones.
4. Si una notificación depende de `assignedTo`.
5. Si backend devuelve `_id` o `id`.

## Recomendaciones para otra IA

- Haz cambios pequeños y localizados.
- Si algo “no se muestra”, primero inspecciona el mapper de `conversationsApi.ts`.
- Si algo “desaparece al cambiar de tab”, revisa filtros persistentes en `useConversations.ts`.
- Si algo “se actualiza pero no notifica”, revisa condiciones del polling antes de tocar permisos del navegador.
- Si necesitas agregar un nuevo campo del backend, primero intégralo en `types.ts` y luego en el mapper.

## Archivo más probable para cada tipo de cambio

- Nuevo endpoint de conversaciones:
  `src/api/conversationsApi.ts`

- Ajuste de filtro del inbox:
  `src/hooks/useConversations.ts`

- Cambio visual en lista:
  `src/components/ConversationItem.tsx`

- Cambio visual en detalle:
  `src/pages/ConversationDetailPage.tsx`

- Ajuste de notificaciones o updates:
  `src/hooks/useConversationPolling.ts`

## Nota final

Si una tarea parece sencilla pero afecta:

- filtros
- polling
- mapping de backend
- asignación de conversaciones

entonces revisa primero `useConversations.ts`, `useConversationPolling.ts` y `conversationsApi.ts` antes de editar componentes visuales.
