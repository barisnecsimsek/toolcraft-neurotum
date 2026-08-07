import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const demoBasePath = "/demos/glass/";

export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? demoBasePath : "/",
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
