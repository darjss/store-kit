import { app } from "@store-kit/api";
import type { Fetchable } from "astro";
import { astro, FetchState } from "astro/fetch";

export default {
  fetch(request) {
    const pathname = new URL(request.url).pathname;

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return app.handle(request);
    }

    return astro(new FetchState(request));
  },
} satisfies Fetchable;
