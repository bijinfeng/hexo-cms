import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [
      TanStackRouterVite({ routesDirectory: "./src/renderer/src/routes" }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "#": "./src/renderer/src",
      },
    },
  },
});
