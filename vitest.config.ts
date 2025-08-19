import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		include: [
			"client-sdk/**/*.{test,spec}.{ts,js}",
			"client-sdk/__tests__/**/*.{test,spec}.{ts,js}",
			"protocol/**/*.{test,spec}.{ts,js}",
			"protocol/__tests__/**/*.{test,spec}.{ts,js}",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["client-sdk/**/*.ts", "protocol/**/*.ts"],
			exclude: [
				"client-sdk/**/*.d.ts",
				"protocol/**/*.d.ts",
				"client-sdk/**/__tests__/**",
				"protocol/**/__tests__/**",
				"client-sdk/index.ts", // This file only re-exports, so no need to cover it
			],
		},
		alias: {
			"@client-sdk": "./client-sdk",
			"@protocol": "./protocol",
		},
	},
});
