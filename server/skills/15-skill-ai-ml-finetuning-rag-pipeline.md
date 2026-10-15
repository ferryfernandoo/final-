---
name: ai-ml-finetuning-rag-pipeline
description: "Skill rekayasa AI/ML, kurasi dan deduplikasi dataset Fine-Tuning LLM (JSONL ChatML/ShareGPT), konfigurasi LoRA/QLoRA untuk model kecil & menengah, serta arsitektur RAG."
---

# AI Engineering, LLM Fine-Tuning & RAG Pipeline Pro

## 1. Standar Kurasi Dataset JSONL
- Setiap baris wajib berupa JSON valid satu baris dengan array `"messages"` berisi peran `"system"`, `"user"`, dan `"assistant"`.
- Buang baris duplikat menggunakan hash SHA-256 dan saring respons `"assistant"` yang terlalu pendek atau mengandung placeholder.

## 2. Konfigurasi LoRA / QLoRA Terbaik untuk Model 3B–8B
- Terapkan LoRA pada semua layer linear (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`).
- Gunakan `r = 16` atau `32`, `lora_alpha = 2 * r`, `learning_rate = 2e-4`, `lr_scheduler_type = "cosine"`, dan aktifkan *completion-only loss* (`train_on_inputs = False`).
