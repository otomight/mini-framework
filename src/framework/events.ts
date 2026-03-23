type Handler<T = unknown> = (payload: T) => void

export class EventBus {
	private channels: Map<string, Set<Handler>>

	constructor() {
		this.channels = new Map()
	}

	// Subscribe to an event
	on<T>(event: string, handler: Handler<T>): () => void {
		if (!this.channels.has(event)) {
			this.channels.set(event, new Set())
		}
		const set = this.channels.get(event)! as Set<Handler<unknown>>
		const h = handler as Handler<unknown>
		set.add(h)
		return () => {
			set.delete(h)
		}
	}

	// Emit an event, calling all registered handlers with the payload.
	emit<T>(event: string, payload?: T): void {
		const set = this.channels.get(event)
		if (set) {
			for (const handler of set) {
				handler(payload as unknown)
			}
		}
	}
}

