---
name: nodejs-nestjs-fastify-hono-pro
description: "Skill pengembangan backend Node.js & TypeScript skala produksi menggunakan NestJS (Modules, Controllers, Injectable Services, DTO Pipes), Fastify, dan Hono."
---

# Node.js Backend Frameworks: NestJS, Fastify & Hono Pro

## Arsitektur 3-Lapis di NestJS / Fastify / Express
1. **Controller / Route Layer:** Hanya memvalidasi DTO request (`zod` / `class-validator`) dan mengembalikan kode status HTTP.
2. **Service Layer:** Berisi logika bisnis murni dan orkestrasi transaksi.
3. **Repository / Data Access Layer:** Berisi kueri database berparameter (Prisma / Drizzle / Kysely / SQLite).
