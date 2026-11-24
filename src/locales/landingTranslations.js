/**
 * Landing Page Translations Dictionary — Clean, Concise & Professional
 * Languages: Indonesian ('id'), English ('en'), Chinese ('zh')
 */

export const landingTranslations = {
  id: {
    nav: {
      products: 'Produk',
      features: 'Keunggulan',
      download: 'Aplikasi',
      api: 'API',
      faq: 'FAQ',
      help: 'Bantuan',
      login: 'Masuk',
      startChat: 'Mulai Chat',
      language: 'Bahasa'
    },
    hero: {
      badge: 'DeeperNova AI · Cloud & Peramban Agent',
      titleLead: 'Kecerdasan buatan yang ringkas,',
      titleAccent: 'otonom di server',
      titleTrail: 'dan aman untuk kerja nyata.',
      sub: 'Tanya, riset web dengan Peramban Agent, bangun kode di sandbox terisolasi, dan susun dokumen profesional dalam satu ruang kerja cepat tanpa gangguan.',
      primaryCta: 'Mulai Chat Baru',
      secondaryCta: 'Buka AI Agent',
      metrics: [
        { label: 'Eksekusi Server', value: '100% Jalan di Latar' },
        { label: 'Mode Riset', value: 'Peramban Agent Aktif' },
        { label: 'Keamanan', value: 'Proteksi Siber Berlapis' }
      ]
    },
    products: {
      eyebrow: 'Ekosistem',
      heading: 'Empat modul inti dalam satu platform',
      sub: 'Dirancang ringan, cepat dibuka, dan langsung fokus pada produktivitas.',
      chat: {
        tag: 'Utama',
        title: 'AI Chat & Peramban Agent',
        desc: 'Percakapan cerdas dengan penelusuran halaman web penuh, sitasi instan, dan proses server yang tetap berjalan walau Anda keluar aplikasi.',
        link: 'Mulai Percakapan'
      },
      agent: {
        tag: 'Sandbox',
        title: 'Autonomous Coding Agent',
        desc: 'Lingkungan eksekusi kode terisolasi untuk merancang, menguji, dan mempratinjau aplikasi web maupun skrip secara langsung.',
        link: 'Buka Workspace Agent'
      },
      docs: {
        tag: 'Office',
        title: 'Typernova Document Studio',
        desc: 'Susun dokumen Word (.docx), tabel Excel (.xlsx), dan materi presentasi PowerPoint (.pptx) secara rapi dan siap unduh.',
        link: 'Buka Document Studio'
      },
      api: {
        tag: 'Developer',
        title: 'Search & Developer API',
        desc: 'Integrasikan model penalaran DeeperNova dan mesin pencari real-time ke dalam sistem Anda melalui endpoint REST standar.',
        placeholder: 'Cari di DeeperNova Search...',
        link: 'Dokumentasi API'
      }
    },
    features: {
      eyebrow: 'Arsitektur & Keamanan',
      heading: 'Cepat, tangguh, dan terlindungi dari serangan siber',
      items: [
        {
          icon: 'fa-server',
          title: 'Pemrosesan Penuh di Server',
          desc: 'Jawaban dan tugas agent diproses mandiri di server. Keluar dan masuk kembali ke aplikasi kapan saja tanpa memutus proses.'
        },
        {
          icon: 'fa-compass',
          title: 'Mode Peramban Agent',
          desc: 'AI mampu menjelajahi dan membaca isi halaman web secara langsung untuk merangkum fakta akurat tanpa membuang waktu.'
        },
        {
          icon: 'fa-shield-halved',
          title: 'Pertahanan Siber Ekstra Kuat',
          desc: 'Dilengkapi firewall anti-SSRF, proteksi DNS rebinding, filter injeksi prompt, pembatas brute-force, dan isolasi sandbox.'
        },
        {
          icon: 'fa-bolt',
          title: 'Respons Ringan & Instan',
          desc: 'Masuk langsung ke obrolan baru yang bersih tanpa jeda pemuatan riwayat berat, dengan sitasi ringkas bebas URL panjang.'
        },
        {
          icon: 'fa-layer-group',
          title: 'Orkestrasi Sub-Agent Otomatis',
          desc: 'Kesadaran agentic penuh untuk merencanakan arsitektur, membangun kode multi-berkas, dan memverifikasi hasil secara otomatis.'
        },
        {
          icon: 'fa-lock',
          title: 'Privasi & Penyimpanan Terenkripsi',
          desc: 'Mendukung mode tamu instan maupun akun tersinkronisasi lintas perangkat dengan perlindungan sesi berstandar tinggi.'
        }
      ]
    },
    download: {
      eyebrow: 'Aplikasi Mobile',
      heading: 'Tersedia untuk perangkat Android',
      sub: 'Unduh paket instalasi resmi yang ringan dan bebas iklan untuk akses layar penuh.',
      aiApp: {
        title: 'DeeperNova AI Assistant',
        meta: 'v2.5 · 13 MB · Android 5.0+',
        desc: 'AI Chat, Mode Peramban Agent, Sub-Agent Orchestrator, dan Document Studio dalam satu aplikasi ringan.',
        btn: 'Unduh APK AI'
      },
      searchApp: {
        title: 'DeeperNova Search',
        meta: 'v1.0 · 6.6 MB · Android 5.0+',
        desc: 'Mesin pencari independen bebas pelacak dengan ringkasan cepat dan konsumsi baterai minimal.',
        btn: 'Unduh APK Search'
      }
    },
    faq: {
      eyebrow: 'Tanya Jawab',
      heading: 'Pertanyaan yang sering diajukan',
      items: [
        {
          q: 'Apakah saya harus login terlebih dahulu untuk mencoba AI?',
          a: 'Tidak. Anda dapat langsung memulai obrolan baru dalam Mode Tamu, dan masuk ke akun kapan saja melalui tombol Login di bilah sisi kiri bawah.'
        },
        {
          q: 'Apa yang terjadi jika saya menutup aplikasi saat AI sedang menjawab?',
          a: 'Proses pembuatan jawaban dan eksekusi agent berjalan sepenuhnya di server, sehingga tidak akan terputus dan tetap tersimpan saat Anda kembali.'
        },
        {
          q: 'Bagaimana keamanan data dan sistem dari ancaman siber?',
          a: 'Seluruh permintaan melewati lapisan firewall anti-injeksi, validasi DNS/SSRF ketat pada peramban otonom, serta isolasi eksekusi kode di server.'
        },
        {
          q: 'Apakah DeeperNova AI gratis digunakan?',
          a: 'Ya, fitur percakapan utama, pencarian real-time, peramban agent, dan pembuatan dokumen dapat digunakan secara gratis.'
        }
      ]
    },
    cta: {
      heading: 'Mulai bekerja lebih cerdas hari ini.',
      sub: 'Langsung buka ruang obrolan baru yang bersih, ringan, dan siap pakai.',
      button: 'Buka Chat Baru'
    },
    footer: {
      chat: 'AI Chat',
      agent: 'AI Agent',
      docs: 'Document Studio',
      search: 'Search Engine',
      api: 'Developer API',
      help: 'Pusat Bantuan',
      copyright: 'PT Deepernova AI Indonesia'
    }
  },
  en: {
    nav: {
      products: 'Products',
      features: 'Security',
      download: 'Mobile App',
      api: 'API',
      faq: 'FAQ',
      help: 'Help',
      login: 'Log In',
      startChat: 'Start Chat',
      language: 'Language'
    },
    hero: {
      badge: 'DeeperNova AI · Cloud & Browser Agent',
      titleLead: 'Clean, fast artificial intelligence,',
      titleAccent: 'autonomous on server',
      titleTrail: 'and hardened for real work.',
      sub: 'Chat, browse live web pages with Browser Agent, execute code in isolated sandboxes, and generate professional documents in one distraction-free workspace.',
      primaryCta: 'Start New Chat',
      secondaryCta: 'Open AI Agent',
      metrics: [
        { label: 'Server Execution', value: '100% Background Safe' },
        { label: 'Web Research', value: 'Autonomous Browser Agent' },
        { label: 'Cyber Defense', value: 'Multi-Layer Shield' }
      ]
    },
    products: {
      eyebrow: 'Ecosystem',
      heading: 'Four core modules in one unified platform',
      sub: 'Engineered to stay lightweight, open instantly, and focus on real output.',
      chat: {
        tag: 'Core',
        title: 'AI Chat & Browser Agent',
        desc: 'Intelligent dialogue with full-page web reading, compact citations, and background server execution that continues even if you close the app.',
        link: 'Start Chatting'
      },
      agent: {
        tag: 'Sandbox',
        title: 'Autonomous Coding Agent',
        desc: 'Isolated cloud code execution environment to architect, run, and live-preview web apps and scripts.',
        link: 'Open Agent Workspace'
      },
      docs: {
        tag: 'Office',
        title: 'Typernova Document Studio',
        desc: 'Generate clean Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) deliverables ready for download.',
        link: 'Open Document Studio'
      },
      api: {
        tag: 'Developer',
        title: 'Search & Developer API',
        desc: 'Integrate DeeperNova reasoning models and real-time search into your stack via clean REST endpoints.',
        placeholder: 'Search with DeeperNova...',
        link: 'API Documentation'
      }
    },
    features: {
      eyebrow: 'Architecture & Security',
      heading: 'Fast, resilient, and hardened against cyber threats',
      items: [
        {
          icon: 'fa-server',
          title: 'Full Server-Side Execution',
          desc: 'Responses and agent workflows run independently on the server. Leave and return to the app anytime without interrupting progress.'
        },
        {
          icon: 'fa-compass',
          title: 'Browser Agent Mode',
          desc: 'Autonomously navigates and extracts full web page content to verify facts accurately and concisely.'
        },
        {
          icon: 'fa-shield-halved',
          title: 'Hardened Cyber Security',
          desc: 'Protected by anti-SSRF DNS verification, prompt-injection firewalls, brute-force lockouts, and sandbox isolation.'
        },
        {
          icon: 'fa-bolt',
          title: 'Zero-Delay Clean Start',
          desc: 'Opens directly in a fresh empty chat with zero blocking history lag and compact URL-free citations.'
        },
        {
          icon: 'fa-layer-group',
          title: 'Proactive Agentic Flow',
          desc: 'Intrinsic agentic awareness to plan architectures, synthesize multi-file projects, and verify deliverables.'
        },
        {
          icon: 'fa-lock',
          title: 'Encrypted Session Privacy',
          desc: 'Supports instant Guest access and cross-device authenticated accounts with strict session protection.'
        }
      ]
    },
    download: {
      eyebrow: 'Mobile Apps',
      heading: 'Available for Android devices',
      sub: 'Lightweight, ad-free official packages for distraction-free native access.',
      aiApp: {
        title: 'DeeperNova AI Assistant',
        meta: 'v2.5 · 13 MB · Android 5.0+',
        desc: 'AI Chat, Browser Agent Mode, Sub-Agent Orchestrator, and Document Studio in one compact app.',
        btn: 'Download AI APK'
      },
      searchApp: {
        title: 'DeeperNova Search',
        meta: 'v1.0 · 6.6 MB · Android 5.0+',
        desc: 'Independent tracker-free search engine with instant answers and minimal battery usage.',
        btn: 'Download Search APK'
      }
    },
    faq: {
      eyebrow: 'FAQ',
      heading: 'Frequently asked questions',
      items: [
        {
          q: 'Do I need to log in before using the AI?',
          a: 'No. You enter a clean New Chat immediately as a Guest, and can sign in anytime using the Login button in the bottom-left sidebar.'
        },
        {
          q: 'What happens if I exit the app while the AI is generating?',
          a: 'All AI generation and agent tasks run 100% on the server, so processing continues uninterrupted and is ready when you return.'
        },
        {
          q: 'How is the platform protected against cyber attacks?',
          a: 'Requests pass through multi-layer anti-injection filters, DNS-verified SSRF guards on the Browser Agent, and strict sandbox isolation.'
        },
        {
          q: 'Is DeeperNova AI free to use?',
          a: 'Yes, core chat, real-time web research, browser agent mode, and document creation are free to use.'
        }
      ]
    },
    cta: {
      heading: 'Start working smarter today.',
      sub: 'Jump straight into a clean, fast, distraction-free chat workspace.',
      button: 'Open New Chat'
    },
    footer: {
      chat: 'AI Chat',
      agent: 'AI Agent',
      docs: 'Document Studio',
      search: 'Search Engine',
      api: 'Developer API',
      help: 'Help Center',
      copyright: 'PT Deepernova AI Indonesia'
    }
  },
  zh: {
    nav: {
      products: '产品',
      features: '安全架构',
      download: '客户端',
      api: 'API',
      faq: '问答',
      help: '帮助',
      login: '登录',
      startChat: '开始对话',
      language: '语言'
    },
    hero: {
      badge: 'DeeperNova AI · 云端与浏览器智能体',
      titleLead: '轻量、极速、专业的人工智能，',
      titleAccent: '全服务端自主运行',
      titleTrail: '多重网络安全防护。',
      sub: '集智能对话、自主浏览器检索 (Browser Agent)、隔离代码沙箱与专业文档生成于一体的极简高效工作台。',
      primaryCta: '开启新对话',
      secondaryCta: '打开 AI Agent',
      metrics: [
        { label: '服务端运行', value: '后台持续不中断' },
        { label: '深度检索', value: '自主浏览器智能体' },
        { label: '安全防线', value: '多层网络攻防加固' }
      ]
    },
    products: {
      eyebrow: '核心生态',
      heading: '四大核心模块，极简统一体验',
      sub: '摒弃冗余设计，秒级响应，专注于高质量产出。',
      chat: {
        tag: '核心',
        title: 'AI 对话与浏览器智能体',
        desc: '支持深度网页阅读、精简引用角标，且生成任务在服务端独立运行，退出应用也不中断。',
        link: '立即对话'
      },
      agent: {
        tag: '沙箱',
        title: '自主编程智能体',
        desc: '安全隔离的云端代码执行环境，支持构建、验证与实时预览 Web 应用。',
        link: '进入编程工作台'
      },
      docs: {
        tag: '办公',
        title: 'Typernova 文档工作室',
        desc: '快速生成排版规范的 Word (.docx)、Excel (.xlsx) 与 PowerPoint (.pptx) 文档。',
        link: '打开文档工作室'
      },
      api: {
        tag: '开发者',
        title: '搜索引擎与开发者 API',
        desc: '通过标准 REST 接口轻松接入 DeeperNova 推理模型与实时检索能力。',
        placeholder: '使用 DeeperNova 搜索...',
        link: '查看 API 文档'
      }
    },
    features: {
      eyebrow: '性能与网络安全',
      heading: '轻量高速，抵御全方位网络攻击',
      items: [
        {
          icon: 'fa-server',
          title: '100% 服务端独立运行',
          desc: '提问后即使关闭或切换应用，服务端依然持续完成推理与检索，随时返回查看完整结果。'
        },
        {
          icon: 'fa-compass',
          title: '自主浏览器模式',
          desc: '深入访问并提取网页正文内容，精准核验事实，杜绝冗长链接刷屏。'
        },
        {
          icon: 'fa-shield-halved',
          title: '企业级网络安全防线',
          desc: '内置防 SSRF/DNS 重绑定校验、提示词注入防火墙、防暴力破解与沙箱隔离。'
        },
        {
          icon: 'fa-bolt',
          title: '零延迟纯净新会话',
          desc: '进入即开启干净空白新对话，无需等待历史记录加载。'
        },
        {
          icon: 'fa-layer-group',
          title: '智能子代理编排',
          desc: '具备原生 Agent 自主意识，自动完成架构规划、多文件编码与质量校验。'
        },
        {
          icon: 'fa-lock',
          title: '隐私与多端同步',
          desc: '支持免登录访客即用及加密账号多设备实时同步。'
        }
      ]
    },
    download: {
      eyebrow: '移动客户端',
      heading: 'Android 官方轻量客户端',
      sub: '纯净无广告安装包，提供原生全屏流畅体验。',
      aiApp: {
        title: 'DeeperNova AI Assistant',
        meta: 'v2.5 · 13 MB · Android 5.0+',
        desc: '集成 AI 对话、浏览器智能体、子代理编排与文档工作室。',
        btn: '下载 AI 客户端'
      },
      searchApp: {
        title: 'DeeperNova Search',
        meta: 'v1.0 · 6.6 MB · Android 5.0+',
        desc: '独立无追踪极速搜索引擎客户端。',
        btn: '下载搜索客户端'
      }
    },
    faq: {
      eyebrow: '常见问题',
      heading: '常见问题解答',
      items: [
        {
          q: '必须先登录才能使用吗？',
          a: '不需要。进入即可直接使用纯净访客新对话，随时可通过左下角侧边栏的登录按钮登录账号。'
        },
        {
          q: '提问后退出应用会导致回答中断吗？',
          a: '不会。所有推理与智能体流程均在服务端独立完成，重新进入即可查看结果。'
        },
        {
          q: '系统如何保障网络安全？',
          a: '全链路配备防注入过滤、SSRF/DNS 安全校验、请求限流与隔离沙箱保护。'
        },
        {
          q: 'DeeperNova AI 是免费的吗？',
          a: '是的，核心对话、实时搜索、浏览器智能体与文档生成均可免费使用。'
        }
      ]
    },
    cta: {
      heading: '即刻开启高效智能工作体验',
      sub: '轻量、专业、零等待，浏览器即开即用。',
      button: '开启新对话'
    },
    footer: {
      chat: 'AI 对话',
      agent: 'AI Agent',
      docs: '文档工作室',
      search: '搜索引擎',
      api: '开发者 API',
      help: '帮助中心',
      copyright: 'PT Deepernova AI Indonesia'
    }
  }
};
