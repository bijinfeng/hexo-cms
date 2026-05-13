import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const loadWorkspaceEnv = (mode: string) => {
  const env = loadEnv(mode, workspaceRoot, "");

  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }
};

const codeSplitting = {
  groups: [
    {
      name: "vendor-editor",
      test: /node_modules\/(?:@codemirror|@lezer|style-mod|w3c-keyname)\//,
    },
    {
      name: "vendor-markdown",
      test: /node_modules\/(?:dompurify|marked)\//,
    },
  ],
};

const config = defineConfig(({ mode }) => {
  loadWorkspaceEnv(mode);

  return {
    envDir: workspaceRoot,
    resolve: { tsconfigPaths: true },
    plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
    build: {
      chunkSizeWarningLimit: 700,
      rolldownOptions: {
        output: {
          codeSplitting,
        },
      },
    },
  };
});

export default config;
