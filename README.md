# mini-framework

A small JavaScript framework built with TypeScript. No external libraries. Comes with a TodoMVC demo.

## Features

- **Virtual DOM** — describe your UI with JS objects, the framework updates only what changed in the real DOM
- **State** — a simple store that notifies your app when data changes
- **Router** — URL hash-based navigation (`#/`, `#/active`, `#/completed`)
- **Events** — a publish/subscribe system for communication between parts of your app

## How it works

You describe your UI with `h()`, which returns a plain object (a virtual node). When you call `mount()`, it builds the real DOM from that object. When state changes, you call `patch()` with the old and new virtual node — it compares them and only updates what actually changed.

State lives in a `Store`. When you call `setState()`, all subscribers are notified and can re-render.

The `Router` watches the URL hash and calls the right function when it changes.

The `EventBus` lets any part of the app send and receive messages without being directly connected.

## Usage

### Create an element

```ts
import { h, mount } from './framework'

const el = h('p', {}, null, 'Hello world')
mount(el, document.getElementById('app')!)
```

### Add attributes

```ts
h('input', { type: 'text', placeholder: 'What needs to be done?', autofocus: true }, null)
```

### Handle events

```ts
h('button', {}, { click: (e) => console.log('clicked!') }, 'Click me')
```

### Nest elements

```ts
h('ul', { class: 'todo-list' }, null,
  h('li', {}, null, 'Buy milk'),
  h('li', {}, null, 'Walk the dog'),
)
```

### State

```ts
import { Store } from './framework'

const store = new Store({ count: 0 })

store.subscribe((state) => console.log(state.count))

store.setState({ count: 1 })             // pass an object
store.setState(s => ({ count: s.count + 1 }))  // or a function
```

### Routing

```ts
import { Router } from './framework'

const router = new Router()

router
  .on('/', () => showAll())
  .on('/active', () => showActive())
  .on('/completed', () => showCompleted())

router.start()
```

### EventBus

```ts
import { eventBus } from './framework'

eventBus.on('todo:added', (text) => console.log('new todo:', text))
eventBus.emit('todo:added', 'Buy groceries')

// unsubscribe
const unsub = eventBus.on('app:reset', () => reset())
unsub()
```

## Run the demo

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).
