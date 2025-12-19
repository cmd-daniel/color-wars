import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import babel from "vite-plugin-babel";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      babelConfig: {
        plugins: [
          "babel-plugin-react-compiler",
          ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
        ],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@animation": path.resolve(__dirname, "./src/animation"),
      "@actions": path.resolve(__dirname, "./src/actions"),
    },
  },
  server: { host: true, strictPort: true },
});
