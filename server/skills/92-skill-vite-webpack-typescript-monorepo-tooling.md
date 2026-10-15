---
name: vite-webpack-typescript-monorepo-tooling
description: "Skill konfigurasi TypeScript Strict Mode, Generics, Discriminated Unions, Utility Types (Partial, Pick, Omit, Record), Vite bundler, dan arsitektur Monorepo."
---

# TypeScript Strict Mode & Modern Build Tooling Pro

## Gunakan *Discriminated Unions* untuk State Asinkron yang 100% Type-Safe
```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
```
Dengan pola ini, TypeScript melarang akses `state.data` sebelum kita memastikan `if (state.status === 'success')`!
