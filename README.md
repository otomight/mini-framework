# mini-framework

A lightweight JavaScript framework written in TypeScript, featuring a Virtual DOM, reactive state management, hash-based routing, and a custom event system. Demonstrated with a fully functional TodoMVC application.

---

## Table of contents

1. [Overview](#overview)
2. [Virtual DOM — `h`, `mount`, `patch`](#virtual-dom)
   - [Creating elements with `h()`](#creating-elements-with-h)
   - [Adding attributes](#adding-attributes)
   - [Nesting elements](#nesting-elements)
   - [Handling events declaratively](#handling-events-declaratively)
3. [Event system — `EventBus` and `delegate`](#event-system)
   - [EventBus](#eventbus)
   - [DOM event delegation](#dom-event-delegation)
4. [Routing — `Router`](#routing)
5. [State management — `Store`](#state-management)
6. [Putting it all together](#putting-it-all-together)

---

## Overview

| Module | Export | Purpose |
|--------|--------|---------|
| `vdom.ts` | `h`, `mount`, `patch` | Virtual DOM diffing and rendering |
| `store.ts` | `Store` | Reactive state container |
| `router.ts` | `Router` | Hash-based client-side routing |
| `events.ts` | `EventBus`, `eventBus`, `delegate` | Pub/sub messaging and DOM delegation |

Everything is re-exported from `src/framework/index.ts`:

```typescript
import { h, mount, patch, Store, Router, EventBus, eventBus, delegate } from './framework'
```

---

## Virtual DOM

The virtual DOM gives you a fast, declarative way to describe your UI. You build a lightweight object tree with `h()`, mount it once with `mount()`, and update it efficiently with `patch()`.

### Core types

```typescript
type VNodeAttrs = Record<string, string | boolean | number | undefined>
type EventMap  = Record<string, (e: Event) => void>

interface VNode {
  tag:      string
  attrs:    VNodeAttrs
  events:   EventMap
  children: (VNode | string)[]
  _el?:     Element | Text  // set internally after mounting
}
```

---

### Creating elements with `h()`

```
h(tag, attrs?, events?, ...children)
```

| Parameter  | Type | Description |
|------------|------|-------------|
| `tag`      | `string` | HTML tag name, e.g. `'div'`, `'input'` |
| `attrs`    | `VNodeAttrs \| null` | HTML attributes / DOM properties |
| `events`   | `EventMap \| null` | Event handlers (see below) |
| `children` | `VNode \| string` | Zero or more child nodes |

**Simple text node**

```typescript
const greeting = h('p', {}, null, 'Hello, world!')
// → <p>Hello, world!</p>
```

**No attrs or events**

Pass `null` (or `{}`) to omit attrs/events when you only care about children:

```typescript
const title = h('h1', null, null, 'todos')
```

---

### Adding attributes

Attributes are plain key/value pairs in the second argument.

```typescript
// String attribute
h('a', { href: '#/active', class: 'selected' }, null, 'Active')
// → <a href="#/active" class="selected">Active</a>

// Numeric attribute
h('input', { tabindex: 1 }, null)

// Boolean attribute — true sets it as an empty attribute, false removes it
h('input', { disabled: true }, null)   // → <input disabled>
h('input', { disabled: false }, null)  // attribute is omitted entirely

// Boolean DOM properties (checked, selected, disabled, readonly, required…)
// are set directly on the element object, not as HTML attributes:
h('input', { type: 'checkbox', checked: true }, null)
// el.checked = true

// undefined removes the attribute
h('li', { class: isEditing ? 'editing' : undefined }, null)
```

---

### Nesting elements

Pass child VNodes (or plain strings) as additional arguments after `events`:

```typescript
const list = h(
  'ul', { class: 'todo-list' }, null,
  h('li', { class: 'todo' }, null,
    h('span', {}, null, 'Buy milk')
  ),
  h('li', { class: 'todo completed' }, null,
    h('span', {}, null, 'Walk the dog')
  )
)
```

Renders:

```html
<ul class="todo-list">
  <li class="todo"><span>Buy milk</span></li>
  <li class="todo completed"><span>Walk the dog</span></li>
</ul>
```

---

### Handling events declaratively

Pass an `EventMap` as the third argument to attach listeners to a VNode. The keys are standard DOM event names (without the `on` prefix).

```typescript
h('button', { class: 'destroy' }, {
  click: (e: Event) => {
    console.log('destroy clicked', e)
  },
})
```

Multiple events on one element:

```typescript
h('input', { class: 'edit' }, {
  blur: (e: Event) => saveEdit(e),
  keydown: (e: Event) => {
    const ke = e as KeyboardEvent
    if (ke.key === 'Enter') saveEdit(e)
    if (ke.key === 'Escape') cancelEdit()
  },
})
```

During `patch()`, the framework removes all old event listeners from the previous VNode and attaches the new ones, so you never accumulate stale handlers.

---

### Mounting and patching

```typescript
import { h, mount, patch } from './framework'

const container = document.getElementById('app')!

// First render
let vnode = h('p', {}, null, 'Count: 0')
mount(vnode, container)

// Update — only the changed text node is touched in the real DOM
let prev = vnode
vnode = h('p', {}, null, 'Count: 1')
patch(container, prev, vnode)
```

`patch` implements index-based reconciliation:

1. If `oldVNode` is `null` → create and append.
2. If `newVNode` is `null` → remove old element.
3. Both strings, same value → no-op; different → update `textContent`.
4. Type or tag mismatch → replace the old element entirely.
5. Same tag → diff attributes, swap event listeners, recurse into children.
   - Extra old children are removed from the end first.
   - Each remaining position is patched in order.

---

## Event system

### EventBus

A lightweight pub/sub bus decoupled from the DOM. Useful for cross-component communication.

```typescript
import { EventBus, eventBus } from './framework'

// Using the global singleton
eventBus.on<string>('todo:added', (text) => {
  console.log('New todo:', text)
})

eventBus.emit<string>('todo:added', 'Buy groceries')

// Unsubscribe via the returned function
const unsub = eventBus.on('app:reset', () => resetState())
unsub()   // stops listening

// Or remove explicitly
function onReset() { resetState() }
eventBus.on('app:reset', onReset)
eventBus.off('app:reset', onReset)
```

You can also create a scoped bus instead of using the global singleton:

```typescript
const bus = new EventBus()
bus.on('tick', (n: unknown) => console.log(n))
bus.emit('tick', 42)
```

---

### DOM event delegation

`delegate` attaches a **single** listener on a root element that handles events bubbling up from any descendant matching a CSS selector. This is more efficient than attaching individual listeners to each child, and it automatically handles dynamically added children.

```typescript
import { delegate } from './framework'

const list = document.querySelector('.todo-list')!

// One listener handles clicks on every .destroy button inside the list
const cleanup = delegate(list, '.destroy', 'click', (e, target) => {
  console.log('destroy button clicked', target)
})

// Later, remove the delegated listener
cleanup()
```

`delegate` uses `Element.closest()` internally, so it works even when the event originates on a child of the matched element.

---

## Routing

`Router` is a hash-based router. It reads `location.hash` and calls the registered handler for the matching path. It listens for both `hashchange` and `popstate` events.

```typescript
import { Router } from './framework'

const router = new Router()

router
  .on('/', () => showAll())
  .on('/active', () => showActive())
  .on('/completed', () => showCompleted())

router.start()  // dispatches current route immediately, then listens for changes
```

**Navigate programmatically:**

```typescript
router.navigate('/active')   // sets location.hash = '#/active'
```

**Read the current path:**

```typescript
router.getCurrentPath()   // → '/', '/active', '/completed', etc.
```

The path stored in `location.hash` is `#/foo`; `getCurrentPath()` strips the leading `#` and returns `/foo`. An empty or bare `#` hash returns `'/'`.

---

## State management

`Store<T>` wraps your application state behind a controlled API. Every call to `setState` notifies all subscribers synchronously.

```typescript
import { Store } from './framework'

interface CounterState {
  count: number
  label: string
}

const store = new Store<CounterState>({ count: 0, label: 'counter' })

// Read state
console.log(store.getState().count)  // 0

// Update with a partial object
store.setState({ count: 1 })

// Update with a function (receives current state, returns partial)
store.setState((s) => ({ count: s.count + 1 }))

// Subscribe to changes — returns unsubscribe
const unsub = store.subscribe((state) => {
  console.log('state changed', state)
})

store.setState({ count: 99 })  // subscriber fires
unsub()
store.setState({ count: 100 }) // subscriber no longer fires
```

`setState` performs a shallow merge, so you only need to pass the keys you want to change.

---

## Putting it all together

Below is a minimal counter app showing all four features working together.

```typescript
import { h, mount, patch, Store, Router, eventBus } from './framework'
import type { VNode } from './framework'

interface State { count: number; step: number }

const store = new Store<State>({ count: 0, step: 1 })
const router = new Router()

router
  .on('/', () => store.setState({ step: 1 }))
  .on('/by5', () => store.setState({ step: 5 }))

let current: VNode | null = null
const root = document.getElementById('app')!

function render() {
  const { count, step } = store.getState()

  const next = h(
    'div', {}, null,
    h('p', {}, null, `Count: ${count}`),
    h('button', {}, { click: () => store.setState(s => ({ count: s.count + s.step })) }, `+${step}`),
    h('button', {}, { click: () => store.setState(s => ({ count: s.count - s.step })) }, `-${step}`),
    h('nav', {}, null,
      h('a', { href: '#/' }, null, 'step 1'),
      h('a', { href: '#/by5' }, null, 'step 5'),
    )
  )

  if (current === null) {
    mount(next, root)
  } else {
    patch(root, current, next)
  }
  current = next
}

store.subscribe(render)

// EventBus: log every state change
eventBus.on('state:changed', (msg: unknown) => console.log(msg))
store.subscribe(() => eventBus.emit('state:changed', store.getState()))

router.start()  // fires setState → triggers first render
```

---

## Running the TodoMVC demo

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build
```
