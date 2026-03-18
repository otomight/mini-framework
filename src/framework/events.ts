// Custom event system: EventBus and DOM event delegation

type Handler<T = unknown> = (payload: T) => void

export class EventBus {
	private channels: Map<string, Set<Handler>>

	constructor() {
		this.channels = new Map()
	}

	/**
	 * Subscribe to an event. Returns an unsubscribe function.
	 */
	on<T>(event: string, handler: Handler<T>): () => void {
		if (!this.channels.has(event)) {
			this.channels.set(event, new Set())
		}
		// Cast: the internal set stores Handler<unknown>, which is safe for emission
		const set = this.channels.get(event)! as Set<Handler<unknown>>
		const h = handler as Handler<unknown>
		set.add(h)
		return () => {
			set.delete(h)
		}
	}

	/**
	 * Remove a specific handler from an event.
	 */
	off<T>(event: string, handler: Handler<T>): void {
		const set = this.channels.get(event) as Set<Handler<unknown>> | undefined
		if (set) {
			set.delete(handler as Handler<unknown>)
		}
	}

	/**
	 * Emit an event, calling all registered handlers with the payload.
	 */
	emit<T>(event: string, payload?: T): void {
		const set = this.channels.get(event)
		if (set) {
			for (const handler of set) {
				handler(payload as unknown)
			}
		}
	}
}

/** Global singleton event bus. */
export const eventBus = new EventBus()

/**
 * Attach a delegated event listener on `root` that matches descendants
 * selected by `selector`. The handler receives both the original event
 * and the matching target element.
 *
 * Returns a cleanup function that removes the delegated listener.
 *
 * This is intentionally different from plain addEventListener — a single
 * listener on the root handles all matching children, even those added
 * after delegation is set up.
 */
export function delegate(
	root: Element,
	selector: string,
	eventType: string,
	handler: (e: Event, target: Element) => void
): () => void {
	const listener = (e: Event) => {
		const target = (e.target as Element | null)?.closest(selector)
		if (target && root.contains(target)) {
			handler(e, target)
		}
	}

	root.addEventListener(eventType, listener)

	return () => {
		root.removeEventListener(eventType, listener)
	}
}
