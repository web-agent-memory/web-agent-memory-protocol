import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		include: ["__tests__/**/*.{test,spec}.{ts,js}"],
		setupFiles: ["__tests__/setup.ts"],
		globals: true,
		// Better JSDOM environment configuration
		environmentOptions: {
			jsdom: {
				resources: "usable",
				runScripts: "dangerously",
			},
		},
		alias: {
			"@client-sdk": "./",
			"@protocol": "../protocol",
		},
	},
});
