import { defineConfig } from "vite";
import { serveHanziData } from "./tools/hanzi-data.mjs";

export default defineConfig({
  plugins: [
    {
      name: "local-hanzi-data",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!serveHanziData(req, res)) next();
        });
      },
    },
  ],
});
