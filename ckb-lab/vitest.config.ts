import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Tests cover `app/lib/` only — the pure layer: no React, no chain calls, no stores.
 *
 * The tx builders in `app/lib/ckb/` and the five feature hooks are deliberately NOT tested here.
 * A builder's value is in the order it calls CCC's three completion helpers, and asserting that
 * against a hand-rolled fake signer tests the fake rather than the chain; contract behaviour is
 * already covered on the Rust side by `ckb-testtool` (`make -C contracts test`). The hooks are
 * near-identical copies of one status machine, so testing them is testing `useState`.
 */
export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's `paths` and .storybook/main.ts's alias.
    alias: { "@": path.resolve(__dirname, "./app") },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
