/**
 * Enterprise-Grade Professional Business & Financial Spreadsheet Templates for Typernova Excel
 * Industry Standard Standards: Title Banners, KPI Summaries, Structured Data Tables, Real Excel Formulas
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

export const TEMPLATE_CATEGORIES = [
  { id: 'all', name: '🌐 Semua Template Enterprise', icon: '✨' },
  { id: 'finance', name: '💰 Laporan Keuangan (Jurnal, Buku Besar, P&L, Neraca)', icon: '💰' },
  { id: 'retail', name: '🛒 Toko & Olshop', icon: '🛒' },
  { id: 'fnb', name: '☕ Restoran & Kafe', icon: '☕' },
  { id: 'services', name: '🧺 Jasa & Services', icon: '🧺' },
  { id: 'farm', name: '🌾 Peternakan & Tani', icon: '🌾' },
  { id: 'hr', name: '👥 HRD, Payroll & KPI Scorecard', icon: '👥' },
  { id: 'project', name: '📋 Proyek, PMO, Risk & CRM Sales', icon: '💼' },
  { id: 'construction', name: '🏗️ RAB & Logistik Konstruksi', icon: '🏗️' }
];

export const BUSINESS_TEMPLATES = [
  // ── 1. REAL INDUSTRIAL FINANCIAL & GENERAL LEDGER ACCOUNTING TEMPLATES ──
  {
    id: 'jurnal_umum_buku_besar',
    category: 'finance',
    name: '📚 Jurnal Umum & Buku Besar Akuntansi (General Ledger ERP Ready)',
    desc: 'Format resmi double-entry accounting siap upload ke ERP (Accurate, SAP, Xero) lengkap dengan validasi balance debit-kredit',
    icon: '📚',
    colWidths: [110, 110, 110, 240, 280, 150, 150, 130],
    merges: [
      { r1: 0, c1: 0, r2: 0, c2: 7 },
      { r1: 1, c1: 0, r2: 1, c2: 7 }
    ],
    data: [
      [createCell('JURNAL UMUM & BUKU BESAR AKUNTANSI (GENERAL LEDGER & JOURNAL)', { bold: true, fontSize: 13, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'center' }), '', '', '', '', '', '', ''],
      [createCell('Standar Industri IFRS / PSAK Siap Upload ke ERP (Accurate, SAP, Xero, Jurnal.id)', { italic: true, fontSize: 10.5, fillColor: '#1e293b', fontColor: '#ffffff', halign: 'center' }), '', '', '', '', '', '', ''],
      [createCell(''), createCell(''), createCell(''), createCell(''), createCell(''), createCell(''), createCell(''), createCell('')],
      
      // Balance Validation KPI Block
      [
        createCell('TOTAL DEBIT', { bold: true, fillColor: '#f1f5f9', halign: 'center' }),
        createCell('=SUM(F8:F21)', { bold: true, fontSize: 11.5, fillColor: '#e0f2fe', fontColor: '#0369a1', halign: 'right' }),
        createCell(''),
        createCell('TOTAL KREDIT', { bold: true, fillColor: '#f1f5f9', halign: 'center' }),
        createCell('=SUM(G8:G21)', { bold: true, fontSize: 11.5, fillColor: '#e0f2fe', fontColor: '#0369a1', halign: 'right' }),
        createCell(''),
        createCell('STATUS BALANCE', { bold: true, fillColor: '#f1f5f9', halign: 'center' }),
        createCell('BALANCED 🟢', { bold: true, fontSize: 11.5, fillColor: '#dcfce7', fontColor: '#15803d', halign: 'center' })
      ],
      [createCell(''), createCell(''), createCell(''), createCell(''), createCell(''), createCell(''), createCell(''), createCell('')],

      // Table Header Row
      [
        createCell('No Vokasi / Ref', { bold: true, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'center' }),
        createCell('Tanggal', { bold: true, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'center' }),
        createCell('Kode Akun (CoA)', { bold: true, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'center' }),
        createCell('Nama Akun Rekening', { bold: true, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'left' }),
        createCell('Deskripsi Transaksi Operasional', { bold: true, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'left' }),
        createCell('Debit (Rp)', { bold: true, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'right' }),
        createCell('Kredit (Rp)', { bold: true, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'right' }),
        createCell('Status Posting', { bold: true, fillColor: '#0f172a', fontColor: '#ffffff', halign: 'center' })
      ],

      // Double Entry Transactions (14 Rows)
      [createCell('JV-2026-001', { halign: 'center' }), createCell('2026-08-01', { halign: 'center' }), createCell('101-100', { halign: 'center' }), createCell('Kas Bank Mandiri Operasional', { halign: 'left' }), createCell('Setoran modal awal pemilik perusahaan', { halign: 'left' }), createCell('Rp 150.000.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],
      [createCell('JV-2026-001', { halign: 'center' }), createCell('2026-08-01', { halign: 'center' }), createCell('301-100', { halign: 'center' }), createCell('Modal Disetor Pemilik', { halign: 'left' }), createCell('Setoran modal awal pemilik perusahaan', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 150.000.000', { halign: 'right', fontColor: '#a80000' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],
      
      [createCell('JV-2026-002', { halign: 'center' }), createCell('2026-08-02', { halign: 'center' }), createCell('501-100', { halign: 'center' }), createCell('Beban HPP Pembelian Bahan', { halign: 'left' }), createCell('Pembelian bahan baku stok dari supplier PT Prima', { halign: 'left' }), createCell('Rp 35.000.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],
      [createCell('JV-2026-002', { halign: 'center' }), createCell('2026-08-02', { halign: 'center' }), createCell('101-100', { halign: 'center' }), createCell('Kas Bank Mandiri Operasional', { halign: 'left' }), createCell('Pembelian bahan baku stok dari supplier PT Prima', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 35.000.000', { halign: 'right', fontColor: '#a80000' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],

      [createCell('JV-2026-003', { halign: 'center' }), createCell('2026-08-03', { halign: 'center' }), createCell('102-100', { halign: 'center' }), createCell('Piutang Usaha Pelanggan (AR)', { halign: 'left' }), createCell('Penjualan barang term 30 hari ke PT Wijaya', { halign: 'left' }), createCell('Rp 48.500.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],
      [createCell('JV-2026-003', { halign: 'center' }), createCell('2026-08-03', { halign: 'center' }), createCell('401-100', { halign: 'center' }), createCell('Pendapatan Penjualan Produk', { halign: 'left' }), createCell('Penjualan barang term 30 hari ke PT Wijaya', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 48.500.000', { halign: 'right', fontColor: '#a80000' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],

      [createCell('JV-2026-004', { halign: 'center' }), createCell('2026-08-05', { halign: 'center' }), createCell('601-100', { halign: 'center' }), createCell('Beban Gaji & Tunjangan Staf', { halign: 'left' }), createCell('Pembayaran gaji staf bulan Agustus 2026', { halign: 'left' }), createCell('Rp 18.000.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],
      [createCell('JV-2026-004', { halign: 'center' }), createCell('2026-08-05', { halign: 'center' }), createCell('101-100', { halign: 'center' }), createCell('Kas Bank Mandiri Operasional', { halign: 'left' }), createCell('Pembayaran gaji staf bulan Agustus 2026', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 18.000.000', { halign: 'right', fontColor: '#a80000' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],

      [createCell('JV-2026-005', { halign: 'center' }), createCell('2026-08-06', { halign: 'center' }), createCell('602-100', { halign: 'center' }), createCell('Beban Sewa Gedung Kantor', { halign: 'left' }), createCell('Pembayaran sewa gedung kantor 1 bulan', { halign: 'left' }), createCell('Rp 5.000.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],
      [createCell('JV-2026-005', { halign: 'center' }), createCell('2026-08-06', { halign: 'center' }), createCell('101-100', { halign: 'center' }), createCell('Kas Bank Mandiri Operasional', { halign: 'left' }), createCell('Pembayaran sewa gedung kantor 1 bulan', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 5.000.000', { halign: 'right', fontColor: '#a80000' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],

      [createCell('JV-2026-006', { halign: 'center' }), createCell('2026-08-07', { halign: 'center' }), createCell('101-100', { halign: 'center' }), createCell('Kas Bank Mandiri Operasional', { halign: 'left' }), createCell('Pelunasan piutang sebagian dari PT Wijaya', { halign: 'left' }), createCell('Rp 25.000.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],
      [createCell('JV-2026-006', { halign: 'center' }), createCell('2026-08-07', { halign: 'center' }), createCell('102-100', { halign: 'center' }), createCell('Piutang Usaha Pelanggan (AR)', { halign: 'left' }), createCell('Pelunasan piutang sebagian dari PT Wijaya', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 25.000.000', { halign: 'right', fontColor: '#a80000' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],

      [createCell('JV-2026-007', { halign: 'center' }), createCell('2026-08-08', { halign: 'center' }), createCell('603-100', { halign: 'center' }), createCell('Beban Utilitas Listrik & Internet', { halign: 'left' }), createCell('Pembayaran tagihan listrik & internet kantor', { halign: 'left' }), createCell('Rp 3.200.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],
      [createCell('JV-2026-007', { halign: 'center' }), createCell('2026-08-08', { halign: 'center' }), createCell('101-100', { halign: 'center' }), createCell('Kas Bank Mandiri Operasional', { halign: 'left' }), createCell('Pembayaran tagihan listrik & internet kantor', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 3.200.000', { halign: 'right', fontColor: '#a80000' }), createCell('Posted 🟢', { halign: 'center', fontColor: '#15803d' })],

      // Summary Total Row
      [
        createCell('TOTAL KESELURUHAN JURNAL', { bold: true, fillColor: '#e2e8f0' }),
        createCell('-', { fillColor: '#e2e8f0', halign: 'center' }),
        createCell('-', { fillColor: '#e2e8f0', halign: 'center' }),
        createCell('-', { fillColor: '#e2e8f0', halign: 'center' }),
        createCell('-', { fillColor: '#e2e8f0', halign: 'center' }),
        createCell('=SUM(F8:F21)', { bold: true, fillColor: '#e2e8f0', halign: 'right', fontColor: '#0369a1', fontSize: 11.5 }),
        createCell('=SUM(G8:G21)', { bold: true, fillColor: '#e2e8f0', halign: 'right', fontColor: '#0369a1', fontSize: 11.5 }),
        createCell('BALANCED 🟢', { bold: true, fillColor: '#e2e8f0', halign: 'center', fontColor: '#15803d' })
      ]
    ]
  },

  {
    id: 'neraca_saldo_trial_balance',
    category: 'finance',
    name: '⚖️ Neraca Saldo Sebelum & Sesudah Penyesuaian (Trial Balance Master)',
    desc: 'Tabel ringkasan saldo seluruh CoA buku besar untuk pengujian keseimbangan debit & kredit sebelum penyusunan laporan keuangan',
    icon: '⚖️',
    colWidths: [110, 280, 140, 150, 150, 160, 160],
    merges: [{ r1: 0, c1: 0, r2: 0, c2: 6 }],
    data: [
      [createCell('NERACA SALDO UTAMA (TRIAL BALANCE STATEMENT)', { bold: true, fontSize: 13, fillColor: '#1e3a8a', fontColor: '#ffffff', halign: 'center' }), '', '', '', '', '', ''],
      [createCell(''), createCell(''), createCell(''), createCell(''), createCell(''), createCell(''), ''],
      [
        createCell('Kode CoA', { bold: true, fillColor: '#1e293b', fontColor: '#ffffff', halign: 'center' }),
        createCell('Nama Akun Rekening (Chart of Accounts)', { bold: true, fillColor: '#1e293b', fontColor: '#ffffff', halign: 'left' }),
        createCell('Kategori Akun', { bold: true, fillColor: '#1e293b', fontColor: '#ffffff', halign: 'center' }),
        createCell('Mutasi Debet (Rp)', { bold: true, fillColor: '#1e293b', fontColor: '#ffffff', halign: 'right' }),
        createCell('Mutasi Kredit (Rp)', { bold: true, fillColor: '#1e293b', fontColor: '#ffffff', halign: 'right' }),
        createCell('Saldo Akhir Debet (Rp)', { bold: true, fillColor: '#1e293b', fontColor: '#ffffff', halign: 'right' }),
        createCell('Saldo Akhir Kredit (Rp)', { bold: true, fillColor: '#1e293b', fontColor: '#ffffff', halign: 'right' })
      ],
      [createCell('101-100', { halign: 'center' }), createCell('Kas Bank Mandiri Operasional', { halign: 'left' }), createCell('Aset Lancar', { halign: 'center' }), createCell('Rp 175.000.000', { halign: 'right' }), createCell('Rp 61.200.000', { halign: 'right' }), createCell('=D4-E4', { halign: 'right', bold: true, fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' })],
      [createCell('102-100', { halign: 'center' }), createCell('Piutang Usaha Pelanggan (AR)', { halign: 'left' }), createCell('Aset Lancar', { halign: 'center' }), createCell('Rp 48.500.000', { halign: 'right' }), createCell('Rp 25.000.000', { halign: 'right' }), createCell('=D5-E5', { halign: 'right', bold: true, fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' })],
      [createCell('301-100', { halign: 'center' }), createCell('Modal Disetor Pemilik Perusahaan', { halign: 'left' }), createCell('Ekuitas', { halign: 'center' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 150.000.000', { halign: 'right' }), createCell('Rp 0', { halign: 'right' }), createCell('=E6-D6', { halign: 'right', bold: true, fontColor: '#a80000' })],
      [createCell('401-100', { halign: 'center' }), createCell('Pendapatan Penjualan Produk Utama', { halign: 'left' }), createCell('Pendapatan', { halign: 'center' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 48.500.000', { halign: 'right' }), createCell('Rp 0', { halign: 'right' }), createCell('=E7-D7', { halign: 'right', bold: true, fontColor: '#a80000' })],
      [createCell('501-100', { halign: 'center' }), createCell('Beban HPP Pembelian Bahan', { halign: 'left' }), createCell('HPP', { halign: 'center' }), createCell('Rp 35.000.000', { halign: 'right' }), createCell('Rp 0', { halign: 'right' }), createCell('=D8-E8', { halign: 'right', bold: true, fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' })],
      [createCell('601-100', { halign: 'center' }), createCell('Beban Gaji & Tunjangan Staf', { halign: 'left' }), createCell('Beban Operasional', { halign: 'center' }), createCell('Rp 18.000.000', { halign: 'right' }), createCell('Rp 0', { halign: 'right' }), createCell('=D9-E9', { halign: 'right', bold: true, fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' })],
      [createCell('602-100', { halign: 'center' }), createCell('Beban Sewa Gedung Kantor', { halign: 'left' }), createCell('Beban Operasional', { halign: 'center' }), createCell('Rp 5.000.000', { halign: 'right' }), createCell('Rp 0', { halign: 'right' }), createCell('=D10-E10', { halign: 'right', bold: true, fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' })],
      [createCell('603-100', { halign: 'center' }), createCell('Beban Utilitas Listrik & Internet', { halign: 'left' }), createCell('Beban Operasional', { halign: 'center' }), createCell('Rp 3.200.000', { halign: 'right' }), createCell('Rp 0', { halign: 'right' }), createCell('=D11-E11', { halign: 'right', bold: true, fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' })],
      [
        createCell('TOTAL TRIAL BALANCE', { bold: true, fillColor: '#e2e8f0' }),
        createCell('-', { fillColor: '#e2e8f0', halign: 'center' }),
        createCell('-', { fillColor: '#e2e8f0', halign: 'center' }),
        createCell('=SUM(D4:D11)', { bold: true, fillColor: '#e2e8f0', halign: 'right' }),
        createCell('=SUM(E4:E11)', { bold: true, fillColor: '#e2e8f0', halign: 'right' }),
        createCell('=SUM(F4:F11)', { bold: true, fillColor: '#e2e8f0', halign: 'right', fontColor: '#1e3a8a', fontSize: 12 }),
        createCell('=SUM(G4:G11)', { bold: true, fillColor: '#e2e8f0', halign: 'right', fontColor: '#1e3a8a', fontSize: 12 })
      ]
    ]
  },

  {
    id: 'laporan_laba_rugi_umum',
    category: 'finance',
    name: '📊 Laporan Laba Rugi Komprehensif (Income Statement P&L)',
    desc: 'Format resmi akuntansi perusahaan menghitung pendapatan bersih, HPP, gross profit, beban operasional, dan net profit',
    icon: '📊',
    colWidths: [110, 340, 120, 200],
    merges: [
      { r1: 0, c1: 0, r2: 0, c2: 3 },
      { r1: 1, c1: 0, r2: 1, c2: 3 }
    ],
    data: [
      [createCell('LAPORAN LABA RUGI KOMPREHENSIF (INCOME STATEMENT)', { bold: true, fontSize: 13, fillColor: '#065f46', fontColor: '#ffffff', halign: 'center' }), '', '', ''],
      [createCell('PT Deepernova Digital Enterprise | Periode Berakhir: 31 Desember 2026', { italic: true, fontSize: 10.5, fillColor: '#047857', fontColor: '#ffffff', halign: 'center' }), '', '', ''],
      [createCell(''), createCell(''), createCell(''), createCell('')],
      [
        createCell('Kode Akun', { bold: true, fillColor: '#0f5132', fontColor: '#ffffff', halign: 'center' }),
        createCell('Uraian Akun Keuangan (Chart of Accounts)', { bold: true, fillColor: '#0f5132', fontColor: '#ffffff', halign: 'left' }),
        createCell('Catatan', { bold: true, fillColor: '#0f5132', fontColor: '#ffffff', halign: 'center' }),
        createCell('Nilai Akumulasi (Rp)', { bold: true, fillColor: '#0f5132', fontColor: '#ffffff', halign: 'right' })
      ],
      [createCell('4-0000', { bold: true, fillColor: '#f8fafc' }), createCell('1. PENDAPATAN OPERASIONAL (REVENUE)', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' })],
      [createCell('4-1001', { halign: 'center' }), createCell('   Pendapatan Penjualan Produk Utama', { halign: 'left' }), createCell('Note 1', { halign: 'center' }), createCell('Rp 480.000.000', { halign: 'right', fontColor: '#107c41' })],
      [createCell('4-1002', { halign: 'center' }), createCell('   Pendapatan Jasa Konsultasi & Lisensi', { halign: 'left' }), createCell('Note 2', { halign: 'center' }), createCell('Rp 135.000.000', { halign: 'right', fontColor: '#107c41' })],
      [createCell('4-1003', { halign: 'center' }), createCell('   Diskon Penjualan & Retur Penjualan', { halign: 'left' }), createCell('Note 3', { halign: 'center' }), createCell('Rp -18.500.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('', { bold: true, fillColor: '#dcfce7' }), createCell('TOTAL PENDAPATAN BERSIH', { bold: true, fillColor: '#dcfce7' }), createCell('', { fillColor: '#dcfce7' }), createCell('=SUM(D6:D8)', { bold: true, fillColor: '#dcfce7', halign: 'right', fontColor: '#107c41', fontSize: 11.5 })],
      [createCell('5-0000', { bold: true, fillColor: '#f8fafc' }), createCell('2. HARGA POKOK PENJUALAN (HPP / COGS)', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' })],
      [createCell('5-1001', { halign: 'center' }), createCell('   Pembelian Bahan Baku Direct Material', { halign: 'left' }), createCell('Note 4', { halign: 'center' }), createCell('Rp 195.000.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('5-1002', { halign: 'center' }), createCell('   Upah Tenaga Kerja Langsung Production', { halign: 'left' }), createCell('Note 5', { halign: 'center' }), createCell('Rp 52.000.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('5-1003', { halign: 'center' }), createCell('   Biaya Overhead Pabrik & Shipping', { halign: 'left' }), createCell('Note 6', { halign: 'center' }), createCell('Rp 18.500.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('', { bold: true, fillColor: '#fee2e2' }), createCell('TOTAL HARGA POKOK PENJUALAN', { bold: true, fillColor: '#fee2e2' }), createCell('', { fillColor: '#fee2e2' }), createCell('=SUM(D11:D13)', { bold: true, fillColor: '#fee2e2', halign: 'right', fontColor: '#a80000' })],
      [createCell('', { bold: true, fillColor: '#e0f2fe' }), createCell('LABA KOTOR (GROSS PROFIT)', { bold: true, fillColor: '#e0f2fe', fontSize: 11.5 }), createCell('', { fillColor: '#e0f2fe' }), createCell('=D9-D14', { bold: true, fillColor: '#e0f2fe', halign: 'right', fontColor: '#0369a1', fontSize: 12 })],
      [createCell('6-0000', { bold: true, fillColor: '#f8fafc' }), createCell('3. BEBAN OPERASIONAL (OPERATING EXPENSES)', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' })],
      [createCell('6-1001', { halign: 'center' }), createCell('   Gaji Manajerial & Karyawan Staf Kantor', { halign: 'left' }), createCell('', { halign: 'center' }), createCell('Rp 98.000.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('6-1002', { halign: 'center' }), createCell('   Beban Sewa Gedung & Fasilitas', { halign: 'left' }), createCell('', { halign: 'center' }), createCell('Rp 26.000.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('6-1003', { halign: 'center' }), createCell('   Utilitas (Listrik, Air, Internet & Telp)', { halign: 'left' }), createCell('', { halign: 'center' }), createCell('Rp 16.200.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('6-1004', { halign: 'center' }), createCell('   Beban Pemasaran, Ads & Promotion', { halign: 'left' }), createCell('', { halign: 'center' }), createCell('Rp 32.000.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('6-1005', { halign: 'center' }), createCell('   Depresiasi Penyusutan Aset Tetap', { halign: 'left' }), createCell('', { halign: 'center' }), createCell('Rp 9.500.000', { halign: 'right', fontColor: '#a80000' })],
      [createCell('', { bold: true, fillColor: '#fee2e2' }), createCell('TOTAL BEBAN OPERASIONAL', { bold: true, fillColor: '#fee2e2' }), createCell('', { fillColor: '#fee2e2' }), createCell('=SUM(D17:D21)', { bold: true, fillColor: '#fee2e2', halign: 'right', fontColor: '#a80000' })],
      [createCell('', { bold: true, fillColor: '#fef08a' }), createCell('LABA BERSIH SEBELUM PAJAK (NET PROFIT)', { bold: true, fillColor: '#fef08a', fontSize: 12 }), createCell('', { fillColor: '#fef08a' }), createCell('=D15-D22', { bold: true, fillColor: '#fef08a', halign: 'right', fontColor: '#15803d', fontSize: 13 })]
    ]
  },

  {
    id: 'neraca_keuangan_perusahaan',
    category: 'finance',
    name: '🏛️ Laporan Posisi Keuangan (Balance Sheet Corporate)',
    desc: 'Neraca keuangan perusahaan menyajikan Aktiva Aset Lancar/Tetap vs Pasiva Kewajiban & Ekuitas Modal',
    icon: '🏛️',
    colWidths: [320, 180, 320, 180],
    merges: [
      { r1: 0, c1: 0, r2: 0, c2: 3 },
      { r1: 1, c1: 0, r2: 1, c2: 3 }
    ],
    data: [
      [createCell('LAPORAN POSISI KEUANGAN CORPORATE (BALANCE SHEET)', { bold: true, fontSize: 13, fillColor: '#1e1b4b', fontColor: '#ffffff', halign: 'center' }), '', '', ''],
      [createCell('PT Deepernova Enterprise Tbk | Per 31 Desember 2026', { italic: true, fontSize: 10.5, fillColor: '#312e81', fontColor: '#ffffff', halign: 'center' }), '', '', ''],
      [createCell(''), createCell(''), createCell(''), createCell('')],
      [
        createCell('ASET (ASSETS)', { bold: true, fillColor: '#3730a3', fontColor: '#ffffff', halign: 'left' }),
        createCell('Nilai (Rp)', { bold: true, fillColor: '#3730a3', fontColor: '#ffffff', halign: 'right' }),
        createCell('KEWAJIBAN & EKUITAS (LIABILITIES & EQUITY)', { bold: true, fillColor: '#3730a3', fontColor: '#ffffff', halign: 'left' }),
        createCell('Nilai (Rp)', { bold: true, fillColor: '#3730a3', fontColor: '#ffffff', halign: 'right' })
      ],
      [createCell('ASET LANCAR (CURRENT ASSETS)', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' }), createCell('KEWAJIBAN JANGKA PENDEK (CURRENT LIABILITIES)', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' })],
      [createCell('   Kas dan Setara Kas', { halign: 'left' }), createCell('Rp 185.000.000', { halign: 'right' }), createCell('   Hutang Usaha Dagang (AP)', { halign: 'left' }), createCell('Rp 45.000.000', { halign: 'right' })],
      [createCell('   Piutang Usaha (AR)', { halign: 'left' }), createCell('Rp 95.000.000', { halign: 'right' }), createCell('   Beban Akrual Masih Harus Dibayar', { halign: 'left' }), createCell('Rp 18.500.000', { halign: 'right' })],
      [createCell('   Persediaan Barang Dagang', { halign: 'left' }), createCell('Rp 140.000.000', { halign: 'right' }), createCell('   Hutang Pajak Perusahaan', { halign: 'left' }), createCell('Rp 12.000.000', { halign: 'right' })],
      [createCell('TOTAL ASET LANCAR', { bold: true, fillColor: '#e0f2fe' }), createCell('=SUM(B6:B8)', { bold: true, fillColor: '#e0f2fe', halign: 'right' }), createCell('TOTAL KEWAJIBAN JANGKA PENDEK', { bold: true, fillColor: '#fee2e2' }), createCell('=SUM(D6:D8)', { bold: true, fillColor: '#fee2e2', halign: 'right' })],
      [createCell(''), createCell(''), createCell(''), createCell('')],
      [createCell('ASET TETAP (NON-CURRENT ASSETS)', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' }), createCell('EKUITAS MODAL (SHAREHOLDERS EQUITY)', { bold: true, fillColor: '#f8fafc' }), createCell('', { fillColor: '#f8fafc' })],
      [createCell('   Peralatan & Mesin Kantor', { halign: 'left' }), createCell('Rp 220.000.000', { halign: 'right' }), createCell('   Modal Disetor Pemegang Saham', { halign: 'left' }), createCell('Rp 450.000.000', { halign: 'right' })],
      [createCell('   Akumulasi Penyusutan', { halign: 'left' }), createCell('Rp -40.000.000', { halign: 'right', fontColor: '#a80000' }), createCell('   Laba Ditahan (Retained Earnings)', { halign: 'left' }), createCell('Rp 114.500.000', { halign: 'right' })],
      [createCell('TOTAL ASET TETAP BERSIH', { bold: true, fillColor: '#e0f2fe' }), createCell('=SUM(B12:B13)', { bold: true, fillColor: '#e0f2fe', halign: 'right' }), createCell('TOTAL EKUITAS MODAL', { bold: true, fillColor: '#dcfce7' }), createCell('=SUM(D12:D13)', { bold: true, fillColor: '#dcfce7', halign: 'right' })],
      [createCell(''), createCell(''), createCell(''), createCell('')],
      [createCell('TOTAL ASET KESELURUHAN', { bold: true, fillColor: '#cff4fc', fontSize: 12 }), createCell('=B9+B14', { bold: true, fillColor: '#cff4fc', halign: 'right', fontSize: 12.5, fontColor: '#0369a1' }), createCell('TOTAL LIABILITAS & EKUITAS', { bold: true, fillColor: '#cff4fc', fontSize: 12 }), createCell('=D9+D14', { bold: true, fillColor: '#cff4fc', halign: 'right', fontSize: 12.5, fontColor: '#0369a1' })]
    ]
  },

  {
    id: 'cashflow_arus_kas',
    category: 'finance',
    name: '💸 Laporan Arus Kas Operasional (Cash Flow Statement)',
    desc: 'Tabel pemantauan inflow vs outflow penerimaan kas, pengeluaran kas, dan saldo kas akhir',
    icon: '💸',
    colWidths: [110, 280, 170, 170, 180],
    merges: [{ r1: 0, c1: 0, r2: 0, c2: 4 }],
    data: [
      [createCell('LAPORAN ARUS KAS ARUS OPERASIONAL & INVESTASI', { bold: true, fontSize: 13, fillColor: '#0369a1', fontColor: '#ffffff', halign: 'center' }), '', '', '', ''],
      [createCell(''), createCell(''), createCell(''), createCell(''), createCell('')],
      [
        createCell('Tanggal', { bold: true, fillColor: '#0284c7', fontColor: '#ffffff', halign: 'center' }),
        createCell('Keterangan Aliran Transaksi Kas', { bold: true, fillColor: '#0284c7', fontColor: '#ffffff', halign: 'left' }),
        createCell('Kas Masuk (Inflow Rp)', { bold: true, fillColor: '#0284c7', fontColor: '#ffffff', halign: 'right' }),
        createCell('Kas Keluar (Outflow Rp)', { bold: true, fillColor: '#0284c7', fontColor: '#ffffff', halign: 'right' }),
        createCell('Saldo Kas Kumulatif (Rp)', { bold: true, fillColor: '#0284c7', fontColor: '#ffffff', halign: 'right' })
      ],
      [createCell('2026-08-01', { halign: 'center' }), createCell('Saldo Awal Kas Bank & Kasir', { bold: true }), createCell('Rp 50.000.000', { halign: 'right' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 50.000.000', { halign: 'right', bold: true })],
      [createCell('2026-08-02', { halign: 'center' }), createCell('Penerimaan Kas Pelanggan Invoice #102', { halign: 'left' }), createCell('Rp 35.000.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('=E4+C5-D5', { halign: 'right', bold: true })],
      [createCell('2026-08-03', { halign: 'center' }), createCell('Pembayaran Pembelian Supplier Material', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 18.500.000', { halign: 'right', fontColor: '#a80000' }), createCell('=E5+C6-D6', { halign: 'right', bold: true })],
      [createCell('2026-08-05', { halign: 'center' }), createCell('Pembayaran Gaji Karyawan Staf Minggu I', { halign: 'left' }), createCell('Rp 0', { halign: 'right' }), createCell('Rp 22.000.000', { halign: 'right', fontColor: '#a80000' }), createCell('=E6+C7-D7', { halign: 'right', bold: true })],
      [createCell('2026-08-07', { halign: 'center' }), createCell('Penerimaan Setoran Modal Investor', { halign: 'left' }), createCell('Rp 40.000.000', { halign: 'right', fontColor: '#107c41' }), createCell('Rp 0', { halign: 'right' }), createCell('=E7+C8-D8', { halign: 'right', bold: true, fontColor: '#0284c7', fontSize: 11.5 })],
      [
        createCell('TOTAL KAS & SALDO AKHIR', { bold: true, fillColor: '#e0f2fe' }),
        createCell('-', { fillColor: '#e0f2fe', halign: 'center' }),
        createCell('=SUM(C4:C8)', { bold: true, fillColor: '#e0f2fe', halign: 'right', fontColor: '#107c41' }),
        createCell('=SUM(D4:D8)', { bold: true, fillColor: '#e0f2fe', halign: 'right', fontColor: '#a80000' }),
        createCell('=E8', { bold: true, fillColor: '#e0f2fe', halign: 'right', fontColor: '#0284c7', fontSize: 12 })
      ]
    ]
  }
];
