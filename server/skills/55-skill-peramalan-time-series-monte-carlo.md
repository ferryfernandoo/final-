---
name: peramalan-time-series-monte-carlo
description: "Skill peramalan kuantitatif (Time-Series Forecasting: Moving Average, Exponential Smoothing, Regresi Tren Linear/Polinomial, Dekomposisi Musiman) dan Simulasi Risiko Monte Carlo (P10, P50, P90)."
---

# Time-Series Forecasting & Monte Carlo Risk Simulation Pro

## 1. Metrik Evaluasi Akurasi Peramalan (Wajib Dihitung)
- **MAE (*Mean Absolute Error*):** $\frac{1}{n}\sum |y_t - \hat{y}_t|$
- **RMSE (*Root Mean Squared Error*):** $\sqrt{\frac{1}{n}\sum (y_t - \hat{y}_t)^2}$
- **MAPE (*Mean Absolute Percentage Error* %):** $\frac{100\%}{n}\sum \left|\frac{y_t - \hat{y}_t}{y_t}\right|$ *(MAPE $< 10\%$ sangat akurat).*

## 2. Visualisasi dengan `fan_forecast` di `viz_kit.py`
Pasangkan hasil proyeksi median (`P50`) dan rentang ketidakpastian (`80%` dan `95%`) langsung ke grafik `"kind": "fan_forecast"` di `viz_kit.py`!
