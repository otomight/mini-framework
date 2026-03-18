// TodoMVC application built with mini-framework

import { h, mount as mountVNode, patch, VNode } from '../framework/vdom'
import { Store } from '../framework/store'
import { Router } from '../framework/router'

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

interface Todo {
	id: number
	text: string
	completed: boolean
}

interface AppState {
	todos: Todo[]
	filter: 'all' | 'active' | 'completed'
	editingId: number | null
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const store = new Store<AppState>({
	todos: [],
	filter: 'all',
	editingId: null,
})

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = new Router()

router
	.on('/', () => store.setState({ filter: 'all' }))
	.on('/active', () => store.setState({ filter: 'active' }))
	.on('/completed', () => store.setState({ filter: 'completed' }))

// ---------------------------------------------------------------------------
// Unique id counter
// ---------------------------------------------------------------------------

let nextId = 1

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function renderTodoItem(todo: Todo, editingId: number | null): VNode {
	const isEditing = editingId === todo.id
	const classes = [
		'todo',
		todo.completed ? 'completed' : '',
		isEditing ? 'editing' : '',
	]
		.filter(Boolean)
		.join(' ')

	return h(
		'li',
		{ class: classes },
		null,
		h(
			'div',
			{ class: 'view' },
			null,
			h('input', { class: 'toggle', type: 'checkbox', checked: todo.completed }, {
				change: () => {
					store.setState((s) => ({
						todos: s.todos.map((t) =>
							t.id === todo.id ? { ...t, completed: !t.completed } : t
						),
					}))
				},
			}),
			h(
				'label',
				{},
				{
					dblclick: () => {
						store.setState({ editingId: todo.id })
					},
				},
				todo.text
			),
			h('button', { class: 'destroy' }, {
				click: () => {
					store.setState((s) => ({
						todos: s.todos.filter((t) => t.id !== todo.id),
					}))
				},
			})
		),
		h('input', { class: 'edit', value: todo.text }, {
			blur: (e: Event) => {
				const input = e.target as HTMLInputElement
				const text = input.value.trim()
				store.setState((s) => ({
					editingId: null,
					todos: text
						? s.todos.map((t) => (t.id === todo.id ? { ...t, text } : t))
						: s.todos.filter((t) => t.id !== todo.id),
				}))
			},
			keydown: (e: Event) => {
				const ke = e as KeyboardEvent
				if (ke.key === 'Enter') {
					const input = ke.target as HTMLInputElement
					const text = input.value.trim()
					store.setState((s) => ({
						editingId: null,
						todos: text
							? s.todos.map((t) => (t.id === todo.id ? { ...t, text } : t))
							: s.todos.filter((t) => t.id !== todo.id),
					}))
				} else if (ke.key === 'Escape') {
					store.setState({ editingId: null })
				}
			},
		})
	)
}

function renderApp(state: AppState): VNode {
	const { todos, filter, editingId } = state

	const filteredTodos = todos.filter((t) => {
		if (filter === 'active') return !t.completed
		if (filter === 'completed') return t.completed
		return true
	})

	const activeCount = todos.filter((t) => !t.completed).length
	const completedCount = todos.filter((t) => t.completed).length
	const allCompleted = todos.length > 0 && todos.every((t) => t.completed)

	const todoItems = filteredTodos.map((t) => renderTodoItem(t, editingId))

	const mainSection = h(
		'section',
		{ class: 'main', hidden: todos.length === 0 ? true : undefined },
		null,
		h('input', { id: 'toggle-all', class: 'toggle-all', type: 'checkbox', checked: allCompleted }, {
			change: () => {
				const targetCompleted = !allCompleted
				store.setState((s) => ({
					todos: s.todos.map((t) => ({ ...t, completed: targetCompleted })),
				}))
			},
		}),
		h('label', { for: 'toggle-all' }, null, 'Mark all as complete'),
		h('ul', { class: 'todo-list' }, null, ...todoItems)
	)

	const clearBtn = h(
		'button',
		{ class: 'clear-completed', hidden: completedCount === 0 ? true : undefined },
		{
			click: () => {
				store.setState((s) => ({
					todos: s.todos.filter((t) => !t.completed),
				}))
			},
		},
		'Clear completed'
	)

	const footerSection = h(
		'footer',
		{ class: 'footer', hidden: todos.length === 0 ? true : undefined },
		null,
		h(
			'span',
			{ class: 'todo-count' },
			null,
			h('strong', {}, null, String(activeCount)),
			` item${activeCount === 1 ? '' : 's'} left`
		),
		h(
			'ul',
			{ class: 'filters' },
			null,
			h(
				'li',
				{},
				null,
				h(
					'a',
					{ href: '#/', class: filter === 'all' ? 'selected' : undefined },
					null,
					'All'
				)
			),
			h(
				'li',
				{},
				null,
				h(
					'a',
					{ href: '#/active', class: filter === 'active' ? 'selected' : undefined },
					null,
					'Active'
				)
			),
			h(
				'li',
				{},
				null,
				h(
					'a',
					{ href: '#/completed', class: filter === 'completed' ? 'selected' : undefined },
					null,
					'Completed'
				)
			)
		),
		clearBtn
	)

	const headerSection = h(
		'header',
		{ class: 'header' },
		null,
		h('h1', {}, null, 'todos'),
		h('input', { class: 'new-todo', placeholder: 'What needs to be done?', autofocus: true }, {
			keydown: (e: Event) => {
				const ke = e as KeyboardEvent
				if (ke.key === 'Enter') {
					const input = ke.target as HTMLInputElement
					const text = input.value.trim()
					if (text) {
						store.setState((s) => ({
							todos: [...s.todos, { id: nextId++, text, completed: false }],
						}))
						input.value = ''
					}
				}
			},
		})
	)

	return h(
		'div',
		{},
		null,
		h(
			'section',
			{ class: 'todoapp' },
			null,
			headerSection,
			mainSection,
			footerSection
		),
		h(
			'footer',
			{ class: 'info' },
			null,
			h('p', {}, null, 'Double-click to edit a todo'),
			h('p', {}, null, 'Created with mini-framework')
		)
	)
}

// ---------------------------------------------------------------------------
// App initialisation
// ---------------------------------------------------------------------------

export function initApp(container: Element): void {
	let currentVNode: VNode | null = null

	function render(): void {
		const state = store.getState()
		const newVNode = renderApp(state)

		if (currentVNode === null) {
			mountVNode(newVNode, container)
		} else {
			patch(container, currentVNode, newVNode)
		}

		currentVNode = newVNode

		// After re-render, focus the edit input for the todo being edited
		if (state.editingId !== null) {
			const editInput = document.querySelector<HTMLInputElement>('.todo.editing .edit')
			if (editInput) {
				editInput.focus()
				// Place cursor at end of text
				const len = editInput.value.length
				editInput.setSelectionRange(len, len)
			}
		}
	}

	store.subscribe(() => render())

	// Start router — route callbacks call store.setState which triggers render
	// We need initial render before router so we render once first, then router
	// will trigger another render via setState.  To avoid double-render on
	// startup, we start router first so its setState triggers the first render.
	router.start()

	// If the router didn't trigger a render (e.g. no matching route), render now
	if (currentVNode === null) {
		render()
	}
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const container = document.getElementById('app')!
initApp(container)
