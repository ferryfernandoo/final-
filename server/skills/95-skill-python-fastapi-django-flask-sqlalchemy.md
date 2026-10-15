---
name: python-fastapi-django-flask-sqlalchemy
description: "Skill pengembangan backend Python menggunakan FastAPI (Pydantic v2, Depends, OpenAPI), Django (ORM select_related/prefetch_related, Migrations), dan Flask Blueprints."
---

# Python Backend Frameworks: FastAPI, Django & Flask Pro

## Pola Standar FastAPI + Pydantic v2
```python
from pydantic import BaseModel, Field

class CreateLinePayload(BaseModel):
    lini: str = Field(..., min_length=2, max_length=80)
    target: int = Field(..., gt=0)
    aktual: int = Field(..., ge=0)
```
Di Django ORM, selalu gunakan `.select_related()` untuk relasi ForeignKey dan `.prefetch_related()` untuk relasi ManyToMany guna mencegah masalah *N+1 Queries*.
