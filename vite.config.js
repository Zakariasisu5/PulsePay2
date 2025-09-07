import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "window", // some libs expect global
    "process.env": {}, // prevent "process not defined"
  },
  resolve: {
    alias: {
      process: "process/browser",
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["process", "buffer"],
  },
});
