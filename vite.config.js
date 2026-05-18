import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { sentimentApiPlugin } from "./vite-plugin-sentiment-api.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), sentimentApiPlugin(env)],
    resolve: {
      dedupe: ["three"],
    },
    optimizeDeps: {
      include: ["three", "three-globe"],
    },
  };
});
