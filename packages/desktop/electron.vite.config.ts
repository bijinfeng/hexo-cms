import { fileURLToPath, URL } from "node:url";
import { defineConfig, externalizeDepsPlugin, loadEnv } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const loadWorkspaceEnv = (mode: string) => {
  const env = loadEnv(mode, workspaceRoot, "");

  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }
};

export default defineConfig(({ mode }) => {
  loadWorkspaceEnv(mode);

  return {
    main: {
      envDir: workspaceRoot,
      plugins: [externalizeDepsPlugin({ exclude: ["@hexo-cms/core"] })],
    },
    preload: {
      envDir: workspaceRoot,
      plugins: [externalizeDepsPlugin({ exclude: ["@hexo-cms/core"] })],
    },
    renderer: {
      envDir: workspaceRoot,
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
  };
});
