export class Router {
	private routes: Map<string, () => void>

	constructor() {
		this.routes = new Map()
	}

	// Register a route handler for a given path.
	on(path: string, callback: () => void): this {
		this.routes.set(path, callback)
		return this
	}

	// Start the router and listen for hash changes.
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


	getCurrentPath(): string {
		const hash = location.hash
		if (!hash || hash === '#') return '/'
		// Strip the leading '#'
		return hash.slice(1) || '/'
	}
}
