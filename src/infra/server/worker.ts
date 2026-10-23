import { createAuthApp } from "./app";
export { AuthRateLimitDurableObject } from "./rate-limit-do";

const app = createAuthApp();

export default {
  fetch(request: Request, env: Parameters<typeof app.fetch>[1]) {
    return app.fetch(request, env);
  },
};
