import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "AgentMemoryExtensionSDK",
			formats: ["es"],
			fileName: "index",
		},
		rollupOptions: {
			external: ["chrome"],
		},
		sourcemap: true,
		minify: "terser",
	},
	plugins: [
		dts({
			insertTypesEntry: true,
			rollupTypes: true,
			entryRoot: resolve(__dirname, "src"),
		}),
	],
});
