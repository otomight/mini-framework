export type VNodeAttrs = Record<string, string | boolean | number | undefined>
export type EventMap = Record<string, (e: Event) => void>

export interface VNode {
	tag: string
	attrs: VNodeAttrs
	events: EventMap
	children: (VNode | string)[]
	el?: Element | Text
}

// Boolean properties that must be set as DOM properties, not HTML attributes
const BOOL_PROPS = new Set(['checked', 'disabled', 'selected', 'multiple', 'readonly', 'required', 'open'])


// Create a VNode
export function h(
	tag: string,
	attrs?: VNodeAttrs | null,
	events?: EventMap | null,
	...children: (VNode | string | null | undefined | false)[]
): VNode {
	return {
		tag,
		attrs: attrs ?? {},
		events: events ?? {},
		children: children.filter((c): c is VNode | string => c !== null && c !== undefined && c !== false),
	}
}


function setAttr(el: Element, key: string, value: string | boolean | number | undefined): void {
	if (BOOL_PROPS.has(key)) {
		(el as unknown as Record<string, boolean | string | number | undefined>)[key] = value === true || value === 'true' || value === key
		return
	}
	if (value === false || value === undefined) {
		el.removeAttribute(key)
	} else if (value === true) {
		el.setAttribute(key, '')
	} else {
		el.setAttribute(key, String(value))
	}
}


function removeAttr(el: Element, key: string): void {
	if (BOOL_PROPS.has(key)) {
		(el as unknown as Record<string, boolean>)[key] = false
		return
	}
	el.removeAttribute(key)
}


function createElement(vnode: VNode | string): Element | Text {
	if (typeof vnode === 'string') {
		return document.createTextNode(vnode)
	}

	const el = document.createElement(vnode.tag)

	// Set attributes
	for (const [key, value] of Object.entries(vnode.attrs)) {
		setAttr(el, key, value)
	}

	// Attach events
	for (const [event, handler] of Object.entries(vnode.events)) {
		el.addEventListener(event, handler)
	}

	// Recurse into children
	for (const child of vnode.children) {
		const childEl = createElement(child)
		el.appendChild(childEl)
		if (typeof child !== 'string') {
			child.el = childEl
		}
	}

	vnode.el = el
	return el
}


// Append Vnode to a container.
export function mount(vnode: VNode, container: Element): void {
	const el = createElement(vnode)
	container.appendChild(el)
	vnode.el = el
}


function replaceWith(container: Element, oldEl: Element | Text, newVNode: VNode | string): Element | Text {
	const newEl = createElement(newVNode)
	container.replaceChild(newEl, oldEl)
	if (typeof newVNode !== 'string') {
		newVNode.el = newEl
	}
	return newEl
}


// Patch two VNode trees and apply minimal changes to the real DOM.
export function patch(
	container: Element,
	oldVNode: VNode | string | null,
	newVNode: VNode | string | null
): void {
	// null old: create and append
	if (oldVNode === null && newVNode !== null) {
		const el = createElement(newVNode)
		container.appendChild(el)
		if (typeof newVNode !== 'string') {
			newVNode.el = el
		}
		return
	}

	// null new: remove old element
	if (newVNode === null && oldVNode !== null) {
		const oldEl = typeof oldVNode === 'string'
			? findTextNode(container, oldVNode)
			: oldVNode.el
		if (oldEl && oldEl.parentNode === container) {
			container.removeChild(oldEl)
		}
		return
	}

	if (oldVNode === null || newVNode === null) return

	// strings handled by patchAt
	if (typeof oldVNode === 'string' || typeof newVNode === 'string') {
		return
	}

	const oldEl = oldVNode.el
	if (!oldEl) {
		// No existing element, just create
		const el = createElement(newVNode)
		container.appendChild(el)
		newVNode.el = el
		return
	}

	// Tag mismatch: replace entirely
	if (oldVNode.tag !== newVNode.tag) {
		replaceWith(container, oldEl as Element, newVNode)
		return
	}

	// Same tag
	const el = oldEl as Element
	newVNode.el = el

	// Patch attributes: remove old attrs not in new, set new/changed attrs
	for (const key of Object.keys(oldVNode.attrs)) {
		if (!(key in newVNode.attrs) || newVNode.attrs[key] === false || newVNode.attrs[key] === undefined) {
			removeAttr(el, key)
		}
	}
	for (const [key, value] of Object.entries(newVNode.attrs)) {
		const oldValue = oldVNode.attrs[key]
		if (oldValue !== value) {
			setAttr(el, key, value)
		} else if (BOOL_PROPS.has(key)) {
			// Always sync boolean properties to keep DOM in sync
			setAttr(el, key, value)
		}
	}

	// Remove old event listeners
	for (const [event, handler] of Object.entries(oldVNode.events)) {
		el.removeEventListener(event, handler)
	}

	// Add new event listeners
	for (const [event, handler] of Object.entries(newVNode.events)) {
		el.addEventListener(event, handler)
	}

	// Patch children
	patchChildren(el, oldVNode.children, newVNode.children)
}

// Find the first text node in container whose data matches text.
// Used as a fallback; patchAt handles text nodes via indexed child nodes.
function findTextNode(container: Element, text: string): Text | null {
	for (const child of Array.from(container.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE && (child as Text).data === text) {
			return child as Text
		}
	}
	return null
}

/**
 * Reconcile two child arrays against a parent element, index by index.
 */
function patchChildren(
	parent: Element,
	oldChildren: (VNode | string)[],
	newChildren: (VNode | string)[]
): void {
	// First, remove extra old children from the end
	const extra = oldChildren.length - newChildren.length
	if (extra > 0) {
		for (let i = 0; i < extra; i++) {
			const oldChild = oldChildren[oldChildren.length - 1 - i]
			const oldEl = typeof oldChild === 'string'
				? parent.childNodes[oldChildren.length - 1 - i]
				: oldChild.el
			if (oldEl && oldEl.parentNode === parent) {
				parent.removeChild(oldEl)
			}
		}
	}

	// Then patch each new child at its index
	for (let i = 0; i < newChildren.length; i++) {
		patchAt(parent, i, oldChildren[i] ?? null, newChildren[i])
	}
}

// Patch child at index of parent.
function patchAt(
	parent: Element,
	index: number,
	oldChild: VNode | string | null,
	newChild: VNode | string
): void {
	// No old child: create and append (or insert at position)
	if (oldChild === null) {
		const el = createElement(newChild)
		const refNode = parent.childNodes[index]
		if (refNode) {
			parent.insertBefore(el, refNode)
		} else {
			parent.appendChild(el)
		}
		if (typeof newChild !== 'string') {
			newChild.el = el
		}
		return
	}

	// Both strings
	if (typeof oldChild === 'string' && typeof newChild === 'string') {
		if (oldChild !== newChild) {
			const textNode = parent.childNodes[index]
			if (textNode && textNode.nodeType === Node.TEXT_NODE) {
				(textNode as Text).data = newChild
			}
		}
		return
	}

	// Type mismatch (string vs VNode or vice versa): replace
	if (typeof oldChild === 'string' || typeof newChild === 'string') {
		const oldEl = parent.childNodes[index]
		const newEl = createElement(newChild)
		if (oldEl) {
			parent.replaceChild(newEl, oldEl)
		} else {
			parent.appendChild(newEl)
		}
		if (typeof newChild !== 'string') {
			newChild.el = newEl
		}
		return
	}

	// Both are VNodes
	const oldEl = oldChild.el
	if (!oldEl) {
		const el = createElement(newChild)
		const refNode = parent.childNodes[index]
		if (refNode) {
			parent.insertBefore(el, refNode)
		} else {
			parent.appendChild(el)
		}
		newChild.el = el
		return
	}

	// Tag mismatch: replace
	if (oldChild.tag !== newChild.tag) {
		const newEl = createElement(newChild)
		parent.replaceChild(newEl, oldEl)
		newChild.el = newEl
		return
	}

	// Same tag: patch in place
	const el = oldEl as Element
	newChild.el = el

	// Patch attributes
	for (const key of Object.keys(oldChild.attrs)) {
		if (!(key in newChild.attrs) || newChild.attrs[key] === false || newChild.attrs[key] === undefined) {
			removeAttr(el, key)
		}
	}
	for (const [key, value] of Object.entries(newChild.attrs)) {
		const oldValue = oldChild.attrs[key]
		if (oldValue !== value) {
			setAttr(el, key, value)
		} else if (BOOL_PROPS.has(key)) {
			setAttr(el, key, value)
		}
	}

	// Remove old event listeners, add new ones
	for (const [event, handler] of Object.entries(oldChild.events)) {
		el.removeEventListener(event, handler)
	}
	for (const [event, handler] of Object.entries(newChild.events)) {
		el.addEventListener(event, handler)
	}

	// Recurse
	patchChildren(el, oldChild.children, newChild.children)
}
