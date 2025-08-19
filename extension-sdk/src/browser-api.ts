/**
 * BrowserAPIHelper - Simplified wrapper for Chrome Extension APIs
 *
 * Provides easy access to common browser extension APIs:
 * - chrome.history for browsing data
 * - chrome.tabs for current tab information
 * - chrome.storage for data persistence
 * - chrome.runtime for messaging
 */

export interface BrowserAPIConfig {
	fallbackToMock?: boolean;
	maxHistoryItems?: number;
	historyTextLength?: number;
}

export interface HistoryItem {
	id: string;
	url: string;
	title: string;
	lastVisitTime: number;
	visitCount: number;
	typedCount?: number;
}

export interface TabInfo {
	id: number;
	url: string;
	title: string;
	active: boolean;
	windowId: number;
}

export class BrowserAPIHelper {
	private config: BrowserAPIConfig;
	private isExtensionContext: boolean;

	constructor(config: BrowserAPIConfig = {}) {
		this.config = {
			fallbackToMock: config.fallbackToMock ?? false,
			maxHistoryItems: config.maxHistoryItems ?? 1000,
			historyTextLength: config.historyTextLength ?? 100,
		};
		this.isExtensionContext = this.checkExtensionContext();
	}

	/**
	 * Get browsing history for the specified time range
	 */
	async getHistory(
		timeRange?: { start?: number; end?: number },
		maxResults?: number,
	): Promise<HistoryItem[]> {
		if (!this.isExtensionContext) {
			return this.getMockHistory(timeRange, maxResults);
		}

		try {
			const startTime =
				timeRange?.start || Date.now() - 7 * 24 * 60 * 60 * 1000;
			const endTime = timeRange?.end || Date.now();
			const results = await chrome.history.search({
				text: "",
				startTime,
				endTime,
				maxResults: maxResults ?? this.config.maxHistoryItems,
			});

			return results.map((item) => ({
				id: item.id || item.url || "",
				url: item.url || "",
				title: item.title || "",
				lastVisitTime: item.lastVisitTime || 0,
				visitCount: item.visitCount || 0,
				typedCount: item.typedCount || 0,
			}));
		} catch (error) {
			console.error("[BrowserAPIHelper] Error getting history:", error);
			return this.config.fallbackToMock
				? this.getMockHistory(timeRange, maxResults)
				: [];
		}
	}

	/**
	 * Get current active tabs
	 */
	async getTabs(): Promise<TabInfo[]> {
		if (!this.isExtensionContext) {
			return this.getMockTabs();
		}

		try {
			const tabs = await chrome.tabs.query({});
			return tabs.map((tab) => ({
				id: tab.id || 0,
				url: tab.url || "",
				title: tab.title || "",
				active: tab.active || false,
				windowId: tab.windowId || 0,
			}));
		} catch (error) {
			console.error("[BrowserAPIHelper] Error getting tabs:", error);
			return this.config.fallbackToMock ? this.getMockTabs() : [];
		}
	}

	/**
	 * Get active tab
	 */
	async getActiveTab(): Promise<TabInfo | null> {
		if (!this.isExtensionContext) {
			const mockTabs = this.getMockTabs();
			return mockTabs.find((tab) => tab.active) || null;
		}

		try {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const tab = tabs[0];
			if (!tab) return null;

			return {
				id: tab.id || 0,
				url: tab.url || "",
				title: tab.title || "",
				active: true,
				windowId: tab.windowId || 0,
			};
		} catch (error) {
			console.error("[BrowserAPIHelper] Error getting active tab:", error);
			return null;
		}
	}

	/**
	 * Get data from chrome.storage.local
	 */
	async getStorage<T>(key: string): Promise<T | undefined> {
		if (!this.isExtensionContext) {
			return this.getLocalStorage<T>(key);
		}

		try {
			const result = await chrome.storage.local.get(key);
			return result[key] as T;
		} catch (error) {
			console.error("[BrowserAPIHelper] Error getting storage:", error);
			return this.config.fallbackToMock
				? this.getLocalStorage<T>(key)
				: undefined;
		}
	}

	/**
	 * Set data in chrome.storage.local
	 */
	async setStorage(data: Record<string, unknown>): Promise<void> {
		if (!this.isExtensionContext) {
			this.setLocalStorage(data);
			return;
		}

		try {
			await chrome.storage.local.set(data);
		} catch (error) {
			console.error("[BrowserAPIHelper] Error setting storage:", error);
			if (this.config.fallbackToMock) {
				this.setLocalStorage(data);
			}
		}
	}

	/**
	 * Remove data from chrome.storage.local
	 */
	async removeStorage(keys: string | string[]): Promise<void> {
		if (!this.isExtensionContext) {
			this.removeLocalStorage(keys);
			return;
		}

		try {
			await chrome.storage.local.remove(keys);
		} catch (error) {
			console.error("[BrowserAPIHelper] Error removing storage:", error);
			if (this.config.fallbackToMock) {
				this.removeLocalStorage(keys);
			}
		}
	}

	/**
	 * Send message to background script
	 */
	async sendMessage<T = unknown>(message: unknown): Promise<T> {
		if (!this.isExtensionContext) {
			console.log("[BrowserAPIHelper] Mock message:", message);
			return {} as T;
		}

		try {
			return await chrome.runtime.sendMessage(message);
		} catch (error) {
			console.error("[BrowserAPIHelper] Error sending message:", error);
			throw error;
		}
	}

	/**
	 * Get current domain/hostname
	 */
	getCurrentDomain(): string {
		if (typeof window !== "undefined" && window.location) {
			return window.location.hostname;
		}
		return "localhost";
	}

	/**
	 * Check if we have required permissions
	 */
	async checkPermissions(permissions: string[]): Promise<boolean> {
		if (!this.isExtensionContext) {
			return true; // Mock environment has all permissions
		}

		try {
			return await chrome.permissions.contains({
				permissions: permissions as chrome.runtime.ManifestPermissions[],
			});
		} catch (error) {
			console.error("[BrowserAPIHelper] Error checking permissions:", error);
			return false;
		}
	}

	/**
	 * Request permissions
	 */
	async requestPermissions(permissions: string[]): Promise<boolean> {
		if (!this.isExtensionContext) {
			return true; // Mock environment grants all permissions
		}

		try {
			return await chrome.permissions.request({
				permissions: permissions as chrome.runtime.ManifestPermissions[],
			});
		} catch (error) {
			console.error("[BrowserAPIHelper] Error requesting permissions:", error);
			return false;
		}
	}

	/**
	 * Check if we're running in an extension context
	 */
	private checkExtensionContext(): boolean {
		return typeof chrome !== "undefined" && chrome.runtime?.id !== undefined;
	}

	/**
	 * Mock history data for non-extension environments
	 */
	private getMockHistory(
		timeRange?: { start?: number; end?: number },
		maxResults?: number,
	): HistoryItem[] {
		const mockItems: HistoryItem[] = [
			{
				id: "1",
				url: "https://github.com/microsoft/TypeScript",
				title: "TypeScript - GitHub",
				lastVisitTime: Date.now() - 3600000,
				visitCount: 15,
				typedCount: 3,
			},
			{
				id: "2",
				url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
				title: "JavaScript | MDN",
				lastVisitTime: Date.now() - 7200000,
				visitCount: 8,
				typedCount: 1,
			},
			{
				id: "3",
				url: "https://www.npmjs.com/package/@wamp/client-sdk",
				title: "@wamp/client-sdk - npm",
				lastVisitTime: Date.now() - 10800000,
				visitCount: 5,
				typedCount: 2,
			},
			{
				id: "4",
				url: "https://vitejs.dev/guide/",
				title: "Getting Started | Vite",
				lastVisitTime: Date.now() - 14400000,
				visitCount: 12,
				typedCount: 4,
			},
		];

		const startTime = timeRange?.start || Date.now() - 7 * 24 * 60 * 60 * 1000;
		const endTime = timeRange?.end || Date.now();
		const filtered = mockItems.filter(
			(item) =>
				item.lastVisitTime >= startTime && item.lastVisitTime <= endTime,
		);

		return maxResults ? filtered.slice(0, maxResults) : filtered;
	}

	/**
	 * Mock tabs data for non-extension environments
	 */
	private getMockTabs(): TabInfo[] {
		return [
			{
				id: 1,
				url: "https://github.com/web-agent-memory/web-agent-memory-protocol",
				title: "Memory Protocol SDK - GitHub",
				active: true,
				windowId: 1,
			},
			{
				id: 2,
				url: "https://developer.chrome.com/docs/extensions/",
				title: "Chrome Extensions Documentation",
				active: false,
				windowId: 1,
			},
		];
	}

	/**
	 * LocalStorage fallback for getStorage
	 */
	private getLocalStorage<T>(key: string): T | undefined {
		if (typeof localStorage === "undefined") return undefined;
		try {
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : undefined;
		} catch (error) {
			console.error(
				"[BrowserAPIHelper] Error parsing localStorage item:",
				error,
			);
			return undefined;
		}
	}

	/**
	 * LocalStorage fallback for setStorage
	 */
	private setLocalStorage(data: Record<string, unknown>): void {
		if (typeof localStorage === "undefined") return;
		for (const [key, value] of Object.entries(data)) {
			try {
				localStorage.setItem(key, JSON.stringify(value));
			} catch (error) {
				console.error(
					"[BrowserAPIHelper] Error setting localStorage item:",
					error,
				);
			}
		}
	}

	/**
	 * LocalStorage fallback for removeStorage
	 */
	private removeLocalStorage(keys: string | string[]): void {
		if (typeof localStorage === "undefined") return;
		const keyArray = Array.isArray(keys) ? keys : [keys];
		keyArray.forEach((key) => {
			try {
				localStorage.removeItem(key);
			} catch (error) {
				console.error(
					"[BrowserAPIHelper] Error removing localStorage item:",
					error,
				);
			}
		});
	}
}
