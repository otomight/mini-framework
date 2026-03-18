// Hash-based client-side router

export class Router {
	private routes: Map<string, () => void>

	constructor() {
		this.routes = new Map()
	}

	/**
	 * Register a route handler for a given path (e.g. '/', '/active').
	 * Returns `this` for chaining.
	 */
	on(path: string, callback: () => void): this {
		this.routes.set(path, callback)
		return this
	}

	/**
	 * Start the router: listen for hash changes and immediately dispatch
	 * the current route.
	 */
	start(): void {
		const dispatch = () => {
			const path = this.getCurrentPath()
			const handler = this.routes.get(path)
			if (handler) {
				handler()
			}
		}

		window.addEventListener('hashchange', dispatch)
		window.addEventListener('popstate', dispatch)

		// Dispatch immediately for the current URL
		dispatch()
	}

	/**
	 * Navigate to a path by updating the hash portion of the URL.
	 */
	navigate(path: string): void {
		location.hash = '#' + path
	}

	/**
	 * Return the current hash path, defaulting to '/' when the hash is empty.
	 */
	getCurrentPath(): string {
		const hash = location.hash
		if (!hash || hash === '#') return '/'
		// Strip the leading '#'
		return hash.slice(1) || '/'
	}
}
