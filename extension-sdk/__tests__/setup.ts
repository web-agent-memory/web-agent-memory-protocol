// Vitest setup file for test environment configuration

import type { AgentMemoryRegistry } from "@wamp/protocol";
import { afterEach, vi } from "vitest";

// Global type definitions for testing
// Note: With @types/jsdom, most DOM types are already available
declare global {
	interface Window {
		agentMemory?: AgentMemoryRegistry;
	}
}

// Mock window.matchMedia for theme detection
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock chrome extension APIs for extension testing
Object.defineProperty(window, "chrome", {
	writable: true,
	value: {
		storage: {
			sync: {
				get: vi.fn().mockResolvedValue({}),
				set: vi.fn().mockResolvedValue(undefined),
			},
			local: {
				get: vi.fn().mockResolvedValue({}),
				set: vi.fn().mockResolvedValue(undefined),
			},
		},
	},
});

// Clean up after each test
afterEach(() => {
	// Reset window.agentMemory
	delete window.agentMemory;

	// Clear all mocks
	vi.clearAllMocks();

	// Clear DOM storage (now with proper typing from @types/jsdom)
	localStorage.clear();
	sessionStorage.clear();

	// Clear any DOM modifications
	document.body.innerHTML = "";
	document.head
		.querySelectorAll('style, link[rel="stylesheet"]')
		.forEach((el) => {
			el.remove();
		});

	// Reset window location if needed for extension testing
	if (window.location.hash) {
		window.location.hash = "";
	}
});
