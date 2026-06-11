---
title: Replace deprecated Ant Design v5 props
impact: MEDIUM
tags: antd, deprecated, card, api
---

## Replace deprecated Ant Design v5 props

**Impact: MEDIUM**

Several Ant Design props were deprecated in v5 and replaced with a unified `styles` object. Using the old props produces console warnings and will stop working in a future major version.

### Card `bodyStyle` → `styles.body`

```tsx
// ❌ Deprecated — console warning in v5
<Card bodyStyle={{ padding: 12 }}>…</Card>

// ✅ Correct v5 API
<Card styles={{ body: { padding: 12 } }}>…</Card>
```

The `styles` prop accepts an object with keys for each internal slot (`body`, `header`, `cover`, `actions`, `extra`), giving fine-grained control without CSS overrides.

Reference: [Ant Design Card API](https://ant.design/components/card)
