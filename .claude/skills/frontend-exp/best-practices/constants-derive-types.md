---
title: Derive TypeScript types from constant arrays — never re-declare
impact: MEDIUM
tags: typescript, constants, dry, types
---

## Derive TypeScript types from constant arrays — never re-declare

**Impact: MEDIUM**

Define shared value sets as `as const` arrays or objects in one place. Derive the TypeScript type from the constant using `typeof` — never write a separate `type` or `enum` that duplicates the same values.

Declaring the type separately from the constant means two things to update when a value is added or removed. Divergence is a runtime bug waiting to happen.

**Incorrect (type and constant declared independently — two things to update):**

```ts
// types.ts
export type Status = "pending" | "active" | "archived"; // declared separately

// constants.ts
export const STATUSES = ["pending", "active", "archived"]; // no `as const` — string[]
```

**Correct (type derived from the constant — one update, always in sync):**

```ts
// lib/status.ts
export const STATUSES = ["pending", "active", "archived"] as const;
export type Status = (typeof STATUSES)[number]; // derived, not re-declared

// Object constants work the same way
export const ROUTES = { HOME: "/", SETTINGS: "/settings" } as const;
export type Route = (typeof ROUTES)[keyof typeof ROUTES];
```

This pattern also makes runtime iteration safe — `STATUSES.forEach(...)` always matches the type:

```tsx
{STATUSES.map((status) => (
  <option key={status} value={status}>{status}</option>
))}
```

Any component or utility that needs the list and the type imports both from the same file. No duplication, no divergence.
