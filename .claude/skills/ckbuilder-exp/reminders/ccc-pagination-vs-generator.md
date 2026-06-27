---
title: findCellsPaged vs async generator APIs return different types
type: gotcha
applies-to: "@ckb-ccc/core Client"
---

## `findCellsPaged` vs async generator APIs

Two groups of cell-query APIs — do not mix them:

| API | Returns | Use for |
|---|---|---|
| `findCellsByLock` / `findCellsByType` / `findCells` | `AsyncGenerator<Cell>` | One-shot iteration with `for await…of`; `break` early |
| `findCellsPaged` | `{ cells: Cell[], lastCursor: string }` | UI pagination — "Load More" / infinite scroll |

- ✅ Use `findCellsPaged` when you need a cursor to fetch the next page
- ✅ Use async generators when you want to consume all results in one pass
- ❌ Using a generator for pagination UI has no cursor — you cannot resume from where you left off
