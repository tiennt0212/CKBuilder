---
title: Domain constants keyed by a shared type belong in lib/, not component files
impact: MEDIUM
tags: constants, organization, lib, reusability, typescript
---

## Domain constants keyed by a shared type belong in `lib/`, not component files

**Impact: MEDIUM**

If a constant is a `Record` keyed by a shared domain type (e.g. `Environment`, `Status`, `Role`), it belongs in `lib/` — not in the component that happens to need it first. A component file signals "used here only." A `lib/` file signals "available to anyone." Putting domain constants in a component makes them invisible to future consumers, who will either duplicate them or introduce an accidental import from a component file.

The distinction from `constants-colocate-related`: that rule is about grouping constants *together*. This rule is about *where the group lives*.

**Incorrect (domain constants defined inside a component file):**

```ts
// app/components/StatusBar.tsx
const STATUS_LABELS: Record<Status, string> = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

const STATUS_ENDPOINTS: Record<Status, string> = {
  active: "https://api.example.com/active",
  paused: "https://api.example.com/paused",
  archived: "https://api.example.com/archive",
};
```

If a second component (e.g. a settings panel or a tooltip) needs to display a status label, it must either import from a component file (wrong dependency direction) or duplicate the constant.

**Correct (domain constants co-located with the type they map):**

```ts
// app/lib/status.ts
export const STATUSES = ["active", "paused", "archived"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

export const STATUS_ENDPOINTS: Record<Status, string> = {
  active: "https://api.example.com/active",
  paused: "https://api.example.com/paused",
  archived: "https://api.example.com/archive",
};
```

**Exception — purely visual constants:** A constant that maps domain values to CSS strings for a specific design treatment (e.g. a color map used only by one pill component) can stay closer to the UI layer. It is not a domain constant — it is a styling decision that other consumers would likely override anyway.

Rule of thumb: if the constant could be useful in a UI component, a server utility, or a test helper, it belongs in `lib/`. If it would only ever be used by one specific visual treatment, it can live closer to that component.

> For grouping related constants together in one module, see `constants-colocate-related`.
> For co-locating page-local components beside their page, see `component-colocation`.
