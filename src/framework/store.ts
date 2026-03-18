export class Store<T extends object> {
	private state: T
	private listeners: Set<(state: T) => void>

	constructor(initialState: T) {
		this.state = { ...initialState }
		this.listeners = new Set()
	}

	getState(): T {
		return this.state
	}

	// Update state with a partial object or an updater function.
	setState(updater: Partial<T> | ((state: T) => Partial<T>)): void {
		const partial = typeof updater === 'function' ? updater(this.state) : updater
		this.state = { ...this.state, ...partial }
		// notify listeners
		for (const listener of this.listeners) {
			listener(this.state)
		}
	}

	// Subscribe to state changes.
	subscribe(listener: (state: T) => void): () => void {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}
}
