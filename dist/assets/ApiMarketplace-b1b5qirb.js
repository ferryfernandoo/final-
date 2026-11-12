import{o as e}from"./chunk-zsgVPwQN.js";import{t}from"./apiConfig-BCHrkqAO.js";import{n,t as r}from"./jsx-runtime-B7t2Rf0D.js";import{n as i}from"./mobileNavigationService-CKrM2R6B.js";var a=e(n()),o=r(),ee=({onLogout:e,onNavigate:n,user:r,isAuthenticated:ee,onLoginRequest:s})=>{let[c,l]=(0,a.useState)(`landing`),[u,te]=(0,a.useState)([]),[ne,re]=(0,a.useState)(1e6),[ie,d]=(0,a.useState)(0),[f,p]=(0,a.useState)(1e6),[m,h]=(0,a.useState)(!1),[g,_]=(0,a.useState)(!1),[v,y]=(0,a.useState)(!1),[b,x]=(0,a.useState)(!1),[S,C]=(0,a.useState)(``),[w,T]=(0,a.useState)(`ai`),[E,D]=(0,a.useState)(`getting-started`),[O,k]=(0,a.useState)(`javascript`),[A,j]=(0,a.useState)(`javascript`),[M,ae]=(0,a.useState)(`no-key`),[N,P]=(0,a.useState)(!1),[F,I]=(0,a.useState)(``),[L,oe]=(0,a.useState)(``),[R,z]=(0,a.useState)(null),[B,V]=(0,a.useState)(``),[H,se]=(0,a.useState)(``);(0,a.useEffect)(()=>i(()=>b?(x(!1),!0):v?(y(!1),!0):g?(_(!1),!0):N?(P(!1),!0):c===`landing`?!1:(l(`landing`),!0),22),[b,v,g,N,c]);let[U,ce]=(0,a.useState)(``),[W,le]=(0,a.useState)(`deepernova-gold-1.5`),[G,ue]=(0,a.useState)(`Halo DeeperNova Gold 1.5! Berikan 3 tips belajar coding yang efektif.`),[de,fe]=(0,a.useState)(!1),[K,q]=(0,a.useState)(null),[pe,me]=(0,a.useState)(!1),[he,ge]=(0,a.useState)([]),[_e,ve]=(0,a.useState)([]),[J,ye]=(0,a.useState)({totalRequests:0,totalTokens:0,avgLatency:0}),Y=t,X=`https://0cb0e44cce91b6.lhr.life`.replace(/\/+$/,``);(0,a.useEffect)(()=>{Z()},[]),(0,a.useEffect)(()=>{c===`usage`&&be()},[c,u]);let Z=async()=>{try{h(!0);let e=await(await fetch(`${Y}/api/apikeys`,{credentials:`include`})).json();e.success&&(te(e.keys||[]),e.tokenQuota!==void 0&&re(e.tokenQuota),e.tokensUsed!==void 0&&d(e.tokensUsed),e.remainingTokens!==void 0&&p(e.remainingTokens),e.keys&&e.keys.length>0&&!U&&ce((e.keys.find(e=>e.isActive)||e.keys[0]).id))}catch(e){console.warn(`API keys fetch:`,e.message)}finally{h(!1)}},be=async()=>{try{me(!0);let e=``;if(u.length>0){let t=await fetch(`${Y}/api/apikeys/${u[0].id}/full`,{credentials:`include`}).catch(()=>null);if(t&&t.ok){let n=await t.json();n.fullKey&&(e=n.fullKey)}}let t={"Content-Type":`application/json`};e&&(t.Authorization=`Bearer ${e}`);let n=await fetch(`${Y}/api/v1/usage`,{headers:t,credentials:`include`});if(n.ok){let e=await n.json();if(e.success){ge(e.history||[]),ve(e.recent_logs||[]),e.token_quota!==void 0&&re(e.token_quota),e.tokens_used!==void 0&&d(e.tokens_used),e.remaining_tokens!==void 0&&p(e.remaining_tokens);let t=(e.history||[]).reduce((e,t)=>e+(t.requestCount||0),0),n=(e.history||[]).length>0?Math.round((e.history||[]).reduce((e,t)=>e+(t.avgLatency||0),0)/(e.history.length||1)):0;ye({totalRequests:t||+(e.tokens_used>0),totalTokens:e.tokens_used||0,avgLatency:n||120})}}}catch(e){console.warn(`Usage analytics fetch error:`,e.message)}finally{me(!1)}},xe=async()=>{if(!F.trim()){V(`Masukkan nama untuk API Key`);return}try{h(!0);let e=await(await fetch(`${Y}/api/apikeys`,{method:`POST`,headers:{"Content-Type":`application/json`},credentials:`include`,body:JSON.stringify({name:F.trim()})})).json();e.success?(z(e.key),_(!0),y(!1),I(``),V(``),await Z()):V(e.error||`Gagal membuat API Key`)}catch(e){console.error(`Error creating API key:`,e),V(`Gagal membuat API key`)}finally{h(!1)}},Se=async e=>{try{let t=await(await fetch(`${Y}/api/apikeys/${e}/full`,{credentials:`include`})).json();t.success&&(oe(t.fullKey),x(!0))}catch{V(`Gagal memuat API key lengkap`)}},Ce=async e=>{try{let t=await(await fetch(`${Y}/api/apikeys/${e}/full`,{credentials:`include`})).json();t.success&&(navigator.clipboard.writeText(t.fullKey),C(`key-${e}`),se(`API Key berhasil disalin!`),setTimeout(()=>{C(``),se(``)},3e3))}catch{V(`Gagal menyalin key`)}},we=async(e,t)=>{try{(await(await fetch(`${Y}/api/apikeys/${e}`,{method:`PUT`,headers:{"Content-Type":`application/json`},credentials:`include`,body:JSON.stringify(t)})).json()).success&&await Z()}catch{V(`Gagal mengubah status key`)}},Te=async e=>{if(window.confirm(`Hapus API key ini? Aplikasi yang menggunakannya tidak dapat mengakses API lagi.`))try{(await(await fetch(`${Y}/api/apikeys/${e}`,{method:`DELETE`,credentials:`include`})).json()).success&&await Z()}catch{V(`Gagal menghapus API key`)}},Q=(e,t)=>{navigator.clipboard.writeText(e),C(t),setTimeout(()=>C(``),2500)},Ee=async()=>{if(!U){V(`Pilih API Key terlebih dahulu untuk pengujian.`);return}fe(!0),q(null),V(``);try{let e=await(await fetch(`${Y}/api/apikeys/${U}/full`,{credentials:`include`})).json();if(!e.success||!e.fullKey)throw Error(`Gagal mengambil secret key untuk pengetesan.`);let t=e.fullKey,n=await fetch(`${Y}/api/v1/test`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${t}`},body:JSON.stringify({prompt:G.trim(),model:W})}),r=await n.json();n.ok&&r.success?(q({success:!0,status:r.status||200,latencyMs:r.latency_ms||0,model:r.model||W,reply:r.reply||``,tokensConsumed:r.tokens_consumed||0,promptTokens:Math.ceil(G.length/4),completionTokens:Math.ceil((r.reply||``).length/4),remainingTokens:r.remaining_tokens??f,tokenQuota:r.token_quota??ne}),r.remaining_tokens!==void 0&&p(r.remaining_tokens),await Z()):q({success:!1,status:n.status,error:r.error||r.message||`Hit test gagal dieksekusi.`})}catch(e){q({success:!1,status:500,error:e.message||`Koneksi ke backend API gagal.`})}finally{fe(!1)}},$=(()=>{let e=[];for(let t=6;t>=0;t--){let n=new Date;n.setDate(n.getDate()-t);let r=n.toISOString().slice(0,10),i=he.find(e=>e.date===r);e.push({date:r,label:n.toLocaleDateString(`id-ID`,{weekday:`short`,day:`numeric`,month:`short`}),tokens:i&&i.totalTokens||0,requests:i&&i.requestCount||0})}return e})(),De=Math.max(100,...$.map(e=>e.tokens)),Oe=Math.max(5,...$.map(e=>e.requests));return(0,o.jsxs)(`div`,{className:`api-marketplace`,children:[(0,o.jsx)(`nav`,{className:`api-nav`,children:(0,o.jsxs)(`div`,{className:`nav-container`,children:[(0,o.jsxs)(`div`,{className:`logo`,onClick:()=>{l(`landing`),P(!1)},style:{cursor:`pointer`},children:[(0,o.jsx)(`h1`,{children:`⚡ DeeperNova API`}),(0,o.jsx)(`span`,{className:`tagline`,children:`Enterprise AI Gateway & Sub-20ms Search`})]}),(0,o.jsxs)(`div`,{className:`nav-right-cluster`,children:[(0,o.jsxs)(`div`,{className:`api-nav-actions`,children:[(0,o.jsx)(`button`,{className:`btn-back-home desktop-only-btn`,onClick:()=>n?.(`landing`),title:`Kembali ke Beranda Utama`,children:`← Beranda`}),u.length>0?(0,o.jsxs)(`button`,{className:`btn-get-started`,onClick:()=>{y(!0),P(!1)},children:[(0,o.jsx)(`span`,{className:`btn-text-full`,children:`+ Buat API Key`}),(0,o.jsx)(`span`,{className:`btn-text-mobile`,children:`+ Key`})]}):ee?(0,o.jsxs)(`button`,{className:`btn-get-started`,onClick:()=>{y(!0),P(!1)},children:[(0,o.jsx)(`span`,{className:`btn-text-full`,children:`Dapatkan Kunci API`}),(0,o.jsx)(`span`,{className:`btn-text-mobile`,children:`Kunci API`})]}):(0,o.jsxs)(`button`,{className:`btn-get-started`,onClick:()=>{s?s():n?.(`landing`),P(!1)},children:[(0,o.jsx)(`span`,{className:`btn-text-full`,children:`Login / Daftar`}),(0,o.jsx)(`span`,{className:`btn-text-mobile`,children:`Login`})]})]}),(0,o.jsx)(`button`,{className:`nav-toggle`,onClick:()=>P(e=>!e),"aria-label":`Toggle navigation menu`,children:N?`✕`:`☰`})]}),(0,o.jsxs)(`div`,{className:`api-nav-menu ${N?`open`:`collapsed`}`,children:[(0,o.jsx)(`button`,{className:`api-nav-btn ${c===`landing`?`active`:``}`,onClick:()=>{l(`landing`),P(!1)},children:`🏠 Beranda Portal API`}),(0,o.jsx)(`button`,{className:`api-nav-btn ${c===`docs`?`active`:``}`,onClick:()=>{l(`docs`),P(!1)},children:`📖 Dokumentasi API`}),(0,o.jsx)(`button`,{className:`api-nav-btn ${c===`dashboard`?`active`:``}`,onClick:()=>{l(`dashboard`),P(!1)},children:`🔑 Dashboard & Keys`}),(0,o.jsx)(`button`,{className:`api-nav-btn ${c===`usage`?`active`:``}`,onClick:()=>{l(`usage`),P(!1)},children:`📊 Laporan Usage & Grafik`}),(0,o.jsx)(`div`,{className:`mobile-menu-divider`}),(0,o.jsx)(`button`,{className:`api-nav-btn mobile-back-home-btn`,onClick:()=>{n?.(`landing`),P(!1)},children:`⬅️ Kembali ke Beranda Utama`}),r&&(0,o.jsx)(`div`,{className:`mobile-user-status`,children:(0,o.jsxs)(`span`,{children:[`Login sebagai: `,(0,o.jsx)(`strong`,{children:r.username||r.email||`Developer`})]})})]})]})}),(0,o.jsxs)(`div`,{className:`token-welcome-ribbon`,children:[(0,o.jsxs)(`div`,{className:`token-welcome-left`,children:[(0,o.jsx)(`span`,{className:`token-gift-icon`,children:`🎁`}),(0,o.jsxs)(`span`,{children:[(0,o.jsx)(`strong`,{children:`Free Developer Quota:`}),` 1.000.000 Token Input & Output Gratis (Semua Akun Aktif)`]}),(0,o.jsx)(`span`,{className:`token-free-badge`,children:`100% FREE ACTIVE`})]}),(0,o.jsx)(`div`,{className:`token-welcome-right`,children:(0,o.jsxs)(`span`,{children:[`Sisa Saldo: `,(0,o.jsx)(`strong`,{children:f.toLocaleString()}),` Token`]})})]}),H&&(0,o.jsxs)(`div`,{className:`alert-toast success`,children:[`✓ `,H]}),B&&(0,o.jsxs)(`div`,{className:`alert-toast error`,children:[`⚠️ `,B]}),(0,o.jsxs)(`div`,{className:`api-container`,children:[c===`landing`&&(0,o.jsxs)(`div`,{className:`api-landing-page`,children:[(0,o.jsxs)(`header`,{className:`hero-section`,children:[(0,o.jsx)(`div`,{className:`hero-badge`,children:`⚡ DUA API POWERFUL DALAM SATU PLATFORM`}),(0,o.jsxs)(`h1`,{className:`hero-title`,children:[`AI Gateway Generasi Baru & `,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`gradient-text`,children:`Mesin Pencari Berkecepatan Tinggi`})]}),(0,o.jsxs)(`p`,{className:`hero-subtitle`,children:[`Hubungkan aplikasi web, mobile, bot, dan backend Anda ke model AI `,(0,o.jsx)(`strong`,{children:`DeeperNova Gold 1.5`}),` via direct Cloudflare REST API serta `,(0,o.jsx)(`strong`,{children:`DeeperNova Search Engine API`}),` sub-20ms. Gratis 1.000.000 Token.`]}),(0,o.jsxs)(`div`,{className:`hero-cta-group`,children:[(0,o.jsx)(`button`,{className:`btn-primary-large`,onClick:()=>l(`dashboard`),children:`🚀 Buka Dashboard & Buat Kunci`}),(0,o.jsx)(`button`,{className:`btn-secondary-large`,onClick:()=>l(`docs`),children:`📖 Lihat Dokumentasi Lengkap`}),(0,o.jsx)(`button`,{className:`btn-secondary-large`,onClick:()=>l(`usage`),children:`📊 Lihat Laporan Usage`})]}),(0,o.jsxs)(`div`,{className:`platform-pillars-grid`,children:[(0,o.jsxs)(`div`,{className:`pillar-card ai-pillar`,children:[(0,o.jsx)(`div`,{className:`pillar-icon`,children:`🌟`}),(0,o.jsx)(`h3`,{children:`DeeperNova Gold 1.5 AI API`}),(0,o.jsx)(`p`,{children:`Inference cloud ultra-cepat dengan arsitektur multimodal vision dan penalaran mendalam.`}),(0,o.jsxs)(`ul`,{className:`pillar-list`,children:[(0,o.jsx)(`li`,{children:`✓ Direct Cloudflare REST API (Tembak langsung tanpa library OpenAI)`}),(0,o.jsx)(`li`,{children:`✓ Jendela Konteks Luas 128.000 Token`}),(0,o.jsx)(`li`,{children:`✓ Dukungan Streaming Real-Time (SSE)`}),(0,o.jsx)(`li`,{children:`✓ Model: Gold 1.5 & Gold 1.5 Pro (70B)`})]}),(0,o.jsx)(`button`,{className:`btn-pillar`,onClick:()=>{T(`ai`),l(`docs`)},children:`Dokumentasi AI API ➔`})]}),(0,o.jsxs)(`div`,{className:`pillar-card search-pillar`,children:[(0,o.jsx)(`div`,{className:`pillar-icon`,children:`🔍`}),(0,o.jsx)(`h3`,{children:`DeeperNova Search Engine API`}),(0,o.jsx)(`p`,{children:`Mesin pencari mandiri berkecepatan tinggi dengan latensi sub-20ms dan indeks web real-time.`}),(0,o.jsxs)(`ul`,{className:`pillar-list`,children:[(0,o.jsxs)(`li`,{children:[`✓ Endpoint: `,(0,o.jsx)(`code`,{children:`/api/v1/search`}),`, `,(0,o.jsx)(`code`,{children:`/images`}),`, `,(0,o.jsx)(`code`,{children:`/news`})]}),(0,o.jsx)(`li`,{children:`✓ Latensi pencarian rata-rata 12ms - 18ms`}),(0,o.jsx)(`li`,{children:`✓ Anti-typo cerdas & pembobotan BM25 presisi`}),(0,o.jsx)(`li`,{children:`✓ Web grounding siap diintegrasikan ke RAG / Agent`})]}),(0,o.jsx)(`button`,{className:`btn-pillar`,onClick:()=>{T(`search`),l(`docs`)},children:`Dokumentasi Search Engine API ➔`})]})]})]}),(0,o.jsxs)(`section`,{className:`preview-section`,children:[(0,o.jsxs)(`div`,{className:`preview-header`,children:[(0,o.jsx)(`h3`,{children:`Integrasi Instan dalam 3 Baris Kode`}),(0,o.jsxs)(`p`,{children:[`Langsung tembak endpoint Cloudflare DeeperNova menggunakan `,(0,o.jsx)(`code`,{children:`fetch()`}),` atau HTTP client pilihan Anda.`]})]}),(0,o.jsxs)(`div`,{className:`code-box-wrapper`,children:[(0,o.jsxs)(`div`,{className:`code-box-header`,children:[(0,o.jsxs)(`div`,{className:`window-dots`,children:[(0,o.jsx)(`span`,{}),(0,o.jsx)(`span`,{}),(0,o.jsx)(`span`,{})]}),(0,o.jsx)(`span`,{className:`code-box-title`,children:`Direct Cloudflare REST API (JavaScript / Fetch)`}),(0,o.jsx)(`button`,{className:`copy-btn-snippet`,onClick:()=>Q(`const response = await fetch("${X}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY"
  },
  body: JSON.stringify({
    model: "deepernova-gold-1.5",
    messages: [{ role: "user", content: "Halo DeeperNova Gold 1.5!" }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`,`quick-snippet`),children:S===`quick-snippet`?`✓ Tersalin`:`Salin Kode`})]}),(0,o.jsx)(`pre`,{className:`code-snippet-pre`,children:(0,o.jsx)(`code`,{children:`const response = await fetch("${X}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY"
  },
  body: JSON.stringify({
    model: "deepernova-gold-1.5",
    messages: [{ role: "user", content: "Halo DeeperNova Gold 1.5!" }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`})})]})]})]}),c===`usage`&&(0,o.jsxs)(`div`,{className:`usage-page`,children:[(0,o.jsxs)(`div`,{className:`page-header-row`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h2`,{children:`📊 Laporan Penggunaan & Grafik Usage`}),(0,o.jsx)(`p`,{children:`Pantau konsumsi token, volume request harian, dan metrik latensi API Anda secara transparan.`})]}),(0,o.jsx)(`button`,{className:`btn-secondary`,onClick:be,disabled:pe,children:pe?`Memperbarui...`:`🔄 Refresh Data Usage`})]}),(0,o.jsxs)(`div`,{className:`metrics-cards-grid`,children:[(0,o.jsxs)(`div`,{className:`metric-box`,children:[(0,o.jsx)(`div`,{className:`metric-icon`,children:`🔥`}),(0,o.jsxs)(`div`,{className:`metric-info`,children:[(0,o.jsx)(`span`,{className:`metric-label`,children:`Total Token Terpakai`}),(0,o.jsx)(`span`,{className:`metric-val`,children:(ie||J.totalTokens).toLocaleString()}),(0,o.jsx)(`span`,{className:`metric-sub`,children:`Token diproses`})]})]}),(0,o.jsxs)(`div`,{className:`metric-box`,children:[(0,o.jsx)(`div`,{className:`metric-icon`,children:`🎁`}),(0,o.jsxs)(`div`,{className:`metric-info`,children:[(0,o.jsx)(`span`,{className:`metric-label`,children:`Sisa Kuota Gratis`}),(0,o.jsx)(`span`,{className:`metric-val`,children:f.toLocaleString()}),(0,o.jsx)(`span`,{className:`metric-sub`,children:`dari 1.000.000 token`})]})]}),(0,o.jsxs)(`div`,{className:`metric-box`,children:[(0,o.jsx)(`div`,{className:`metric-icon`,children:`🚀`}),(0,o.jsxs)(`div`,{className:`metric-info`,children:[(0,o.jsx)(`span`,{className:`metric-label`,children:`Total Request`}),(0,o.jsx)(`span`,{className:`metric-val`,children:J.totalRequests}),(0,o.jsx)(`span`,{className:`metric-sub`,children:`Panggilan API`})]})]}),(0,o.jsxs)(`div`,{className:`metric-box`,children:[(0,o.jsx)(`div`,{className:`metric-icon`,children:`⚡`}),(0,o.jsxs)(`div`,{className:`metric-info`,children:[(0,o.jsx)(`span`,{className:`metric-label`,children:`Rata-Rata Latensi`}),(0,o.jsxs)(`span`,{className:`metric-val`,children:[J.avgLatency||120,` ms`]}),(0,o.jsx)(`span`,{className:`metric-sub`,children:`Super responsif`})]})]})]}),(0,o.jsxs)(`div`,{className:`chart-card-wrapper`,children:[(0,o.jsxs)(`div`,{className:`chart-header`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h3`,{children:`📈 Grafik Tren Penggunaan Token Harian (7 Hari Terakhir)`}),(0,o.jsx)(`p`,{className:`chart-subtitle`,children:`Akumulasi input dan output token per hari yang tercatat di server.`})]}),(0,o.jsx)(`span`,{className:`chart-badge`,children:`Live Server Database Sync`})]}),(0,o.jsx)(`div`,{className:`chart-canvas-container`,children:(0,o.jsx)(`div`,{className:`chart-bars-row`,children:$.map((e,t)=>{let n=De>0?Math.max(8,Math.round(e.tokens/De*100)):8;return(0,o.jsxs)(`div`,{className:`chart-bar-col`,children:[(0,o.jsxs)(`div`,{className:`chart-bar-tooltip`,children:[(0,o.jsx)(`strong`,{children:e.date}),(0,o.jsx)(`br`,{}),e.tokens.toLocaleString(),` Token`,(0,o.jsx)(`br`,{}),e.requests,` Request`]}),(0,o.jsx)(`div`,{className:`chart-bar-track`,children:(0,o.jsx)(`div`,{className:`chart-bar-fill`,style:{height:`${n}%`}})}),(0,o.jsx)(`span`,{className:`chart-bar-label`,children:e.label}),(0,o.jsx)(`span`,{className:`chart-bar-val`,children:e.tokens>0?`${e.tokens}t`:`0`})]},t)})})})]}),(0,o.jsxs)(`div`,{className:`chart-card-wrapper`,style:{marginTop:`20px`},children:[(0,o.jsx)(`div`,{className:`chart-header`,children:(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h3`,{children:`📊 Grafik Volume Panggilan Request Harian`}),(0,o.jsx)(`p`,{className:`chart-subtitle`,children:`Frekuensi pemanggilan endpoint API DeeperNova per hari.`})]})}),(0,o.jsx)(`div`,{className:`chart-canvas-container`,children:(0,o.jsx)(`div`,{className:`chart-bars-row`,children:$.map((e,t)=>{let n=Oe>0?Math.max(8,Math.round(e.requests/Oe*100)):8;return(0,o.jsxs)(`div`,{className:`chart-bar-col`,children:[(0,o.jsxs)(`div`,{className:`chart-bar-tooltip`,children:[(0,o.jsx)(`strong`,{children:e.date}),(0,o.jsx)(`br`,{}),e.requests,` Request Berhasil`]}),(0,o.jsx)(`div`,{className:`chart-bar-track`,children:(0,o.jsx)(`div`,{className:`chart-bar-fill requests-fill`,style:{height:`${n}%`}})}),(0,o.jsx)(`span`,{className:`chart-bar-label`,children:e.label}),(0,o.jsxs)(`span`,{className:`chart-bar-val`,children:[e.requests,` req`]})]},t)})})})]}),(0,o.jsxs)(`div`,{className:`logs-table-card`,style:{marginTop:`24px`},children:[(0,o.jsx)(`div`,{className:`chart-header`,children:(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h3`,{children:`📋 Riwayat Pemanggilan API Terkini (Server Database Logs)`}),(0,o.jsx)(`p`,{className:`chart-subtitle`,children:`Catatan historis setiap panggilan API yang tercatat di database server.`})]})}),_e.length===0?(0,o.jsxs)(`div`,{className:`empty-logs-box`,children:[(0,o.jsx)(`p`,{children:`Belum ada rekaman pemanggilan API untuk akun ini.`}),(0,o.jsx)(`button`,{className:`btn-primary`,onClick:()=>l(`dashboard`),children:`Coba Hit API Sekarang di Dashboard`})]}):(0,o.jsx)(`div`,{className:`table-responsive`,children:(0,o.jsxs)(`table`,{className:`logs-table`,children:[(0,o.jsx)(`thead`,{children:(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`th`,{children:`Waktu (WIB)`}),(0,o.jsx)(`th`,{children:`Endpoint`}),(0,o.jsx)(`th`,{children:`Model`}),(0,o.jsx)(`th`,{children:`Token In/Out`}),(0,o.jsx)(`th`,{children:`Total Token`}),(0,o.jsx)(`th`,{children:`Status`}),(0,o.jsx)(`th`,{children:`Latensi`})]})}),(0,o.jsx)(`tbody`,{children:_e.map(e=>(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{style:{fontSize:`12px`,color:`#64748b`},children:new Date(e.createdAt).toLocaleString(`id-ID`)}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`code`,{children:e.endpoint})}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`span`,{className:`model-chip`,children:e.model})}),(0,o.jsxs)(`td`,{children:[e.promptTokens||0,` / `,e.completionTokens||0]}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`strong`,{children:(e.totalTokens||0).toLocaleString()})}),(0,o.jsx)(`td`,{children:(0,o.jsxs)(`span`,{className:`status-pill ${e.statusCode<400?`ok`:`err`}`,children:[`HTTP `,e.statusCode]})}),(0,o.jsxs)(`td`,{children:[e.latencyMs,` ms`]})]},e.id))})]})})]})]}),c===`docs`&&(0,o.jsxs)(`div`,{className:`docs-page`,children:[(0,o.jsxs)(`div`,{className:`docs-header`,children:[(0,o.jsx)(`h2`,{children:`Dokumentasi Lengkap DeeperNova API`}),(0,o.jsx)(`p`,{children:`Pilih platform API yang ingin Anda integrasikan dengan panduan langkah demi langkah.`}),(0,o.jsxs)(`div`,{className:`docs-platform-selector`,children:[(0,o.jsx)(`button`,{className:`docs-platform-btn ${w===`ai`?`active`:``}`,onClick:()=>T(`ai`),children:`🌟 DeeperNova Gold 1.5 AI API`}),(0,o.jsx)(`button`,{className:`docs-platform-btn ${w===`search`?`active`:``}`,onClick:()=>T(`search`),children:`🔍 DeeperNova Search Engine API`})]})]}),w===`ai`&&(0,o.jsxs)(`div`,{className:`docs-content-wrapper`,children:[(0,o.jsxs)(`div`,{className:`docs-subnav`,children:[(0,o.jsx)(`button`,{className:`docs-subnav-btn ${E===`getting-started`?`active`:``}`,onClick:()=>D(`getting-started`),children:`Quickstart`}),(0,o.jsx)(`button`,{className:`docs-subnav-btn ${E===`chat`?`active`:``}`,onClick:()=>D(`chat`),children:`Chat Completions`}),(0,o.jsx)(`button`,{className:`docs-subnav-btn ${E===`models`?`active`:``}`,onClick:()=>D(`models`),children:`Model AI`}),(0,o.jsx)(`button`,{className:`docs-subnav-btn ${E===`balance`?`active`:``}`,onClick:()=>D(`balance`),children:`Cek Kuota & Saldo`})]}),(0,o.jsxs)(`div`,{className:`docs-body`,children:[E===`getting-started`&&(0,o.jsxs)(`section`,{className:`docs-section`,children:[(0,o.jsx)(`h3`,{children:`1. Memulai Integrasi DeeperNova Gold 1.5`}),(0,o.jsxs)(`p`,{children:[`DeeperNova Gold 1.5 menggunakan arsitektur `,(0,o.jsx)(`strong`,{children:`Direct Cloudflare REST API`}),`. Anda dapat langsung menembak endpoint resmi dari backend, aplikasi web, bot, atau script tanpa perlu menginstal library OpenAI pihak ketiga.`]}),(0,o.jsxs)(`div`,{className:`base-url-card`,children:[(0,o.jsx)(`span`,{className:`base-url-label`,children:`Endpoint Base URL Resmi (Cloudflare):`}),(0,o.jsxs)(`code`,{className:`base-url-val`,children:[X,`/v1`]}),(0,o.jsx)(`button`,{className:`btn-copy-small`,onClick:()=>Q(`${X}/v1`,`base-url-ai`),children:S===`base-url-ai`?`✓ Tersalin`:`Copy`})]}),(0,o.jsxs)(`div`,{className:`lang-selector-row`,children:[(0,o.jsx)(`button`,{className:`lang-btn ${O===`javascript`?`active`:``}`,onClick:()=>k(`javascript`),children:`JavaScript (Fetch)`}),(0,o.jsx)(`button`,{className:`lang-btn ${O===`python`?`active`:``}`,onClick:()=>k(`python`),children:`Python (Requests)`}),(0,o.jsx)(`button`,{className:`lang-btn ${O===`curl`?`active`:``}`,onClick:()=>k(`curl`),children:`cURL`})]}),(0,o.jsxs)(`div`,{className:`code-display-box`,children:[O===`javascript`&&(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`// Panggil langsung via Fetch API (Native Node.js / Browser)
const response = await fetch("${X}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY"
  },
  body: JSON.stringify({
    model: "deepernova-gold-1.5",
    messages: [
      { role: "system", content: "Kamu adalah asisten cerdas DeeperNova." },
      { role: "user", content: "Halo DeeperNova Gold 1.5!" }
    ],
    temperature: 0.7
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`})}),O===`python`&&(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`# Panggil langsung via requests (Python)
import os
import requests

url = "${X}/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {os.environ.get('DEEPERNOVA_API_KEY', 'YOUR_DEEPERNOVA_API_KEY')}"
}
payload = {
    "model": "deepernova-gold-1.5",
    "messages": [
        {"role": "system", "content": "Kamu adalah asisten cerdas DeeperNova."},
        {"role": "user", "content": "Halo DeeperNova Gold 1.5!"}
    ],
    "temperature": 0.7
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(data["choices"][0]["message"]["content"])`})}),O===`curl`&&(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`curl -X POST "${X}/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepernova-gold-1.5",
    "messages": [
      {"role": "user", "content": "Halo DeeperNova Gold 1.5!"}
    ]
  }'`})})]})]}),E===`chat`&&(0,o.jsxs)(`section`,{className:`docs-section`,children:[(0,o.jsxs)(`h3`,{children:[`2. Endpoint Chat Completions (`,(0,o.jsx)(`code`,{children:`POST /v1/chat/completions`}),`)`]}),(0,o.jsx)(`p`,{children:`Mendukung percakapan teks, streaming real-time (SSE), serta parameter standar industri.`}),(0,o.jsxs)(`div`,{className:`param-table-card`,children:[(0,o.jsx)(`h4`,{children:`Parameter Request:`}),(0,o.jsx)(`div`,{className:`table-responsive`,children:(0,o.jsxs)(`table`,{className:`param-table`,children:[(0,o.jsx)(`thead`,{children:(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`th`,{children:`Parameter`}),(0,o.jsx)(`th`,{children:`Tipe`}),(0,o.jsx)(`th`,{children:`Deskripsi`})]})}),(0,o.jsxs)(`tbody`,{children:[(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{children:(0,o.jsx)(`code`,{children:`model`})}),(0,o.jsx)(`td`,{children:`string`}),(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`deepernova-silicon-1.4`}),`, `,(0,o.jsx)(`code`,{children:`deepernova-gold-1.5`}),` atau `,(0,o.jsx)(`code`,{children:`deepernova-gold-1.5-pro`})]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{children:(0,o.jsx)(`code`,{children:`messages`})}),(0,o.jsx)(`td`,{children:`array`}),(0,o.jsx)(`td`,{children:`Daftar pesan role ('system', 'user', 'assistant')`})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{children:(0,o.jsx)(`code`,{children:`stream`})}),(0,o.jsx)(`td`,{children:`boolean`}),(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`true`}),` untuk Server-Sent Events (SSE) streaming`]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{children:(0,o.jsx)(`code`,{children:`temperature`})}),(0,o.jsx)(`td`,{children:`number`}),(0,o.jsx)(`td`,{children:`Tingkat kreativitas (0.0 - 1.0, default 0.7)`})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{children:(0,o.jsx)(`code`,{children:`max_tokens`})}),(0,o.jsx)(`td`,{children:`integer`}),(0,o.jsx)(`td`,{children:`Maksimal token balasan (default 2048)`})]})]})]})})]})]}),E===`models`&&(0,o.jsxs)(`section`,{className:`docs-section`,children:[(0,o.jsx)(`h3`,{children:`3. Model DeeperNova Cloud AI yang Tersedia`}),(0,o.jsxs)(`div`,{className:`models-catalog-grid`,children:[(0,o.jsxs)(`div`,{className:`model-catalog-card`,children:[(0,o.jsx)(`span`,{className:`catalog-badge silicon`,style:{background:`linear-gradient(135deg, #06b6d4, #0284c7)`},children:`SILICON 1.4`}),(0,o.jsx)(`h4`,{children:`deepernova-silicon-1.4`}),(0,o.jsx)(`p`,{children:`Model generasi baru super cepat dengan penalaran multimodal vision dan latensi respons ultra instan.`}),(0,o.jsxs)(`div`,{className:`catalog-specs`,children:[(0,o.jsx)(`span`,{children:`Konteks: 128.000 Token`}),(0,o.jsx)(`span`,{children:`Vision: Aktif`}),(0,o.jsx)(`span`,{children:`Biaya: Kuota Gratis 1M`})]})]}),(0,o.jsxs)(`div`,{className:`model-catalog-card`,children:[(0,o.jsx)(`span`,{className:`catalog-badge`,children:`FLAGSHIP`}),(0,o.jsx)(`h4`,{children:`deepernova-gold-1.5`}),(0,o.jsx)(`p`,{children:`Model multimodal vision & ultra-fast reasoning berkecepatan tinggi dengan konteks 128K. Ideal untuk percakapan, analisis dokumen, dan tugas umum.`}),(0,o.jsxs)(`div`,{className:`catalog-specs`,children:[(0,o.jsx)(`span`,{children:`Konteks: 128.000 Token`}),(0,o.jsx)(`span`,{children:`Vision: Aktif`}),(0,o.jsx)(`span`,{children:`Biaya: Kuota Gratis 1M`})]})]}),(0,o.jsxs)(`div`,{className:`model-catalog-card`,children:[(0,o.jsx)(`span`,{className:`catalog-badge pro`,children:`REASONING & CODE`}),(0,o.jsx)(`h4`,{children:`deepernova-gold-1.5-pro`}),(0,o.jsx)(`p`,{children:`Model 70B parameter dengan penalaran matematis mendalam, arsitektur coding kompleks, dan analisis logika tingkat tinggi.`}),(0,o.jsxs)(`div`,{className:`catalog-specs`,children:[(0,o.jsx)(`span`,{children:`Konteks: 128.000 Token`}),(0,o.jsx)(`span`,{children:`Coding: Ahli`}),(0,o.jsx)(`span`,{children:`Biaya: Kuota Gratis 1M`})]})]})]})]}),E===`balance`&&(0,o.jsxs)(`section`,{className:`docs-section`,children:[(0,o.jsxs)(`h3`,{children:[`4. Endpoint Cek Saldo Token (`,(0,o.jsx)(`code`,{children:`GET /v1/balance`}),`)`]}),(0,o.jsx)(`p`,{children:`Gunakan endpoint ini untuk memantau sisa token akun Anda dari dalam aplikasi Anda secara terprogram.`}),(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`curl -X GET "${Y}/v1/balance" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"`})}),(0,o.jsx)(`h4`,{children:`Contoh Respons:`}),(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`{
  "success": true,
  "token_quota": 1000000,
  "tokens_used": 1420,
  "remaining_tokens": 998580
}`})})]})]})]}),w===`search`&&(0,o.jsx)(`div`,{className:`docs-content-wrapper`,children:(0,o.jsx)(`div`,{className:`docs-body`,style:{width:`100%`},children:(0,o.jsxs)(`section`,{className:`docs-section`,children:[(0,o.jsx)(`div`,{className:`search-docs-badge`,children:`SUB-20MS ULTRA-FAST WEB SEARCH • PUBLIC & ENTERPRISE SERP`}),(0,o.jsx)(`h3`,{children:`DeeperNova Search Engine API (Mandiri & Terdistribusi)`}),(0,o.jsxs)(`p`,{children:[`Akses indeks web mandiri DeeperNova dengan pencarian berbasis algoritma `,(0,o.jsx)(`strong`,{children:`BM25 & PageRank`}),`, latensi sub-20ms, dan ringkasan `,(0,o.jsx)(`strong`,{children:`AI Context`}),` yang siap diintegrasikan ke sistem `,(0,o.jsx)(`strong`,{children:`RAG (Retrieval-Augmented Generation)`}),`, agen AI otonom, peramban web, atau bot.`]}),(0,o.jsxs)(`div`,{className:`cors-banner-box`,children:[(0,o.jsx)(`span`,{className:`cors-banner-icon`,children:`🟢`}),(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`strong`,{children:`Dukungan Frontend CORS 100% Aktif & Akses Bebas Tanpa API Key:`}),(0,o.jsxs)(`p`,{style:{margin:`4px 0 0`,fontSize:`13px`},children:[`Anda dapat langsung memanggil API ini dari peramban web mana saja (React, Next.js, Vue, Svelte, vanilla JS, skrip HTML) tanpa terhalang error CORS dan tanpa perlu backend proxy! Anda bisa menggunakannya `,(0,o.jsx)(`strong`,{children:`secara bebas tanpa API Key`}),` (Anonymous Free Access) atau menyertakan API Key untuk prioritas antrean QoS Governor.`]})]})]}),(0,o.jsx)(`div`,{className:`base-url-card`,children:(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`span`,{className:`base-url-label`,children:`Endpoint Base URL Resmi (Cloudflare & Server):`}),(0,o.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`8px`,marginTop:`4px`},children:[(0,o.jsxs)(`code`,{className:`base-url-val`,children:[X,`/api/v1`]}),(0,o.jsx)(`button`,{className:`btn-copy-small`,onClick:()=>Q(`${X}/api/v1`,`base-url-search`),children:S===`base-url-search`?`✓ Tersalin`:`Copy`})]})]})}),(0,o.jsxs)(`div`,{style:{margin:`22px 0 10px`},children:[(0,o.jsx)(`span`,{style:{fontSize:`12.5px`,fontWeight:800,color:`var(--text-title)`,display:`block`,marginBottom:`8px`},children:`Pilih Mode Autentikasi Contoh Kode:`}),(0,o.jsxs)(`div`,{className:`search-auth-switcher`,children:[(0,o.jsx)(`button`,{className:`search-auth-btn ${M===`no-key`?`active`:``}`,onClick:()=>ae(`no-key`),children:`🟢 Mode Bebas (Tanpa API Key - Anonymous)`}),(0,o.jsx)(`button`,{className:`search-auth-btn with-key ${M===`with-key`?`active with-key`:``}`,onClick:()=>ae(`with-key`),children:`🔑 Mode API Key (Dedicated Developer Key)`})]}),(0,o.jsx)(`p`,{style:{fontSize:`12px`,color:`var(--text-muted)`,margin:`4px 0 14px`},children:M===`no-key`?`⚡ Mode Bebas: Panggil endpoint langsung tanpa header Authorization atau query key. Otomatis dilayani sebagai Anonymous Free User.`:`🚀 Mode API Key: Gunakan header Authorization: Bearer <KEY> atau demo key 'dn_live_free_public_demo' untuk alokasi bandwidth prioritas QoS.`})]}),(0,o.jsx)(`h4`,{children:`Referensi Endpoint DeeperNova Search API:`}),(0,o.jsx)(`div`,{className:`table-responsive`,children:(0,o.jsxs)(`table`,{className:`param-table`,children:[(0,o.jsx)(`thead`,{children:(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`th`,{children:`Endpoint & Metode`}),(0,o.jsx)(`th`,{children:`Autentikasi`}),(0,o.jsx)(`th`,{children:`Deskripsi Fungsi`}),(0,o.jsx)(`th`,{children:`Parameter Utama`})]})}),(0,o.jsxs)(`tbody`,{children:[(0,o.jsxs)(`tr`,{children:[(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`/api/v1/search`}),(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`search-method-badge`,children:`GET / POST`})]}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`span`,{className:`auth-badge-free`,children:`Bebas (Tanpa Key)`})}),(0,o.jsx)(`td`,{children:`Pencarian web berkecepatan tinggi dengan BM25, PageRank, dan ringkasan context AI RAG.`}),(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`q`}),` (wajib), `,(0,o.jsx)(`code`,{children:`limit`}),` (1-50), `,(0,o.jsx)(`code`,{children:`page`}),`, `,(0,o.jsx)(`code`,{children:`timeFilter`}),` ('all','24h','7d')`]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`/api/v1/news`}),(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`search-method-badge`,children:`GET`})]}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`span`,{className:`auth-badge-free`,children:`Bebas (Tanpa Key)`})}),(0,o.jsx)(`td`,{children:`Pencarian berita terkini langsung dari 50+ media nasional terpercaya & RSS feeds real-time.`}),(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`q`}),`, `,(0,o.jsx)(`code`,{children:`limit`}),` (1-50), `,(0,o.jsx)(`code`,{children:`sort`}),` ('latest' | 'relevance')`]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`/api/v1/images`}),(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`search-method-badge`,children:`GET`})]}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`span`,{className:`auth-badge-free`,children:`Bebas (Tanpa Key)`})}),(0,o.jsx)(`td`,{children:`Pencarian gambar, ilustrasi, media visual, dan logo website terindeks.`}),(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`q`}),` (wajib), `,(0,o.jsx)(`code`,{children:`limit`}),` (1-50), `,(0,o.jsx)(`code`,{children:`page`})]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`/api/v1/health`}),(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`search-method-badge`,children:`GET`})]}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`span`,{className:`auth-badge-free`,children:`Bebas (Tanpa Key)`})}),(0,o.jsx)(`td`,{children:`Cek status operasional node pencari, antrean crawler, metrik indeks, dan QoS Governor.`}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`em`,{children:`Tidak memerlukan parameter`})})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`/api/v1/suggest`}),(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`search-method-badge`,children:`GET`})]}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`span`,{className:`auth-badge-free`,children:`Bebas (Tanpa Key)`})}),(0,o.jsx)(`td`,{children:`Autocomplete & saran pelengkap frasa kueri pencarian sub-10ms.`}),(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`q`}),` (kata kunci pencarian)`]})]}),(0,o.jsxs)(`tr`,{children:[(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`/api/v1/search-fast`}),(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`search-method-badge`,children:`GET`})]}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`span`,{className:`auth-badge-free`,children:`Bebas (Tanpa Key)`})}),(0,o.jsx)(`td`,{children:`Pencarian instan sub-10ms indeks lokal SQLite database.`}),(0,o.jsxs)(`td`,{children:[(0,o.jsx)(`code`,{children:`q`}),` (kata kunci), `,(0,o.jsx)(`code`,{children:`limit`}),` (1-50)`]})]})]})]})}),(0,o.jsx)(`h4`,{style:{marginTop:`24px`},children:`Contoh Implementasi Kode:`}),(0,o.jsxs)(`div`,{className:`lang-selector-row`,children:[(0,o.jsx)(`button`,{className:`lang-btn ${A===`javascript`?`active`:``}`,onClick:()=>j(`javascript`),children:`🌐 JavaScript (Browser Fetch)`}),(0,o.jsx)(`button`,{className:`lang-btn ${A===`react`?`active`:``}`,onClick:()=>j(`react`),children:`⚛️ React / Next.js`}),(0,o.jsx)(`button`,{className:`lang-btn ${A===`html`?`active`:``}`,onClick:()=>j(`html`),children:`📄 HTML Standalone Widget`}),(0,o.jsx)(`button`,{className:`lang-btn ${A===`python`?`active`:``}`,onClick:()=>j(`python`),children:`🐍 Python (Requests & RAG)`}),(0,o.jsx)(`button`,{className:`lang-btn ${A===`curl`?`active`:``}`,onClick:()=>j(`curl`),children:`💻 cURL (Terminal)`})]}),(0,o.jsxs)(`div`,{className:`code-display-box`,children:[A===`javascript`&&(M===`no-key`?(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`// 🌐 Pencarian Web Bebas Tanpa API Key (100% Dukungan CORS dari Browser)
async function searchWeb(query) {
  const url = "${X}/api/v1/search?q=" + encodeURIComponent(query) + "&limit=5";

  // Panggil langsung dari peramban web (React, Vue, Vanilla JS) tanpa perlu backend proxy
  const response = await fetch(url);
  const data = await response.json();

  console.log("⚡ Status:", data.status, "| Latensi:", data.duration_ms + "ms");
  console.log("Total Hasil:", data.total_results);

  (data.results || []).forEach((res, i) => {
    console.log(\`[\${i + 1}] \${res.title} (\${res.url})\`);
    console.log(\`    \${res.snippet}\\n\`);
  });

  return data;
}

// Uji coba pencarian langsung:
searchWeb("indonesia");`})}):(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`// 🔑 Pencarian Web dengan API Key (Prioritas QoS Governor)
async function searchWeb(query) {
  const url = "${X}/api/v1/search?q=" + encodeURIComponent(query) + "&limit=5";

  const response = await fetch(url, {
    headers: {
      "Authorization": "Bearer YOUR_DEEPERNOVA_API_KEY",
      "X-API-Key": "YOUR_DEEPERNOVA_API_KEY" // atau gunakan demo key: dn_live_free_public_demo
    }
  });

  const data = await response.json();
  console.log("⚡ Selesai dalam", data.duration_ms, "ms (Total:", data.total_results, "hasil)");
  return data.results;
}

searchWeb("indonesia");`})})),A===`react`&&(M===`no-key`?(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`// ⚛️ React / Next.js Component: Client-Side Web Search (Bebas Tanpa API Key)
import React, { useState } from 'react';

const SEARCH_ENDPOINT = "${X}/api/v1/search";

export default function DeeperNovaSearchWidget() {
  const [query, setQuery] = useState('teknologi ai');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Direct browser fetch tanpa API Key & bebas CORS!
      const res = await fetch(\`\${SEARCH_ENDPOINT}?q=\${encodeURIComponent(query)}&limit=5\`);
      const data = await res.json();
      setResults(data.results || []);
      setLatency(data.duration_ms);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '20px auto', fontFamily: 'sans-serif' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari web..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 }}>
          {loading ? 'Mencari...' : 'Cari'}
        </button>
      </form>

      {latency != null && <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>⚡ Latensi: <strong>{latency} ms</strong></p>}

      <div style={{ marginTop: 16 }}>
        {results.map((r, i) => (
          <div key={i} style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>{r.domain}</span>
            <h4 style={{ margin: '4px 0' }}><a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#0f172a' }}>{r.title}</a></h4>
            <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>{r.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}`})}):(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`// ⚛️ React / Next.js Component: Client-Side Web Search (Dengan API Key)
import React, { useState } from 'react';

const SEARCH_ENDPOINT = "${X}/api/v1/search";
const API_KEY = "YOUR_DEEPERNOVA_API_KEY"; // atau gunakan "dn_live_free_public_demo"

export default function DeeperNovaSearchWidget() {
  const [query, setQuery] = useState('teknologi ai');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(\`\${SEARCH_ENDPOINT}?q=\${encodeURIComponent(query)}&limit=5\`, {
        headers: { "Authorization": \`Bearer \${API_KEY}\` }
      });
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '20px auto' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari..." style={{ flex: 1, padding: 10, borderRadius: 8 }} />
        <button type="submit" disabled={loading} style={{ background: '#059669', color: '#fff', padding: '10px 18px', border: 'none', borderRadius: 8 }}>Cari</button>
      </form>
    </div>
  );
}`})})),A===`html`&&(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`<!-- 📄 Simpan sebagai 'search.html' dan buka langsung di Browser (Chrome / Edge / Firefox) -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DeeperNova Live Search Widget</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 680px; margin: 2.5rem auto; padding: 0 1rem; color: #0f172a; }
    .box { display: flex; gap: 8px; margin-bottom: 12px; }
    input { flex: 1; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; outline: none; }
    button { background: #059669; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; }
    .stat { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 10px; }
    .card a { color: #059669; text-decoration: none; font-size: 17px; font-weight: bold; }
  </style>
</head>
<body>
  <h2>DeeperNova Search (Frontend Standalone Demo)</h2>
  <div class="box">
    <input type="text" id="qInput" value="indonesia" placeholder="Ketik kata kunci..." />
    <button onclick="cari()">Cari Web</button>
  </div>
  <div id="stat" class="stat">Siap melakukan pencarian...</div>
  <div id="results"></div>

  <script>
    async function cari() {
      const q = document.getElementById('qInput').value;
      const stat = document.getElementById('stat');
      const list = document.getElementById('results');
      stat.innerText = '⚡ Mengambil hasil pencarian...';
      list.innerHTML = '';

      try {
        // Panggilan langsung tanpa API Key & 100% bebas CORS:
        const response = await fetch(\`${X}/api/v1/search?q=\${encodeURIComponent(q)}&limit=5\`${M===`with-key`?`, { headers: { 'Authorization': 'Bearer YOUR_DEEPERNOVA_API_KEY' } }`:``});
        const data = await response.json();
        stat.innerHTML = \`⚡ Selesai dalam <strong>\${data.duration_ms}ms</strong> (Total: \${data.total_results} hasil)\`;

        (data.results || []).forEach(r => {
          const div = document.createElement('div');
          div.className = 'card';
          div.innerHTML = \`
            <small style="color:#059669; font-weight:bold;">\${r.domain}</small>
            <div><a href="\${r.url}" target="_blank">\${r.title}</a></div>
            <p style="margin:4px 0 0; color:#475569; font-size:14px;">\${r.snippet}</p>
          \`;
          list.appendChild(div);
        });
      } catch (err) {
        stat.innerText = 'Error: ' + err.message;
      }
    }
    cari();
  <\/script>
</body>
</html>`})}),A===`python`&&(M===`no-key`?(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`import requests

# 🐍 Panggilan Search Engine DeeperNova Bebas Tanpa API Key
url = "${X}/api/v1/search"
params = {
    "q": "perkembangan ai indonesia",
    "limit": 5
}

response = requests.get(url, params=params)
data = response.json()

print(f"⚡ Status: {data.get('status')} | Latensi: {data.get('duration_ms')}ms")
print(f"Total Ditemukan: {data.get('total_results')} hasil\\n")

for idx, item in enumerate(data.get("results", []), 1):
    print(f"[{idx}] {item.get('title')}")
    print(f"    URL: {item.get('url')}")
    print(f"    Snippet: {item.get('snippet')[:120]}...\\n")

# ai_context siap langsung dimasukkan ke prompt LLM / sistem RAG:
if "ai_context" in data:
    print("--- CONTEXT RAG SIAP PAKAI ---")
    print(data["ai_context"])`})}):(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`import requests

# 🔑 Panggilan Search Engine DeeperNova dengan API Key
API_KEY = "YOUR_DEEPERNOVA_API_KEY"
url = "${X}/api/v1/search"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "X-API-Key": API_KEY # atau gunakan "dn_live_free_public_demo"
}
params = {
    "q": "perkembangan ai indonesia",
    "limit": 5
}

response = requests.get(url, headers=headers, params=params)
data = response.json()

print(f"⚡ Status: {data.get('status')} | Latensi: {data.get('duration_ms')}ms")
for item in data.get("results", []):
    print(f"• {item.get('title')} -> {item.get('url')}")`})})),A===`curl`&&(M===`no-key`?(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`# 1. Web Search Organik (Tanpa API Key - Anonymous Free Access)
curl -X GET "${X}/api/v1/search?q=indonesia&limit=5"

# 2. Berita Nasional Terkini (Tanpa API Key)
curl -X GET "${X}/api/v1/news?q=teknologi+ai&limit=5"

# 3. Pencarian Gambar & Visual Media (Tanpa API Key)
curl -X GET "${X}/api/v1/images?q=ai+indonesia&limit=8"

# 4. Cek Status Kesehatan Mesin & QoS Governor
curl -X GET "${X}/api/v1/health"

# 5. POST Request Body (Tanpa API Key)
curl -X POST "${X}/api/v1/search" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "mobil listrik indonesia", "limit": 5}'`})}):(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`# 1. Web Search dengan Dedicated API Key (Prioritas QoS Governor)
curl -X GET "${X}/api/v1/search?q=indonesia&limit=5" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"

# 2. Atau menggunakan Demo Key Bawaan:
curl -X GET "${X}/api/v1/search?q=indonesia&limit=5" \\
  -H "X-API-Key: dn_live_free_public_demo"

# 3. Pencarian Berita Nasional Terkini
curl -X GET "${X}/api/v1/news?q=teknologi+ai&limit=5" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"

# 4. Pencarian Gambar
curl -X GET "${X}/api/v1/images?q=ai+indonesia&limit=8" \\
  -H "Authorization: Bearer YOUR_DEEPERNOVA_API_KEY"`})}))]}),(0,o.jsx)(`h4`,{children:`Contoh Format Respons JSON Realistis (/api/v1/search):`}),(0,o.jsx)(`pre`,{children:(0,o.jsx)(`code`,{children:`{
  "status": "success",
  "query": "indonesia",
  "duration_ms": 14.8,
  "total_results": 142,
  "results": [
    {
      "title": "Portal Informasi Indonesia - Berita & Layanan Publik",
      "url": "https://indonesia.go.id",
      "domain": "indonesia.go.id",
      "snippet": "Portal resmi informasi pemerintah Republik Indonesia. Berita terkini, regulasi, pariwisata, dan layanan digital nasional.",
      "score": 98.4,
      "crawled_at": "2026-10-11T12:00:00Z"
    },
    {
      "title": "Kementerian Komunikasi dan Digital RI",
      "url": "https://komdigi.go.id",
      "domain": "komdigi.go.id",
      "snippet": "Perkembangan ekosistem teknologi informasi, kecerdasan buatan, dan kedaulatan data digital nasional Indonesia.",
      "score": 95.1
    }
  ],
  "ai_context": "Indonesia adalah negara kepulauan yang sedang mengakselerasi transformasi digital dan adopsi kecerdasan buatan nasional...",
  "auth_mode": "${M===`no-key`?`Anonymous Free User (Tanpa API Key)`:`Dedicated Developer Key`}"
}`})})]})})})]}),c===`dashboard`&&(0,o.jsxs)(`div`,{className:`dashboard-page`,children:[(0,o.jsxs)(`div`,{className:`dashboard-hero`,children:[(0,o.jsxs)(`div`,{className:`dashboard-hero-copy`,children:[(0,o.jsx)(`span`,{className:`eyebrow`,children:`DeeperNova Developer Console`}),(0,o.jsx)(`h2`,{children:`Dashboard & Live API Management`}),(0,o.jsx)(`p`,{children:`Kelola API Key, pantau saldo 1.000.000 token gratis, dan uji coba langsung respons API secara live.`})]}),(0,o.jsxs)(`div`,{className:`dashboard-hero-actions`,children:[(0,o.jsx)(`button`,{className:`btn-primary`,onClick:()=>y(!0),disabled:m,children:`+ Buat API Key Baru`}),(0,o.jsx)(`button`,{className:`btn-secondary`,onClick:Z,disabled:m,children:`🔄 Refresh Saldo`})]})]}),(0,o.jsxs)(`div`,{className:`live-tester-card`,children:[(0,o.jsxs)(`div`,{className:`live-tester-header`,children:[(0,o.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`8px`},children:[(0,o.jsx)(`span`,{className:`pulse-dot`}),(0,o.jsx)(`h3`,{children:`Live Interactive API Hit Tester`})]}),(0,o.jsx)(`span`,{className:`live-tester-badge`,children:`Hit API Nyata`})]}),(0,o.jsx)(`p`,{className:`live-tester-subtitle`,children:`Uji coba panggilan API secara langsung ke endpoint backend DeeperNova tanpa perlu membuka Postman atau terminal.`}),(0,o.jsxs)(`div`,{className:`tester-form-row`,children:[(0,o.jsxs)(`div`,{className:`form-group flex-1`,children:[(0,o.jsx)(`label`,{htmlFor:`test-key-select`,children:`Pilih Kunci API:`}),(0,o.jsx)(`select`,{id:`test-key-select`,value:U,onChange:e=>ce(e.target.value),className:`form-select`,children:u.length===0?(0,o.jsx)(`option`,{value:``,children:`Belum ada kunci API`}):u.map(e=>(0,o.jsxs)(`option`,{value:e.id,children:[e.name,` (`,e.key,`) `,e.isActive?`• Aktif`:`• Nonaktif`]},e.id))})]}),(0,o.jsxs)(`div`,{className:`form-group flex-1`,children:[(0,o.jsx)(`label`,{htmlFor:`test-model-select`,children:`Pilih Model:`}),(0,o.jsxs)(`select`,{id:`test-model-select`,value:W,onChange:e=>le(e.target.value),className:`form-select`,children:[(0,o.jsx)(`option`,{value:`deepernova-silicon-1.4`,children:`⚡ DeeperNova Silicon 1.4 (Ultra Fast & Vision)`}),(0,o.jsx)(`option`,{value:`deepernova-gold-1.5`,children:`🌟 DeeperNova Gold 1.5 (Flagship Fast & Vision)`}),(0,o.jsx)(`option`,{value:`deepernova-gold-1.5-pro`,children:`🧠 DeeperNova Gold 1.5 Pro (Deep Reasoning 70B & Code)`})]})]})]}),(0,o.jsxs)(`div`,{className:`form-group`,style:{marginBottom:`16px`},children:[(0,o.jsx)(`label`,{htmlFor:`test-prompt-input`,children:`Prompt Uji Coba:`}),(0,o.jsx)(`textarea`,{id:`test-prompt-input`,value:G,onChange:e=>ue(e.target.value),rows:2,className:`form-textarea`,placeholder:`Tulis prompt untuk uji coba API...`,spellCheck:`false`})]}),(0,o.jsxs)(`div`,{className:`tester-action-row`,children:[(0,o.jsx)(`button`,{onClick:Ee,disabled:de||!U,className:`btn-hit-test`,children:de?`⏳ Sedang Menghubungi API...`:`🚀 Hit API Sekarang (Kirim Request Nyata)`}),(0,o.jsx)(`span`,{className:`tester-note`,children:`Setiap hit memotong token dari kuota 1.000.000 gratis Anda dan langsung dicatat ke server database.`})]}),K&&(0,o.jsxs)(`div`,{className:`test-result-box ${K.success?`success`:`error`}`,children:[(0,o.jsxs)(`div`,{className:`test-result-meta-row`,children:[(0,o.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`8px`},children:[(0,o.jsxs)(`span`,{className:`status-pill ${K.success?`ok`:`err`}`,children:[`HTTP `,K.status]}),(0,o.jsxs)(`span`,{children:[`Latensi: `,(0,o.jsxs)(`strong`,{children:[K.latencyMs,` ms`]})]}),K.success&&(0,o.jsxs)(`span`,{children:[`Model: `,(0,o.jsx)(`strong`,{children:K.model})]})]}),K.success&&(0,o.jsxs)(`div`,{className:`tokens-consumed-label`,children:[`🔥 Terpakai: `,K.tokensConsumed,` Token (Sisa: `,K.remainingTokens.toLocaleString(),`)`]})]}),K.success?(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`result-label`,children:`RESPONS DARI DEEPERNOVA GOLD 1.5:`}),(0,o.jsx)(`div`,{className:`result-content-body`,children:K.reply}),(0,o.jsxs)(`div`,{className:`result-tokens-breakdown`,children:[(0,o.jsxs)(`span`,{children:[`Input: `,(0,o.jsx)(`strong`,{children:K.promptTokens}),` token`]}),(0,o.jsxs)(`span`,{children:[`Output: `,(0,o.jsx)(`strong`,{children:K.completionTokens}),` token`]}),(0,o.jsxs)(`span`,{children:[`Total: `,(0,o.jsx)(`strong`,{children:K.tokensConsumed}),` token`]})]})]}):(0,o.jsxs)(`div`,{className:`result-error-msg`,children:[(0,o.jsx)(`strong`,{children:`Gagal:`}),` `,K.error]})]})]}),(0,o.jsxs)(`div`,{className:`keys-section-card`,children:[(0,o.jsxs)(`div`,{className:`section-header`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`h3`,{children:`Daftar API Keys Anda`}),(0,o.jsxs)(`p`,{className:`section-subtitle`,children:[`Gunakan kunci ini pada header `,(0,o.jsx)(`code`,{children:`Authorization: Bearer <KEY>`}),` di aplikasi Anda.`]})]}),(0,o.jsx)(`button`,{className:`btn-primary`,onClick:()=>y(!0),disabled:m,children:`+ Buat Kunci Baru`})]}),m?(0,o.jsx)(`p`,{children:`Memuat data API Keys...`}):u.length===0?(0,o.jsxs)(`div`,{className:`empty-state-card`,children:[(0,o.jsx)(`h4`,{children:`Belum ada API Key`}),(0,o.jsx)(`p`,{children:`Klik tombol di bawah untuk membuat kunci pertama Anda dan mulai menggunakan DeeperNova Gold 1.5.`}),(0,o.jsx)(`button`,{className:`btn-primary`,onClick:()=>y(!0),children:`Buat Kunci Sekarang`})]}):(0,o.jsx)(`div`,{className:`table-responsive`,children:(0,o.jsxs)(`table`,{className:`api-keys-table`,children:[(0,o.jsx)(`thead`,{children:(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`th`,{children:`Nama Kunci`}),(0,o.jsx)(`th`,{children:`Secret Key`}),(0,o.jsx)(`th`,{children:`Token Terpakai`}),(0,o.jsx)(`th`,{children:`Status`}),(0,o.jsx)(`th`,{children:`Aksi`})]})}),(0,o.jsx)(`tbody`,{children:u.map(e=>(0,o.jsxs)(`tr`,{children:[(0,o.jsx)(`td`,{children:(0,o.jsx)(`strong`,{children:e.name})}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`code`,{className:`masked-key`,children:e.key})}),(0,o.jsxs)(`td`,{children:[(e.tokensUsed||0).toLocaleString(),` token`]}),(0,o.jsx)(`td`,{children:(0,o.jsx)(`span`,{className:`status-badge ${e.isActive?`active`:`inactive`}`,children:e.isActive?`Aktif`:`Nonaktif`})}),(0,o.jsxs)(`td`,{className:`key-actions-cell`,children:[(0,o.jsx)(`button`,{className:`btn-action-copy`,onClick:()=>Ce(e.id),title:`Salin Secret Key Lengkap`,children:S===`key-${e.id}`?`✓ Tersalin!`:`Copy`}),(0,o.jsx)(`button`,{className:`btn-action-view`,onClick:()=>Se(e.id),children:`Lihat`}),(0,o.jsx)(`button`,{className:`btn-action-toggle`,onClick:()=>we(e.id,{isActive:!e.isActive}),children:e.isActive?`Nonaktifkan`:`Aktifkan`}),(0,o.jsx)(`button`,{className:`btn-action-delete`,onClick:()=>Te(e.id),children:`Hapus`})]})]},e.id))})]})})]})]})]}),v&&(0,o.jsx)(`div`,{className:`modal-overlay`,onClick:()=>y(!1),children:(0,o.jsxs)(`div`,{className:`modal-content`,onClick:e=>e.stopPropagation(),children:[(0,o.jsx)(`h3`,{children:`Buat API Key Baru`}),(0,o.jsx)(`p`,{className:`modal-sub`,children:`Beri nama label yang mudah diingat untuk proyek atau aplikasi Anda.`}),(0,o.jsxs)(`div`,{className:`form-group`,children:[(0,o.jsx)(`label`,{htmlFor:`key-name-modal`,children:`Nama Kunci (Label)`}),(0,o.jsx)(`input`,{id:`key-name-modal`,type:`text`,value:F,onChange:e=>I(e.target.value),placeholder:`Contoh: Aplikasi Mobile`,className:`form-input`,autoComplete:`off`,spellCheck:`false`,autoFocus:!0})]}),B&&(0,o.jsxs)(`div`,{className:`error-message`,children:[`⚠️ `,B]}),(0,o.jsxs)(`div`,{className:`modal-actions`,children:[(0,o.jsx)(`button`,{className:`btn-secondary`,onClick:()=>{y(!1),I(``),V(``)},children:`Batal`}),(0,o.jsx)(`button`,{className:`btn-primary`,onClick:xe,disabled:m||!F.trim(),children:m?`Membuat...`:`Buat API Key`})]})]})}),g&&R&&(0,o.jsx)(`div`,{className:`modal-overlay`,onClick:()=>_(!1),children:(0,o.jsxs)(`div`,{className:`modal-content`,onClick:e=>e.stopPropagation(),children:[(0,o.jsx)(`h3`,{children:`🎉 API Key Berhasil Dibuat!`}),(0,o.jsx)(`p`,{className:`modal-sub`,children:`Simpan kunci ini di tempat yang aman. Kunci ini terhubung dengan kuota 1.000.000 Token gratis Anda.`}),(0,o.jsxs)(`div`,{className:`modal-key-display`,children:[(0,o.jsx)(`code`,{children:R.key}),(0,o.jsx)(`button`,{onClick:()=>Q(R.key,`modal-key`),children:S===`modal-key`?`✓ Tersalin`:`Copy`})]}),(0,o.jsx)(`button`,{className:`btn-primary modal-btn`,onClick:()=>{_(!1),z(null),l(`dashboard`)},children:`Buka Dashboard`})]})}),b&&L&&(0,o.jsx)(`div`,{className:`modal-overlay`,onClick:()=>x(!1),children:(0,o.jsxs)(`div`,{className:`modal-content`,onClick:e=>e.stopPropagation(),children:[(0,o.jsx)(`h3`,{children:`Secret API Key Lengkap`}),(0,o.jsxs)(`div`,{className:`modal-key-display`,children:[(0,o.jsx)(`code`,{children:L}),(0,o.jsx)(`button`,{onClick:()=>Q(L,`full-key`),children:S===`full-key`?`✓ Tersalin`:`Copy`})]}),(0,o.jsx)(`p`,{style:{fontSize:`12px`,color:`#ef4444`,marginTop:`10px`},children:`⚠️ Jangan bagikan kunci rahasia ini ke publik atau simpan di repository terbuka.`}),(0,o.jsx)(`button`,{className:`btn-primary modal-btn`,onClick:()=>x(!1),children:`Tutup`})]})})]})};export{ee as default};