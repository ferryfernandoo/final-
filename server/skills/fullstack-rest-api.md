# ⚡ SKILL: RESILIENT FULL-STACK REST API ARCHITECTURE
Category: Backend, API Development & Architecture
Keywords: [api, rest, express, nodejs, fastapi, python, backend, json, crud, validation, middleware, error-handling]

## 🎯 TUJUAN & STANDAR KUALITAS
Membangun layanan REST API tingkat produksi (Production-Ready) yang tangguh, aman, dan berkinerja tinggi menggunakan Node.js (Express / Fastify) atau Python (FastAPI). API wajib memiliki amplop respons JSON standar, penanganan error terpusat (tidak pernah crash), validasi skema input yang ketat, dan pagination terstruktur.

---

## 📦 STANDAR AMPLOP RESPONS (JSON RESPONSE ENVELOPE)
Semua endpoint **WAJIB** mengembalikan format konsisten:

### Sukses (200 / 201):
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "timestamp": "2026-10-14T14:30:00Z"
  }
}
```

### Gagal (400 / 404 / 500):
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Entitas dengan ID yang diminta tidak ditemukan.",
    "details": null
  },
  "timestamp": "2026-10-14T14:30:00Z"
}
```

---

## 🛡️ ATURAN ANTI-CRASH & BEST PRACTICES
1. **Async Error Catcher**: Jangan biarkan `try/catch` manual mengotori controller. Bungkus handler dalam wrapper pembantu.
2. **Validasi Input**: Validasi setiap `req.body`, `req.query`, dan `req.params`. Tolak data tidak valid dengan kode `422 Unprocessable Entity` atau `400 Bad Request`.
3. **Graceful Shutdown**: Tangani sinyal `SIGTERM` dan `SIGINT` untuk menutup koneksi database dan server tanpa memutuskan koneksi aktif.

---

## 📋 TEMPLATE KODE EXPRESS (NODE.JS) SIAP PRODUKSI

```javascript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4050;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 1. In-Memory Database Repository (Mock)
const itemRepo = [
  { id: '1', title: 'Perbaikan Sistem Otomasi', status: 'COMPLETED', priority: 'HIGH', createdAt: new Date().toISOString() },
  { id: '2', title: 'Audit Keamanan Header', status: 'IN_PROGRESS', priority: 'CRITICAL', createdAt: new Date().toISOString() }
];

// 2. Helper Standard Response
const sendSuccess = (res, data, meta = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: { ...meta, timestamp: new Date().toISOString() }
  });
};

const sendError = (res, message, code = 'INTERNAL_ERROR', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString()
  });
};

// 3. Endpoints CRUD
// GET /api/v1/items (Pagination & Filtering)
app.get('/api/v1/items', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const status = req.query.status;

    let filtered = itemRepo;
    if (status) {
      filtered = filtered.filter(it => it.status.toLowerCase() === status.toLowerCase());
    }

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return sendSuccess(res, paginated, {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit)
    });
  } catch (err) {
    return sendError(res, err.message, 'QUERY_FAILED', 500);
  }
});

// GET /api/v1/items/:id
app.get('/api/v1/items/:id', (req, res) => {
  const item = itemRepo.find(it => it.id === req.params.id);
  if (!item) {
    return sendError(res, `Item dengan id ${req.params.id} tidak ditemukan`, 'ITEM_NOT_FOUND', 404);
  }
  return sendSuccess(res, item);
});

// POST /api/v1/items
app.post('/api/v1/items', (req, res) => {
  const { title, priority } = req.body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return sendError(res, 'Field "title" wajib diisi dengan teks valid', 'VALIDATION_ERROR', 422);
  }

  const newItem = {
    id: String(Date.now()),
    title: title.trim(),
    status: 'PENDING',
    priority: priority || 'MEDIUM',
    createdAt: new Date().toISOString()
  };

  itemRepo.unshift(newItem);
  return sendSuccess(res, newItem, {}, 201);
});

// Global 404 Handler
app.use((req, res) => {
  return sendError(res, `Route ${req.method} ${req.url} tidak ditemukan`, 'ROUTE_NOT_FOUND', 404);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  return sendError(res, 'Terjadi kesalahan internal pada server', 'SERVER_ERROR', 500, process.env.NODE_ENV === 'development' ? err.stack : null);
});

// Start Server
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => {
    console.log(`[API SERVICE] Berjalan pada http://localhost:${PORT}`);
  });
}

export default app;
```
