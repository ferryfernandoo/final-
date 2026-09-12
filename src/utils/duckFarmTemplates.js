/**
 * Preset Excel Templates for General Livestock & Agriculture Management (Peternakan & Pertanian)
 */

const createCell = (value, format = {}) => ({
  value: String(value ?? ''),
  format: {
    bold: false,
    italic: false,
    fontSize: 11,
    fontFamily: 'Calibri',
    fontColor: '#000000',
    fillColor: '#ffffff',
    halign: 'left',
    valign: 'middle',
    ...format
  }
});

export const FARM_TEMPLATES = [
  {
    id: 'produksi_panen',
    name: '🌾 Laporan Produksi & Hasil Panen Agribisnis',
    desc: 'Catat produksi harian komoditas utama, hasil afkir, dan total pendapatan omzet',
    icon: '🌾',
    data: [
      [
        createCell('Tanggal', { bold: true, fillColor: '#107c41', fontColor: '#ffffff', halign: 'center' }),
        createCell('Jumlah Populasi / Lahan', { bold: true, fillColor: '#107c41', fontColor: '#ffffff', halign: 'center' }),
        createCell('Hasil Panen Utama (Kg/Unit)', { bold: true, fillColor: '#107c41', fontColor: '#ffffff', halign: 'center' }),
        createCell('Hasil Cacat/Afkir', { bold: true, fillColor: '#107c41', fontColor: '#ffffff', halign: 'center' }),
        createCell('Harga per Unit (Rp)', { bold: true, fillColor: '#107c41', fontColor: '#ffffff', halign: 'center' }),
        createCell('Total Omzet Penjualan (Rp)', { bold: true, fillColor: '#107c41', fontColor: '#ffffff', halign: 'center' }),
        createCell('Catatan / Keterangan', { bold: true, fillColor: '#107c41', fontColor: '#ffffff', halign: 'center' })
      ],
      [
        createCell('2026-08-01', { halign: 'center' }),
        createCell('450 Unit', { halign: 'right' }),
        createCell('380', { halign: 'right' }),
        createCell('5', { halign: 'right' }),
        createCell('Rp 25.000', { halign: 'right' }),
        createCell('=C2*25000', { halign: 'right', fontColor: '#107c41', bold: true }),
        createCell('Kondisi komoditas prima, cuaca mendukung')
      ],
      [
        createCell('2026-08-02', { halign: 'center' }),
        createCell('450 Unit', { halign: 'right' }),
        createCell('392', { halign: 'right' }),
        createCell('3', { halign: 'right' }),
        createCell('Rp 25.000', { halign: 'right' }),
        createCell('=C3*25000', { halign: 'right', fontColor: '#107c41', bold: true }),
        createCell('Hasil panen meningkat 3%')
      ],
      [
        createCell('TOTAL AKUMULASI', { bold: true, fillColor: '#f1f5f9' }),
        createCell('-', { fillColor: '#f1f5f9', halign: 'center' }),
        createCell('=SUM(C2:C3)', { bold: true, fillColor: '#f1f5f9', halign: 'right', fontColor: '#107c41' }),
        createCell('=SUM(D2:D3)', { bold: true, fillColor: '#f1f5f9', halign: 'right', fontColor: '#a80000' }),
        createCell('-', { fillColor: '#f1f5f9', halign: 'center' }),
        createCell('=SUM(F2:F3)', { bold: true, fillColor: '#f1f5f9', halign: 'right', fontColor: '#107c41' }),
        createCell('Kinerja Sangat Baik 🟢', { fillColor: '#f1f5f9', bold: true })
      ]
    ]
  },
  {
    id: 'pakan_operasional',
    name: '🌾 Pencatatan Pakan, Pupuk & Biaya Operasional',
    desc: 'Hitung kebutuhan pakan/pupuk harian (kg), biaya suplai, dan perawatan',
    icon: '🌾',
    data: [
      [
        createCell('Tanggal', { bold: true, fillColor: '#0f766e', fontColor: '#ffffff', halign: 'center' }),
        createCell('Jenis Suplai / Pakan / Pupuk', { bold: true, fillColor: '#0f766e', fontColor: '#ffffff', halign: 'center' }),
        createCell('Jumlah (kg / L)', { bold: true, fillColor: '#0f766e', fontColor: '#ffffff', halign: 'center' }),
        createCell('Harga per Satuan (Rp)', { bold: true, fillColor: '#0f766e', fontColor: '#ffffff', halign: 'center' }),
        createCell('Subtotal Suplai (Rp)', { bold: true, fillColor: '#0f766e', fontColor: '#ffffff', halign: 'center' }),
        createCell('Biaya Perawatan & Obat (Rp)', { bold: true, fillColor: '#0f766e', fontColor: '#ffffff', halign: 'center' }),
        createCell('Total Biaya Operasional (Rp)', { bold: true, fillColor: '#0f766e', fontColor: '#ffffff', halign: 'center' })
      ],
      [
        createCell('2026-08-01', { halign: 'center' }),
        createCell('Pakan Konsentrat / Nutrisi Pokok', { halign: 'left' }),
        createCell('55', { halign: 'right' }),
        createCell('Rp 8.500', { halign: 'right' }),
        createCell('=C2*8500', { halign: 'right', fontColor: '#a80000' }),
        createCell('Rp 25.000', { halign: 'right' }),
        createCell('=E2+F2', { halign: 'right', bold: true, fontColor: '#a80000' })
      ],
      [
        createCell('JUMLAH OPERASIONAL', { bold: true, fillColor: '#f1f5f9' }),
        createCell('-', { fillColor: '#f1f5f9', halign: 'center' }),
        createCell('=SUM(C2:C2)', { bold: true, fillColor: '#f1f5f9', halign: 'right' }),
        createCell('-', { fillColor: '#f1f5f9', halign: 'center' }),
        createCell('=SUM(E2:E2)', { bold: true, fillColor: '#f1f5f9', halign: 'right', fontColor: '#a80000' }),
        createCell('=SUM(F2:F2)', { bold: true, fillColor: '#f1f5f9', halign: 'right', fontColor: '#a80000' }),
        createCell('=SUM(G2:G2)', { bold: true, fillColor: '#f1f5f9', halign: 'right', fontColor: '#a80000' })
      ]
    ]
  },
  {
    id: 'laba_rugi_peternakan',
    name: '📊 Laporan Laba Rugi Unit Agribisnis (Bulanan)',
    desc: 'Ringkasan komprehensif total pendapatan produk vs total pengeluaran & laba bersih',
    icon: '📊',
    data: [
      [
        createCell('Kategori Akun Keuangan', { bold: true, fillColor: '#1e3a8a', fontColor: '#ffffff', halign: 'left' }),
        createCell('Nilai (Rupiah)', { bold: true, fillColor: '#1e3a8a', fontColor: '#ffffff', halign: 'right' })
      ],
      [createCell('1. PENDAPATAN OPERASIONAL', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' })],
      [createCell('   Penjualan Hasil Utama', { halign: 'left' }), createCell('Rp 28.500.000', { halign: 'right', fontColor: '#107c41' })],
      [createCell('   Penjualan Olahan Tambahan', { halign: 'left' }), createCell('Rp 6.200.000', { halign: 'right', fontColor: '#107c41' })],
      [createCell('TOTAL PENDAPATAN OPERASIONAL', { bold: true, fillColor: '#e0f2fe' }), createCell('=SUM(B3:B4)', { bold: true, fillColor: '#e0f2fe', halign: 'right', fontColor: '#107c41' })],
      [createCell('2. BEBAN & PENGELUARAN OPERASIONAL', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' })],
      [createCell('   Beban Pakan / Pupuk Pokok', { halign: 'left' }), createCell('Rp 14.800.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('   Beban Vitamin, Nutrisi & Sanitasi', { halign: 'left' }), createCell('Rp 1.200.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('   Gaji Tenaga Kerja Lapangan', { halign: 'left' }), createCell('Rp 4.000.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('TOTAL BEBAN OPERASIONAL', { bold: true, fillColor: '#fee2e2' }), createCell('=SUM(B7:B9)', { bold: true, fillColor: '#fee2e2', halign: 'right', fontColor: '#a80000' })],
      [createCell('LABA BERSIH OPERASIONAL (PENDAPATAN - BEBAN)', { bold: true, fillColor: '#dcfce7', fontSize: 12 }), createCell('=B5-B10', { bold: true, fillColor: '#dcfce7', halign: 'right', fontColor: '#15803d', fontSize: 13 })]
    ]
  }
];

export const DUCK_FARM_TEMPLATES = FARM_TEMPLATES;

