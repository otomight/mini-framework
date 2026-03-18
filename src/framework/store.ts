// State management store

export class Store<T extends object> {
	private state: T
	private listeners: Set<(state: T) => void>

	constructor(initialState: T) {
		this.state = { ...initialState }
		this.listeners = new Set()
	}

	/**
	 * Return a shallow copy of the current state.
	 */
	getState(): T {
		return this.state
	}

	/**
	 * Update state with a partial object or an updater function.
	 * Notifies all subscribers after the update.
	 */
	setState(updater: Partial<T> | ((state: T) => Partial<T>)): void {
		const partial = typeof updater === 'function' ? updater(this.state) : updater
		this.state = { ...this.state, ...partial }
		for (const listener of this.listeners) {
			listener(this.state)
		}
	}

	/**
	 * Subscribe to state changes. Returns an unsubscribe function.
	 */
	subscribe(listener: (state: T) => void): () => void {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}
}
