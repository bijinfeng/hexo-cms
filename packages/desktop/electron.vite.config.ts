import { fileURLToPath, URL } from "node:url";
import { builtinModules } from "node:module";
import { defineConfig, loadEnv } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
const electronRuntimeExternals = [
  "electron",
  /^electron\/.+/,
  ...builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]),
];

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
      build: {
        externalizeDeps: {
          exclude: ["@hexo-cms/core"],
        },
      },
    },
    preload: {
      envDir: workspaceRoot,
      build: {
        externalizeDeps: false,
        rollupOptions: {
          external: electronRuntimeExternals,
          output: {
            format: "cjs",
          },
        },
      },
    },
    renderer: {
      envDir: workspaceRoot,
      plugins: [
        tanstackRouter({ routesDirectory: "./src/routes" }),
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
