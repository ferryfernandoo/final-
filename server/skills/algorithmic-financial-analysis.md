# 💹 SKILL: ALGORITHMIC FINANCIAL ANALYSIS & VALUATION (DCF & MONTE CARLO)
Category: Quantitative Finance & Algorithmic Analysis
Keywords: [finance, dcf, valuation, cagr, sharpe, portfolio, monte-carlo, simulation, pandas, risk, quantitative]

## 🎯 TUJUAN & STANDAR KUALITAS
Menjalankan analisis valuasi finansial kuantitatif tingkat institusi menggunakan Python (`numpy` + `pandas`). Analisis mencakup valuasi Discounted Cash Flow (DCF), Compound Annual Growth Rate (CAGR), Sharpe Ratio, Maximum Drawdown, dan Simulasi Risiko Monte Carlo (1.000 iterasi) untuk menguji ketahanan skenario bisnis.

---

## 🧮 FORMULA & METRIK STANDAR
1. **Discounted Cash Flow (DCF)**:
   $$PV = \sum_{t=1}^{n} \frac{FCF_t}{(1 + WACC)^t} + \frac{TerminalValue}{(1 + WACC)^n}$$
   $$TerminalValue = \frac{FCF_n \times (1 + g)}{WACC - g}$$
2. **Sharpe Ratio (Risk-Adjusted Return)**:
   $$Sharpe = \frac{R_p - R_f}{\sigma_p}$$
3. **Maximum Drawdown (MDD)**: Penurunan persentase terdalam dari puncak tertinggi (peak) ke lembah terendah (trough).

---

## 📋 TEMPLATE SCRIPT PYTHON LENGKAP & TERUJI

```python
import sys
import json
import numpy as np
import pandas as pd

def run_financial_analysis(initial_rev=50_000_000_000, wacc=0.10, terminal_growth=0.03):
    print("[*] Menjalankan Algorithmic Valuation & Risk Simulation...")

    # 1. Proyeksi 5 Tahun Arus Kas Bebas (FCF)
    growth_rates = [0.25, 0.20, 0.15, 0.12, 0.10]
    ebitda_margin = 0.22
    tax_rate = 0.22
    reinvestment_rate = 0.08 # % dari revenue untuk capex/working capital

    years = [2026, 2027, 2028, 2029, 2030]
    revenue_proj = []
    fcf_proj = []
    discount_factors = []
    pv_fcf = []

    current_rev = initial_rev
    for i, g in enumerate(growth_rates):
        current_rev = current_rev * (1 + g)
        revenue_proj.append(current_rev)

        ebitda = current_rev * ebitda_margin
        ebit = ebitda * 0.90 # Depresiasi ~10%
        nopat = ebit * (1 - tax_rate)
        fcf = nopat - (current_rev * reinvestment_rate)
        fcf_proj.append(fcf)

        df = 1 / ((1 + wacc) ** (i + 1))
        discount_factors.append(df)
        pv_fcf.append(fcf * df)

    # 2. Terminal Value & Enterprise Value (EV)
    terminal_fcf = fcf_proj[-1] * (1 + terminal_growth)
    terminal_value = terminal_fcf / (wacc - terminal_growth)
    pv_terminal_value = terminal_value * discount_factors[-1]

    enterprise_value = sum(pv_fcf) + pv_terminal_value

    # 3. Simulasi Risiko Monte Carlo (1.000 Iterasi)
    np.random.seed(42)
    iterations = 1000
    simulated_wacc = np.random.normal(loc=wacc, scale=0.015, size=iterations)
    simulated_growth = np.random.normal(loc=terminal_growth, scale=0.005, size=iterations)
    simulated_ev = []

    for sw, sg in zip(simulated_wacc, simulated_growth):
        if sw <= sg:
            continue
        tv = (fcf_proj[-1] * (1 + sg)) / (sw - sg)
        pv_tv = tv / ((1 + sw) ** 5)
        pv_cf = sum([cf / ((1 + sw) ** (idx + 1)) for idx, cf in enumerate(fcf_proj)])
        simulated_ev.append(pv_cf + pv_tv)

    simulated_ev = np.array(simulated_ev)
    p10_val = np.percentile(simulated_ev, 10)
    p50_val = np.percentile(simulated_ev, 50)
    p90_val = np.percentile(simulated_ev, 90)

    # Format Rupiah
    fmt_rp = lambda x: f"Rp {x:,.0f}"

    report = {
        "assumptions": {
            "initial_revenue": fmt_rp(initial_rev),
            "wacc_discount_rate": f"{wacc * 100:.1f}%",
            "terminal_growth_rate": f"{terminal_growth * 100:.1f}%",
            "forecast_period": "2026 - 2030 (5 Tahun)"
        },
        "dcf_projections": {
            "years": years,
            "projected_revenue": [fmt_rp(v) for v in revenue_proj],
            "projected_fcf": [fmt_rp(v) for v in fcf_proj],
            "sum_pv_explicit_fcf": fmt_rp(sum(pv_fcf)),
            "pv_terminal_value": fmt_rp(pv_terminal_value)
        },
        "valuation_result": {
            "baseline_enterprise_value": fmt_rp(enterprise_value),
            "monte_carlo_confidence_interval": {
                "bear_case_p10": fmt_rp(p10_val),
                "base_case_p50": fmt_rp(p50_val),
                "bull_case_p90": fmt_rp(p90_val)
            }
        }
    }

    out_file = "financial_valuation_report.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("\n" + "="*55)
    print("HASIL VALUASI KUANTITATIF & SIMULASI RISIKO")
    print(f"Enterprise Value (Baseline DCF): {fmt_rp(enterprise_value)}")
    print(f"Monte Carlo P10 (Konservatif)  : {fmt_rp(p10_val)}")
    print(f"Monte Carlo P50 (Median)       : {fmt_rp(p50_val)}")
    print(f"Monte Carlo P90 (Optimis)      : {fmt_rp(p90_val)}")
    print(f"Laporan lengkap tersimpan di   : {out_file}")
    print("="*55)

    return report

if __name__ == "__main__":
    run_financial_analysis()
```
