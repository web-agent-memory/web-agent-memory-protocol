import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "index.ts"),
			name: "AgentMemoryClientSDK",
			formats: ["es", "cjs", "umd"],
			fileName: (format) => {
				switch (format) {
					case "es":
						return "index.esm.js";
					case "cjs":
						return "index.js";
					case "umd":
						return "squash-sdk.min.js";
					default:
						return `index.${format}.js`;
				}
			},
		},
		rollupOptions: {
			external: [],
		},
		sourcemap: true,
		minify: "terser",
	},
	plugins: [
		dts({
			insertTypesEntry: true,
			rollupTypes: true,
		}),
	],
});
