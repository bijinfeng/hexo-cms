import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["@hexo-cms/core"] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@hexo-cms/core"] })],
  },
  renderer: {
    plugins: [
      TanStackRouterVite({ routesDirectory: "./src/routes" }),
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
