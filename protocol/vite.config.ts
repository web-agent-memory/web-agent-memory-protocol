import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "MemoryProtocol",
			formats: ["es", "cjs"],
			fileName: (format) => {
				return format === "es" ? "index.js" : `index.${format}.js`;
			},
		},
		sourcemap: true,
		minify: false, // Keep unminified for a protocol/types package
	},
	plugins: [
		dts({
			insertTypesEntry: true,
			rollupTypes: true,
			entryRoot: resolve(__dirname, "src"),
		}),
	],
});
