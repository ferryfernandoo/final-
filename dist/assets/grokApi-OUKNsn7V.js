import{t as e}from"./apiConfig-BCHrkqAO.js";import{n as t}from"./realtimeSyncService-CFMUW4cF.js";import{t as n}from"./preload-helper-CsoeaaUJ.js";import{i as r,n as i}from"./chatConstants-CScKW7mE.js";var a=`deepernova_memory_system`,o=100,s=720*60*60*1e3,c=class{constructor(){this.memories=this.loadMemories()}loadMemories(){if(typeof localStorage>`u`)return[];try{let e=localStorage.getItem(a);if(!e)return[];try{return JSON.parse(e).filter(e=>e&&typeof e.timestamp==`number`&&Date.now()-e.timestamp<s)}catch(e){return console.error(`Error parsing memory storage:`,e),localStorage.removeItem(a),[]}}catch(e){return console.error(`Error loading memories:`,e),[]}}saveMemories(){if(!(typeof localStorage>`u`))try{let e=this.memories.sort((e,t)=>t.weight*t.accessCount-e.weight*e.accessCount).slice(0,o);localStorage.setItem(a,JSON.stringify(e))}catch(e){console.error(`Error saving memories:`,e)}}extractKeywords(e){if(!e||typeof e!=`string`)return[];let t=e.toLowerCase().match(/\b\w{3,}\b/g)||[],n=new Set(`the.a.an.and.or.but.is.are.was.were.be.been.being.have.has.had.do.does.did.will.would.could.should.may.might.must.can.dari.ke.di.yang.dan.atau.untuk.dengan.adalah.saya.anda.mereka.kami.kita.aku.kamu.dia`.split(`.`));return[...new Set(t.filter(e=>!n.has(e)))]}createEmbedding(e,t){if(!e||typeof e!=`string`)return[];let n={},r=e.toLowerCase().match(/\b\w+\b/g)||[];return r.forEach(e=>{n[e]=(n[e]||0)+1}),t.slice(0,20).map(e=>n[e]||0).map(e=>e/(r.length||1))}cosineSimilarity(e,t){let n=Math.max(e.length,t.length),r=[...e,...Array(n-e.length).fill(0)],i=[...t,...Array(n-t.length).fill(0)],a=0,o=0,s=0;for(let e=0;e<n;e++)a+=r[e]*i[e],o+=r[e]*r[e],s+=i[e]*i[e];let c=Math.sqrt(o)*Math.sqrt(s);return c===0?0:a/c}extractMemories(e,t,n=`en`){let r=[];return Array.isArray(e)&&e.forEach(e=>{let t=e.sender===`user`||e.role===`user`,n=(e.text||e.content||``).trim();if(t&&n.length>=3){let e=this.extractKeywords(n),t=n.match(/\b(?:namaku|nama saya|nama ku|panggil aku|panggil saya|aku adalah|saya adalah)\s+([A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)(?:\s+(?:dan|yang|saat|di|\.|\,)|$)/i)||n.match(/\b(?:namaku|nama saya|nama ku|panggil aku|panggil saya)\s+([A-Za-z0-9_]+)/i);t&&r.push({type:`fact`,content:`Nama pengguna: `+t[1].trim(),weight:1,keywords:[`nama`,`pengguna`,...e]})}}),r}addMemory(e,t,n=`en`){let r=e.content;e.type===`file_content`&&typeof r==`string`&&(r=r.slice(0,2e5));let i=e.keywords||this.extractKeywords(r),a=this.createEmbedding(r,i),s={id:`mem_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,type:e.type||`context`,content:r,conversationId:t,timestamp:Date.now(),weight:e.weight||.7,tags:i,accessCount:0,embedding:a,language:n,metadata:e.metadata||null,sources:e.sources||null};return this.memories.push(s),this.memories=this.deduplicateMemories(),this.memories.length>o&&(this.memories.sort((e,t)=>t.weight*t.accessCount-e.weight*e.accessCount),this.memories=this.memories.slice(0,o)),this.saveMemories(),s}deduplicateMemories(){let e=[];return this.memories.forEach(t=>{let n=!1;for(let r=0;r<e.length;r++)if(this.cosineSimilarity(t.embedding,e[r].embedding)>.8||t.content===e[r].content){t.weight>e[r].weight?e.splice(r,1):n=!0;break}n||e.push(t)}),e}searchMemories(e,t=5,n=null,r=!1){if(this.memories.length===0)return[];let i=this.extractKeywords(e),a=this.createEmbedding(e,i),o=this.memories.filter(e=>r?!0:e.conversationId!==n).map(e=>{let t=this.cosineSimilarity(a,e.embedding),n=i.filter(t=>e.tags.includes(t)).length/Math.max(i.length,e.tags.length),r=t*.6+n*.4,o=Math.max(0,1-(Date.now()-e.timestamp)/s);return{memory:e,score:r*.7+e.weight*.2+o*.1}}).filter(e=>e.score>.2).sort((e,t)=>t.score-e.score).slice(0,t);return o.forEach(e=>{e.memory.accessCount+=1}),this.saveMemories(),o.map(e=>e.memory)}createConversationSummaryBlock(e,t=0,n=`en`){let r=e.filter(e=>e.sender===`user`&&e.text).map(e=>e.text.trim()).join(` `),i=e.filter(e=>e.sender!==`user`&&e.text).map(e=>e.text.trim()).join(` `),a=r.split(/[.?!]\s*/)[0].trim(),o=i.split(/[.?!]\s*/).filter(Boolean).slice(-1)[0]||``,s=this.extractKeywords(`${r} ${i}`).slice(0,6),c=s.length?s.join(`, `):n===`id`?`topik penting`:`important topic`,l=a.length>120?`${a.substring(0,117)}...`:a,u=o.length>120?`${o.substring(0,117)}...`:o;return!l&&!u?null:n===`id`?`Ringkasan 10 chat #${t+1}: User menanyakan "${l||`topik percakapan`}". Deepernova AI menjawab dengan fokus pada ${c}.`:`Summary of 10 chats #${t+1}: User asked "${l||`the topic`}". Deepernova AI answered focusing on ${c}.`}processConversationSummaries(e,t,n=`en`){if(!t||!e||!e.length)return 0;let r=e.filter(e=>e.text&&e.sender);if(r.length<10)return 0;let i=Math.floor(r.length/10),a=0;for(let e=0;e<i;e++){let i=r.slice(e*10,(e+1)*10);if(i.length<8)continue;let o=this.createConversationSummaryBlock(i,e,n);o&&(this.memories.some(e=>e.conversationId===t&&e.type===`summary`&&e.content===o)||(this.addMemory({type:`summary`,content:o,weight:.95,keywords:this.extractKeywords(o)},t,n),a+=1))}return a}getConversationSummaries(e,t=3){return e?this.memories.filter(t=>t.conversationId===e&&t.type===`summary`).sort((e,t)=>t.timestamp-e.timestamp).slice(0,t):[]}getConversationSummaryContext(e,t=`en`,n=3){let r=this.getConversationSummaries(e,n);if(r.length===0)return``;let i=t===`id`?`
📌 RINGKASAN CHAT SEBELUMNYA:
`:`
📌 PREVIOUS CHAT SUMMARIES:
`;return r.forEach(e=>{let t=e.content.substring(0,120)+(e.content.length>120?`...`:``);i+=`• ${t}\n`}),i}getMemoryContext(e,t,n=`en`){let r=this.searchMemories(e,5,t,!0);if(r.length===0)return``;let i={};r.forEach(e=>{i[e.type]||(i[e.type]=[]),i[e.type].push(e)});let a=n===`id`?`
📚 MEMORI KONTEKS DARI CHAT SEBELUMNYA:
`:`
📚 RELEVANT CONTEXT FROM PREVIOUS CHATS:
`;return Object.entries(i).forEach(([e,t])=>{let r={preference:n===`id`?`Preferensi Pengguna`:`User Preferences`,fact:n===`id`?`Fakta Penting`:`Important Facts`,pattern:n===`id`?`Pola/Kebiasaan`:`Patterns/Habits`,summary:n===`id`?`Ringkasan Obrolan`:`Chat Summaries`,context:n===`id`?`Konteks Lainnya`:`Other Context`,search:n===`id`?`Hasil Pencarian Web`:`Search Results`}[e]||e;a+=`\n[${r}]\n`,t.slice(0,2).forEach(e=>{let t=new Date(e.timestamp).toLocaleDateString(n===`id`?`id-ID`:`en-US`),r=e.content.substring(0,80)+(e.content.length>80?`...`:``);a+=`• ${r} (${t})\n`})}),a}processConversation(e,t,n=`en`){let r=this.extractMemories(e,t,n);r.forEach(e=>{this.addMemory(e,t,n)});let i=this.processConversationSummaries(e,t,n);return i>0&&console.log(`[MemoryService] Saved ${i} chat summary memory blocks for conversation ${t}`),r.length+i}getCrossRoomContext(e,t=`en`,n=5){let r=this.memories.filter(t=>t.conversationId&&t.conversationId!==e).sort((e,t)=>{let n={preference:3,fact:2,pattern:1,context:0},r=n[e.type]||0,i=n[t.type]||0;return r===i?e.weight===t.weight?t.timestamp-e.timestamp:t.weight-e.weight:i-r}).slice(0,n);if(r.length===0)return``;let i=t===`id`?`
🌐 TENTANG ANDA (DARI CHAT SEBELUMNYA):
`:`
🌐 ABOUT YOU (FROM PREVIOUS CHATS):
`;return r.forEach(e=>{let n={preference:t===`id`?`Preferensi`:`Preference`,fact:t===`id`?`Fakta`:`Fact`,pattern:t===`id`?`Pola`:`Pattern`,context:t===`id`?`Konteks`:`Context`}[e.type]||e.type,r=e.content.substring(0,60)+(e.content.length>60?`...`:``);i+=`• [${n}] ${r}\n`}),i}getSummary(){let e={};return this.memories.forEach(t=>{e[t.type]=(e[t.type]||0)+1}),{totalMemories:this.memories.length,byType:e,oldestMemory:this.memories.length>0?Math.min(...this.memories.map(e=>e.timestamp)):null,newestMemory:this.memories.length>0?Math.max(...this.memories.map(e=>e.timestamp)):null}}recallMemory(e=``,t={}){let{currentConversationId:n=null,globalMemoryText:r=``,language:i=`id`,limit:a=6}=t;if(!e||typeof e!=`string`||!e.trim())return{query:``,results:[],formattedContext:i===`id`?`Tidak ada kata kunci recall yang diberikan.`:`No recall keywords provided.`};let o=e.trim(),s=/^all$|^semua$|^all_memory$/i.test(o),c=s?[]:this.extractKeywords(o),l=[];l=s?[...this.memories].slice(0,20):this.searchMemories(o,a,n,!0);let u=[],d=r||typeof localStorage<`u`&&localStorage.getItem(`guest_global_memory`)||``;d&&d.trim()&&d.split(`
`).map(e=>e.trim()).filter(e=>e.length>2).forEach((e,t)=>{if(s){u.push({id:`global_${t}`,type:`pengetahuan_global`,content:e.replace(/^[-*•]\s*/,``),timestamp:Date.now(),weight:.9,score:1,source:`global_memory`});return}let n=e.toLowerCase(),r=0;n.includes(o.toLowerCase())&&(r+=.8),c.forEach(e=>{n.includes(e.toLowerCase())&&(r+=.3)}),r>.2&&u.push({id:`global_${t}`,type:`pengetahuan_global`,content:e.replace(/^[-*•]\s*/,``),timestamp:Date.now(),weight:.9,score:r,source:`global_memory`})});let f=[...l.map(e=>({...e,source:`structured`})),...u],p=new Set,m=[];f.sort((e,t)=>(t.score||t.weight||0)-(e.score||e.weight||0)),f.forEach(e=>{let t=e.content.trim().toLowerCase();p.has(t)||(p.add(t),m.push(e))});let h=m.slice(0,a);if(h.length===0)return{query:o,results:[],formattedContext:``};let g=i===`id`?`\n🧠 [HASIL RECALL MEMORY - Kata Kunci: "${o}"]:\n`:`\n🧠 [RECALL MEMORY RESULTS - Keywords: "${o}"]:\n`;return h.forEach((e,t)=>{let n=e.content.length>300?e.content.substring(0,297)+`...`:e.content;g+=`${t+1}. ${n}\n`}),{query:o,results:h,formattedContext:g}}deleteMemory(e){if(!e||typeof e!=`string`)return{success:!1,count:0,deleted:[]};let t=e.trim();if(t.toLowerCase()===`all`||t.toLowerCase()===`semua`){let e=this.memories.length;return this.clearMemories(),{success:!0,count:e,deleted:[`all`]}}let n=t.toLowerCase(),r=[],i=[];if(this.memories.forEach(e=>{let a=e.id===t,o=typeof e.content==`string`&&e.content.toLowerCase().includes(n),s=Array.isArray(e.tags)&&e.tags.some(e=>e.toLowerCase()===n);a||o||s?r.push(e):i.push(e)}),this.memories=i,this.saveMemories(),typeof localStorage<`u`)try{let e=localStorage.getItem(`guest_global_memory`);if(e){let t=e.split(`
`).filter(e=>!e.toLowerCase().includes(n)).join(`
`);localStorage.setItem(`guest_global_memory`,t),localStorage.setItem(`guest_global_memory_updated`,new Date().toISOString())}}catch(e){console.warn(`[MemoryService] Local storage global memory update warning:`,e)}return{success:r.length>0,count:r.length,deleted:r}}updateMemory(e,t,n=`preference`,r=null){if(!t||typeof t!=`string`)return{success:!1,memory:null};let i=(e||``).trim().toLowerCase(),a=-1;if(i&&(a=this.memories.findIndex(e=>{let t=typeof e.content==`string`&&e.content.toLowerCase().includes(i),n=Array.isArray(e.tags)&&e.tags.some(e=>e.toLowerCase()===i);return t||n})),a!==-1){let e=this.memories[a],r={...e,content:t.trim(),type:n||e.type||`preference`,timestamp:Date.now(),weight:Math.max(e.weight||.7,.9),tags:this.extractKeywords(t)};return this.memories[a]=r,this.saveMemories(),{success:!0,updated:!0,memory:r}}return{success:!0,created:!0,memory:this.addMemory({content:t.trim(),type:n||`preference`,weight:.95},r)}}getActiveMemoryProfile(e=`id`,t=10){let n=[],r=new Set;if([...this.memories].filter(e=>e&&e.type!==`summary`&&e.type!==`context`).sort((e,t)=>{let n={preference:4,fact:3,pattern:2},r=n[e.type]||0,i=n[t.type]||0;return r===i?(t.weight||.5)-(e.weight||.5):i-r}).forEach(e=>{if(!e||!e.content||typeof e.content!=`string`)return;let t=e.content.trim().toLowerCase();r.has(t)||(r.add(t),n.push({type:e.type||`preference`,content:e.content.trim()}))}),typeof localStorage<`u`)try{let e=localStorage.getItem(`guest_global_memory`);e&&e.trim()&&e.split(`
`).map(e=>e.trim().replace(/^[-*•]\s*/,``)).filter(e=>e.length>3).forEach(e=>{let t=e.toLowerCase();r.has(t)||(r.add(t),n.push({type:`global`,content:e}))})}catch{}let i=n.slice(0,t);if(i.length===0)return``;let a={preference:e===`id`?`Preferensi`:`Preference`,fact:e===`id`?`Fakta Pengguna`:`User Fact`,pattern:e===`id`?`Kebiasaan`:`Habit`,context:e===`id`?`Konteks`:`Context`,global:e===`id`?`Profil`:`Profile`},o=e===`id`?`

[PROFIL MEMORI PENGGUNA (DIINGAT SECARA OTOMATIS)]:
`:`

[ACTIVE USER MEMORY PROFILE (AUTOMATICALLY RECALLED)]:
`;return i.forEach(e=>{let t=a[e.type]||a.preference;o+=`• [${t}] ${e.content}\n`}),o+=e===`id`?`*(Gunakan informasi profil di atas secara alami untuk menyesuaikan jawaban Anda tanpa perlu konfirmasi ulang kecuali diminta.)*
`:`*(Use the profile above naturally to personalize your answers without asking again unless requested.)*
`,o}async executeAction(t={},n={}){let{action:r,content:i,target:a,category:o=`preference`,query:s}=t,{isAuthenticated:c=!1,isGuest:l=!0,conversationId:u=null,language:d=`id`}=n;if(!r)return{success:!1,error:`No action specified`};let f=String(r).toLowerCase().trim();try{if(f===`save`||f===`write`){let t=(i||a||s||``).trim();if(!t)return{success:!1,error:`Empty content`};let n=this.addMemory({type:o||`preference`,content:t,weight:.95},u,d);if(typeof localStorage<`u`)try{let e=(localStorage.getItem(`guest_global_memory`)||``).split(`
`).filter(e=>e.trim().length>0);e.some(e=>e.toLowerCase().includes(t.toLowerCase()))||(e.push(`- ${t}`),localStorage.setItem(`guest_global_memory`,e.join(`
`)),localStorage.setItem(`guest_global_memory_updated`,new Date().toISOString()))}catch{}if(c&&!l&&e)try{fetch(`${e}/api/memory`,{method:`POST`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({summary:t,category:o||`preference`,sourceSessionId:u})}).catch(()=>{})}catch{}return{success:!0,action:`save`,content:t,category:o,displayMessage:d===`id`?`Memori disimpan: "${t}"`:`Memory saved: "${t}"`,memory:n}}if(f===`update`){let t=(a||``).trim(),n=(i||``).trim();if(!n)return{success:!1,error:`Empty new content`};let r=this.updateMemory(t,n,o,u);if(c&&!l&&e)try{fetch(`${e}/api/memory/global`,{method:`PUT`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({globalMemory:this.memories.map(e=>`- ${e.content}`).join(`
`)})}).catch(()=>{})}catch{}return{success:!0,action:`update`,target:t,content:n,category:o,displayMessage:d===`id`?`Memori diperbarui: "${n}"`:`Memory updated: "${n}"`,memory:r.memory}}if(f===`delete`||f===`forget`){let t=(a||i||s||``).trim();if(!t)return{success:!1,error:`Empty delete target`};let n=this.deleteMemory(t);if(c&&!l&&e)try{fetch(`${e}/api/memory/global`,{method:`PUT`,credentials:`include`,headers:{"Content-Type":`application/json`},body:JSON.stringify({globalMemory:this.memories.map(e=>`- ${e.content}`).join(`
`)})}).catch(()=>{})}catch{}return{success:!0,action:`delete`,target:t,count:n.count,displayMessage:d===`id`?`Memori dihapus: "${t}"`:`Memory removed: "${t}"`}}if(f===`recall`||f===`search`){let e=(s||a||i||``).trim(),t=this.recallMemory(e,{currentConversationId:u,language:d,limit:5});return{success:!0,action:`recall`,query:e,results:t.results,context:t.formattedContext,displayMessage:d===`id`?`Mengingat kembali: "${e}" (${t.results.length} catatan)`:`Recalled: "${e}" (${t.results.length} items)`}}return{success:!1,error:`Unknown memory action: ${f}`}}catch(e){return console.error(`[MemoryService] Error executing memory action:`,e),{success:!1,error:e.message}}}clearMemories(){this.memories=[],typeof localStorage<`u`&&(localStorage.removeItem(a),localStorage.removeItem(`guest_global_memory`))}},l=new c,u=`deepernova_rag_index_v1`,d=800,f=1e3,p=1e3*60*5,m=new class{constructor(){this.index=this.loadIndex(),this.remoteIndexAttempted=!1,this.docFreq={},this.idf={},this.vocabList=[],this.totalDocs=(this.index.docs||[]).length,this.queryCache=new Map,this.tryLoadRemoteIndex()}loadIndex(){try{let e=localStorage.getItem(u);if(!e)return{docs:[]};let t=(JSON.parse(e).docs||[]).map(e=>this.normalizeDoc(e));return setTimeout(()=>this.buildGlobalStats(),0),{docs:t}}catch(e){return console.error(`Failed to load RAG index:`,e),localStorage.removeItem(u),{docs:[]}}}async tryLoadRemoteIndex(){if(!this.remoteIndexAttempted){this.remoteIndexAttempted=!0;try{if(Array.isArray(this.index?.docs)&&this.index.docs.length>0)return;let e=await fetch(`/rag_index.json`,{cache:`no-cache`});if(!e.ok)return;let t=await e.json();if(t&&Array.isArray(t.docs)&&t.docs.length){this.index={docs:t.docs.map(e=>this.normalizeDoc(e))};try{this.buildGlobalStats()}catch{console.debug(`buildGlobalStats failed`)}try{let e=this.index.docs.map(({keywordSet:e,...t})=>t);localStorage.setItem(u,JSON.stringify({docs:e}))}catch{}}}catch(e){console.debug(`No remote RAG index found or failed to load:`,e?.message||e)}}}saveIndex(){try{let e=f,t=!1;for(;e>0&&!t;)try{let n=this.index.docs.slice(-e).map(({keywordSet:e,...t})=>t);localStorage.setItem(u,JSON.stringify({docs:n})),t=!0}catch(t){if(t.name===`QuotaExceededError`||t.code===22||t.message&&t.message.includes(`quota`))console.warn(`[RAG] LocalStorage quota exceeded, reducing index size to save. Old limit: ${e}`),e=Math.floor(e/2);else throw t}}catch(e){console.warn(`[RAG] Failed to save RAG index to localStorage:`,e)}}normalizeDoc(e){let t={id:e.id,docId:e.docId||e.id,title:e.title||e.docId||e.id,content:e.content||e.text||``,keywords:Array.isArray(e.keywords)?e.keywords:this.extractKeywords(e.content||e.text||``),termFreq:{},docLength:0,embedding:Array.isArray(e.embedding)?e.embedding:[],createdAt:e.createdAt||Date.now()},n=(t.content||``).toLowerCase().match(/\b\w+\b/g)||[];return t.docLength=n.length,n.forEach(e=>{t.termFreq[e]=(t.termFreq[e]||0)+1}),t.keywordSet=new Set(t.keywords),t}extractKeywords(e){if(!e||typeof e!=`string`)return[];let t=e.toLowerCase().match(/\b\w{2,}\b/g)||[],n=new Set(`the.and.for.with.that.this.have.from.your.you.are.our.but.not.was.were.will.can.dari.ke.di.yang.dan.atau.untuk.dengan.adalah.saya.anda.ini.itu.atau`.split(`.`)),r=t.filter(e=>!n.has(e)),i=[];for(let e=0;e<r.length-1;e++)i.push(`${r[e]} ${r[e+1]}`);let a=[...r,...i],o={};return a.forEach(e=>o[e]=(o[e]||0)+1),Object.keys(o).sort((e,t)=>o[t]-o[e]).slice(0,60)}createEmbedding(e,t){if(!e||typeof e!=`string`||!this.vocabList.length)return[];let n={},r=e.toLowerCase().match(/\b\w+\b/g)||[];r.forEach(e=>{n[e]=(n[e]||0)+1});let i=r.length||1;return this.vocabList.map(e=>(n[e]||0)/i*(this.idf[e]||0))}buildGlobalStats(){let e=this.index.docs||[];this.totalDocs=e.length;let t={};e.forEach(e=>{let n=new Set;((e.content||``).toLowerCase().match(/\b\w+\b/g)||[]).forEach(e=>{n.has(e)||(t[e]=(t[e]||0)+1,n.add(e))})}),this.docFreq=t,this.idf={},Object.keys(t).forEach(e=>{this.idf[e]=Math.log(1+this.totalDocs/(1+t[e]))}),this.vocabList=Object.keys(t).sort((e,n)=>t[n]-t[e]).slice(0,256),e.forEach(e=>{e.embedding=this.createEmbedding(e.content||``,[])})}cosineSimilarity(e,t){let n=Math.max(e.length,t.length),r=[...e,...Array(n-e.length).fill(0)],i=[...t,...Array(n-t.length).fill(0)],a=0,o=0,s=0;for(let e=0;e<n;e++)a+=r[e]*i[e],o+=r[e]*r[e],s+=i[e]*i[e];let c=Math.sqrt(o)*Math.sqrt(s);return c===0?0:a/c}chunkText(e,t=d){let n=[],r=0;for(;r<e.length;){let i=e.slice(r,r+t);n.push(i),r+=t}return n}indexDocuments(e=[]){let t=[];return e.forEach(e=>{let n=e.title||(e.id||``).toString(),r=e.namespace||`default`;this.chunkText(e.text||e.content||``).forEach((i,a)=>{let o=`${e.id||n}_${a}_${Date.now().toString(36)}`,s=this.extractKeywords(i),c=(i||``).toLowerCase().match(/\b\w+\b/g)||[],l={};c.forEach(e=>{l[e]=(l[e]||0)+1});let u=c.length,d={id:o,docId:e.id||n,title:n,content:i,namespace:r,keywords:s,keywordSet:new Set(s),termFreq:l,docLength:u,embedding:[],createdAt:Date.now()};this.index.docs.push(d),t.push(o)})}),this.buildGlobalStats(),this.saveIndex(),t}clearIndex(e=null){e?this.index.docs=this.index.docs.filter(t=>t.namespace!==e):this.index={docs:[]},this.saveIndex()}scoreDocument(e,t,n){let r=1.5,i=.75,a=this.index.docs.reduce((e,t)=>e+(t.docLength||0),0)/Math.max(1,this.index.docs.length),o=0;for(let t of e){let e=n.termFreq&&n.termFreq[t]?n.termFreq[t]:0;if(e===0)continue;let s=this.idf[t]||Math.log(1+this.totalDocs/1);o+=s*(e*(r+1)/(e+r*(1-i+i*((n.docLength||0)/(a||1)))))}return((t&&t.length&&n.embedding&&n.embedding.length?this.cosineSimilarity(t,n.embedding):0)*.45+o*.55)*Math.min(1.2,1+((n.docLength||0)-300)/2e3)}search(e,t=5,n=null){return this.searchWithScores(e,t,n).map(e=>e.doc)}searchWithScores(e,t=10,n=null){if(!e||this.index.docs.length===0)return[];let r=this.queryCache.get(e);if(r&&Date.now()-r.ts<p)return r.results.slice(0,t);let i=this.extractKeywords(e);if(i.length===0)return[];this.vocabList.length||this.buildGlobalStats();let a=this.createEmbedding(e,[]),o=this.index.docs.filter(e=>n?e.namespace===n:!0),s=[];for(let e of o){let t=this.scoreDocument(i,a,e);t>0&&s.push({doc:e,score:t})}let c=s.sort((e,t)=>t.score-e.score).slice(0,t);return this.queryCache.set(e,{ts:Date.now(),results:c}),c}formatContextForPrompt(e,t=2e3){if(!e||e.length===0)return``;let n=`KNOWLEDGE BASE CONTEXT (untuk referensi):

`,r=0;for(let i of e){let e=i.doc||i,a=`[${e.title||`Unknown`}]\n${e.content||``}\n`,o=Math.ceil(a.length*.25);if(r+o>t)break;n+=a+`
---

`,r+=o}return n}async ingestKnowledgeBase(e=`/data/datasets/deepernova_dataset.json`){try{let t=await fetch(e);if(!t.ok)return!1;let n=await t.text();if(!n||n.trim().startsWith(`<`))return!1;let r=JSON.parse(n);if(!Array.isArray(r))return!1;this.clearIndex(`knowledge_base`);let i=r.map(e=>({id:e.id,title:e.title,text:e.text,namespace:`knowledge_base`}));return this.indexDocuments(i),console.log(`✅ RAG: Ingested ${i.length} knowledge base documents`),!0}catch(e){return console.warn(`RAG knowledge base dataset skipped (non-JSON response):`,e.message),!1}}getStats(){return{totalChunks:this.index.docs.length}}},h=class{constructor(){this.map=new Map}isSupported(){return!0}async read(e){return this.map.get(e)||null}async write(e,t){let n=t.getReader(),r=[];for(;;){let{done:e,value:t}=await n.read();if(e)break;r.push(t)}this.map.set(e,new Blob(r))}async getSize(e){let t=this.map.get(e);return t?t.size:-1}async list(){return Array.from(this.map.entries()).map(([e,t])=>({key:e,size:t.size}))}async delete(e){this.map.delete(e)}},g=`Kamu adalah DeeperNova Boron 1.1, model kecerdasan buatan lokal on-device kebanggaan DeeperNova AI Indonesia yang berjalan 100% offline langsung di perangkat pengguna.
Jawablah setiap pertanyaan pengguna secara jelas, ramah, akurat, terstruktur, dan tuntas.
Identitas mutlak: DeeperNova Boron 1.1 buatan DeeperNova AI (bukan Qwen atau pihak lain).`;function _(e=``){let t=e.toLowerCase().trim();return/^(halo|hai|hi|hey|assalamu|selamat|pagi|siang|sore|malam)\b/i.test(t)||t.length<5?`Halo! Model DeeperNova AI siap mendampingi Anda.`:/(siapa kamu|kamu siapa|identitas|siapa pembuatmu|siapa ciptakan|model apa)/i.test(t)?`Saya adalah DeeperNova AI, model kecerdasan buatan dari DeeperNova AI Indonesia.`:/(bisa apa|kemampuan|fitur)/i.test(t)?`Sebagai model DeeperNova AI, saya dapat membantu Anda dalam:
- **Tanya Jawab & Pengetahuan Umum**
- **Pemrograman & Coding** (Python, JavaScript, HTML/CSS, SQL, dll)
- **Analisis & Rangkuman Teks / Dokumen**
- **Penulisan Kreatif & Perancangan Logika**`:`Maaf, koneksi ke engine GPU AI saat ini sedang menghubungkan ulang. Silakan coba kembali pertanyaan Anda dalam beberapa detik.`}function v(e){return!e||typeof e!=`string`?e:e.replace(/\bQwen(?:2\.5|2|1\.5)?(?:[-_](?:Instruct|Chat|Base|GGUF))?\b/gi,`DeeperNova Boron 1.1`).replace(/\bQwen\b/gi,`DeeperNova Boron`).replace(/\bTongyi Qianwen\b/gi,`DeeperNova Boron 1.1`).replace(/\bAlibaba(?: Cloud)?\b/gi,`DeeperNova`)}function y(e){if(!e)return{thought:``,answer:``,isThinking:!1};let t=e.indexOf(`<think>`);if(t===-1)return{thought:``,answer:e.trim(),isThinking:!1};let n=e.indexOf(`</think>`);return n===-1?{thought:e.substring(t+7).trim(),answer:``,isThinking:!0}:{thought:e.substring(t+7,n).trim(),answer:e.substring(n+8).trim(),isThinking:!1}}function b(e){if(!e||typeof e!=`string`)return`Berikut adalah hasil analisis DeeperNova AI.`;let t=e.replace(/<\/?think>/gi,``).trim(),n=t.match(/(?:kesimpulan(?:nya)?|jawaban(?:nya)?|solusi(?:nya)?|kesimpulannya adalah|maka dari itu|jadi|rangkuman|conclusion|therefore|the answer is)[:\s\n]+([\s\S]+)$/i);if(n&&n[1]?.trim().length>10)return v(n[1].trim());let r=t.split(/\n\s*\n/).map(e=>e.trim()).filter(Boolean);if(r.length>=2){let e=r[r.length-1];if(!e.toLowerCase().startsWith(`saya harus`)&&!e.toLowerCase().startsWith(`let me`)&&!e.toLowerCase().startsWith(`menganalisis`)&&e.length>15)return v(e)}let i=t.replace(/^(?:menganalisis|analisis|memeriksa|berpikir|proses berpikir|let me think|thinking)[:\s]*/gi,``).replace(/^(?:saya harus|saya perlu|saya akan|pengguna bertanya|user is asking)[\s\S]*?(?:jadi|maka|jawabannya:?)\s*/gi,``).trim();return i.length>15?v(i):v(t.length>5?t:`Halo! Saya DeeperNova Boron 1.1, siap membantu Anda. Silakan sampaikan pertanyaan atau tugas Anda!`)}new class{constructor(){this.wllama=null,this.isLoading=!1,this.isReady=!1,this.useCloudFallback=!1,this.loadProgress=0,this.modelPath=`/models/deepernova-boron-1.1.gguf`,this.loadError=null,this.initPromise=null,this.progressListeners=new Set}onProgressUpdate(e){return this.progressListeners.add(e),()=>this.progressListeners.delete(e)}emitProgress(e,t=``,n=0,r=0){this.loadProgress=e;for(let i of this.progressListeners)try{i(e,t,n,r)}catch{}}async initModel(e=null){return this.isReady&&(this.wllama?.isModelLoaded?.()||this.useCloudFallback)?(e&&e(100),this.wllama):(this.initPromise||=(async()=>{this.isLoading=!0,this.loadError=null,this.useCloudFallback=!1;try{console.log(`[LocalAI] Initializing DeeperNova Boron 1.1 Local Engine...`),this.emitProgress(5,`Menginisialisasi Wllama Engine...`);let t=``;typeof window<`u`&&window.location&&(t=window.location.origin||``),t.endsWith(`/`)&&(t=t.slice(0,-1));let r=`${t}/wllama/wllama.wasm`,i=`${t}${this.modelPath}`,a={default:r,"wllama.wasm":r,"single-thread/wllama.wasm":r,"multi-thread/wllama.wasm":r},{Wllama:o,CacheManager:s}=await n(async()=>{let{Wllama:e,CacheManager:t}=await import(`./wllama-Bn69Sj-A.js`);return{Wllama:e,CacheManager:t}},[]),c=null;try{c=new s}catch(e){console.warn(`[LocalAI] Standard CacheManager (OPFS) unavailable, using MemoryStorageBackend:`,e.message),c=new s([new h])}this.wllama=new o(a,{cacheManager:c,allowOffline:!0,suppressNativeLog:!1}),console.log(`[LocalAI] Loading GGUF model from:`,i),this.emitProgress(10,`Membaca model dari asset aplikasi...`);let l=await fetch(i);if(!l.ok)throw Error(`HTTP ${l.status} gagal memuat model dari ${i}`);let u=Number(l.headers.get(`content-length`)||491400032),d=0,f=null;if(l.body&&typeof l.body.getReader==`function`){let t=l.body.getReader(),n=[];for(;;){let{done:r,value:i}=await t.read();if(r)break;n.push(i),d+=i.byteLength||i.length||0;let a=Math.min(95,Math.max(5,Math.round(d/u*100)));this.loadProgress=a,e&&e(a),this.emitProgress(a,`Memuat Boron 1.1 (${Math.round(d/(1024*1024))} MB / ${Math.round(u/(1024*1024))} MB)...`,d,u)}f=new Blob(n,{type:`application/octet-stream`})}else f=await l.blob();console.log(`[LocalAI] Model Blob ready (${f.size} bytes). Preparing WebAssembly inference...`),this.emitProgress(96,`Mengalokasikan memori runtime AI...`,d||u,u);let p=typeof navigator<`u`&&navigator.hardwareConcurrency?navigator.hardwareConcurrency:4,m=Math.max(1,Math.min(Math.floor(p/2),2));return await this.wllama.loadModel([f],{n_threads:m,n_ctx:1024,n_batch:64,n_gpu_layers:0,embeddings:!1}),this.isReady=!0,this.isLoading=!1,this.loadProgress=100,e&&e(100),this.emitProgress(100,`Model DeeperNova Boron 1.1 Siap!`,u,u),console.log(`[LocalAI] ✅ DeeperNova Boron 1.1 Local Engine Ready!`),this.wllama}catch(e){return console.warn(`[LocalAI] Local GGUF engine initialization deferred to Cloud Fallback:`,e),this.loadError=e.message||`Gagal memuat model offline`,this.useCloudFallback=!0,this.isReady=!0,this.isLoading=!1,this.emitProgress(100,`Akselerasi DeeperNova Aktif`),null}finally{this.initPromise=null}})(),this.initPromise)}formatChatPrompt(e,t=[]){let n=`<|im_start|>system\n${g}<|im_end|>\n`,r=(t||[]).slice(-4);for(let e of r){let t=e.sender===`user`||e.role===`user`?`user`:`assistant`,r=e.text||e.content||``;r=r.replace(/<think>[\s\S]*?<\/think>/g,``).trim(),r&&r.length<500&&(n+=`<|im_start|>${t}\n${r}<|im_end|>\n`)}return n+=`<|im_start|>user\n${e}<|im_end|>\n<|im_start|>assistant\n`,n}async generateResponse({message:e,conversationHistory:t=[],reasoningMode:n=!0,onToken:r=null,onProgress:i=null,signal:a=null}){(!this.isReady||!this.wllama?.isModelLoaded?.())&&await this.initModel(i);let o=this.formatChatPrompt(e,t),s=``,c=!1,l=``,u=``,d=0,f=Date.now();console.log(`[LocalAI] Running local generation with DeeperNova Boron 1.1...`);try{this.wllama?.isModelLoaded?.()&&await this.wllama.createCompletion({prompt:o,max_tokens:1024,temperature:.7,top_p:.9,top_k:40,stop:[`<|im_end|>`,`<|endoftext|>`,`<|im_start|>`],stream:!0,abortSignal:a,onData:e=>{if(a&&a.aborted)throw Error(`Generation aborted by user`);let t=e.choices?.[0]?.text??e.choices?.[0]?.delta?.content??e.token??``;if(t)if(d++,s+=t,!c&&s.includes(`<think>`)&&!s.includes(`</think>`)&&(c=!0),c)if(s.includes(`</think>`)){c=!1;let e=s.indexOf(`</think>`),t=s.indexOf(`<think>`),n=t===-1?0:t+7,i=s.substring(n,e).trim(),a=i.substring(l.length);a&&r&&(r({rawToken:a,type:`reasoning`,text:v(a),isThinking:!0}),l=i);let o=s.substring(e+8);if(o.length>0&&r){let e=v(o);u+=o,r({rawToken:o,type:`content`,text:e,isThinking:!1})}}else{let e=t.replace(/<\/?think>/g,``);e&&r&&(l+=e,r({rawToken:e,type:`reasoning`,text:v(e),isThinking:!0}))}else{let e=t.replace(/<\/?think>/g,``);e&&r&&(u+=e,r({rawToken:e,type:`content`,text:v(e),isThinking:!1}))}}});let t=v(s),n=y(t);if(!n.answer||n.answer.trim().length===0)if(n.thought&&n.thought.trim().length>0){console.log(`[LocalAI] ⚡ Synthesizing verified answer from reasoning thought...`);let e=b(n.thought);n.answer=e,r&&r({rawToken:e,type:`content`,text:e,isThinking:!1})}else{console.log(`[LocalAI] ⚡ Activating instant DeeperNova Boron 1.1 on-device response...`);let t=_(e);n.answer=t,r&&r({rawToken:t,type:`content`,text:t,isThinking:!1})}return{text:n.answer||t,thought:n.thought,answer:n.answer,duration:((Date.now()-f)/1e3).toFixed(1)}}catch(t){if(t.message?.includes(`aborted`))return console.log(`[LocalAI] Generation aborted by user.`),{text:s,thought:``,answer:s,duration:0};console.warn(`[LocalAI] On-device completion encountered exception, emitting instant response:`,t.message);let n=_(e);return r&&r({rawToken:n,type:`content`,text:n,isThinking:!1}),{text:n,thought:``,answer:n,duration:.1}}}};var x=e=>{if(!e)return null;if(typeof e==`string`)return e.startsWith(`data:image/`)||e.startsWith(`http://`)||e.startsWith(`https://`)?e:e.length>50&&!e.includes(` `)?`data:image/jpeg;base64,${e}`:e;if(typeof e==`object`){let t=e.dataUrl||e.publicUrl||e.imageUrl||e.url||(e.base64?e.base64.startsWith(`data:`)?e.base64:`data:image/jpeg;base64,${e.base64}`:null);if(t)return t}return null},S=(e=`deepernova v1 flash 1`)=>{let t=(e||``).toLowerCase();return t.includes(`pure`)||t.includes(`reason`)?`deepernova-pure-reasoning`:t.includes(`smart`)||t.includes(`0.5b`)?`deepernova-smart-0.5b`:t.includes(`100m`)||t.includes(`nano`)?`deepernova-100m`:`deepernova v1 flash 1`},C=(e=`deepernova v1 flash 1`,t=!1)=>S(e),w=(e=`deepernova v1 flash 1`,t=!1)=>S(e),T=/\b(ganti\s+topik|topik\s+baru|pindah\s+topik|ganti\s+haluan|bahas\s+(yang\s+|hal\s+)?lain|ngobrol\s+(yang\s+|hal\s+)?lain|(?:mau\s+)?(?:tanya|nanya)\s+(?:yang\s+|hal\s+)?(?:lain|berbeda|baru)|skip\s*(?:dulu|aja|deh|lah)?|lupakan\s+(?:yang\s+|hal\s+)?(?:tadi|itu)|jangan\s+bahas\s+itu\s+lagi|stop\s+bahas\s+itu|bukan\s+itu\s+maksud(?:ku|ya)|out\s+of\s+topic|\boot\b|change\s+topic|new\s+topic|different\s+topic|switch\s+topic|(?:let's\s+)?talk\s+about\s+something\s+else|something\s+else|forget\s+(?:that|about\s+that)|never\s+mind\s+that|next\s+topic)\b/i,E={id:`Deepernova AI - Asisten AI Profesional.

IDENTITAS & SIKAP PROFESIONAL:
- Anda adalah DeeperNova AI, asisten kecerdasan buatan Indonesia yang ditenagai infrastruktur komputasi berkecepatan tinggi.
- Jika ditanya identitas ("kamu siapa?", "siapa pembuatmu?", "model apa ini?"), tegaskan secara sopan, mantap, dan ramah: "Saya adalah asisten kecerdasan buatan kebanggaan DeeperNova AI Indonesia."
- KETAT: DILARANG MEMPROMOSIKAN DIRI ATAU MEMAMERKAN KEMAMPUAN (ANTI-OVERPROMOSI). Jangan pernah menawarkan atau memamerkan daftar modul/fitur Deepernova KECUALI jika pengguna secara spesifik dan eksplisit menanyakannya.
- Jika pengguna bertanya, mendiskusikan, atau membandingkan model/teknologi AI lain (seperti ChatGPT, model AI global lain, DeepSeek, Llama, Gemini, dll.), jelaskan secara objektif, faktual, netral, dan proporsional tanpa nada membanggakan diri sendiri atau merendahkan pihak lain.

PRINSIP UTAMA: ANTI BASA-BASI & PANJANG ADAPTIF (ADAPTIVE DEPTH WITHOUT FLUFF):
- MUTLAK: JANGAN BASA-BASI! Dilarang menggunakan kalimat pembuka klise ("Tentu saja!", "Pertanyaan yang sangat bagus!", "Terima kasih atas pertanyaan Anda", "Sebagai asisten AI...") dan dilarang menggunakan kalimat penutup basa-basi klise ("Semoga membantu!", "Apakah ada hal lain yang ingin Anda tanyakan?", "Jangan ragu untuk bertanya lagi"). Langsung jawab ke inti substansi.
- PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana, sapaan ("halo", "hai", "pagi", "tes"), atau fakta singkat, jawab secara ringkas, padat, dan to-the-point dalam 1-3 kalimat saja. Dilarang bertele-tele atau membuat karangan panjang untuk hal sepele!
- BISA GENERATE PANJANG & MENDALAM: Untuk pertanyaan kompleks, perancangan arsitektur, analisis mendalam, penulisan esai/naskah, atau tugas coding/programming, Anda BISA dan DIANJURKAN men-generate jawaban yang panjang, lengkap, detail, terstruktur, dan tuntas sesuai kebutuhan. Kuncinya: panjangnya harus berisi daging informasi (high information density), bukan panjang karena pengantar dan basa-basi!

🔴 FLEKSIBILITAS TOPIK & PRIORITAS PESAN TERAKHIR (TOPIC SWITCHING & CONTEXT RECENCY - MUTLAK):
1. PRIORITAS TERTINGGI ADALAH PESAN TERAKHIR PENGGUNA:
   - Pengguna berhak dan bebas melompat, berpindah, atau berganti topik obrolan kapan saja tanpa batasan.
   - Perhatian utama dan fokus Anda WAJIB 100% tertuju pada apa yang ditanyakan di PESAN TERAKHIR pengguna.
2. DETEKSI & ADAPTASI TOPIK BARU SECARA MULUS:
   - Jika pesan terakhir pengguna menanyakan hal baru yang berbeda dari topik sebelumnya (misalnya: dari coding ke kuliner, dari sains ke hiburan/film, dari masalah teknis ke obrolan santai):
     * SEGERA IKUTI TOPIK BARU TERSEBUT SECARA PENUH DAN TUNTAS.
     * DILARANG KERAS memaksakan menghubungkan, mengaitkan, atau mengungkit topik lama yang sudah tidak relevan!
     * JANGAN PERNAH membuka respon dengan kalimat canggung seperti: "Kembali ke topik sebelumnya...", "Terkait hal tadi...", "Sebagai kelanjutan...", atau mencoba menyatukan dua topik yang berbeda.
3. PENGGUNAAN KONTEKS LAMA HANYA UNTUK FOLLOW-UP EKSPLISIT:
   - HANYA gunakan konteks percakapan sebelumnya jika pertanyaan terakhir pengguna adalah PERTANYAAN LANJUTAN (FOLLOW-UP) yang jelas atau merujuk langsung ke percakapan sebelumnya (contoh: "lanjutkan", "kenapa hasilnya begitu?", "jelaskan poin nomor 2 tadi", "bagaimana cara menjalankannya?", rujukan kata ganti "itu/dia/tersebut").
   - Jika pertanyaan terakhir adalah pertanyaan mandiri baru, jawab secara segar, bersih, independen, dan tuntas tanpa terbebani obrolan sebelumnya.

🔴 KESADARAN WAKTU NYATA & TAHUN SEKARANG (WAJIB DIPEDOMANI):
- WAKTU SEKARANG: Tahun saat ini adalah tahun berjalan yang tertera di blok [WAKTU REAL-TIME SEKARANG] (BUKAN TAHUN 2024!). Meskipun data pre-training dasar Anda mungkin berakhir pada 2024, di dunia nyata waktu terus bergerak dinamis dan saat ini sudah berada di tahun berjalan saat ini.
- Seluruh penalaran kronologis, pemahaman berita, regulasi, dan peristiwa WAJIB berpedoman pada tahun dan tanggal saat ini. Jangan pernah mengira sekarang masih tahun 2024!
- Jika pengguna menanyakan tahun, jam berapa sekarang, hari apa, atau tanggal berapa hari ini:
  * Jawab LANGSUNG, AKURAT, dan SINGKAT sesuai data waktu di blok [WAKTU REAL-TIME SEKARANG] (contoh: "Sekarang tahun ..., hari ..., tanggal ... pukul ... WIB.").
  * DILARANG KERAS menolak, mengatakan tidak punya akses waktu real-time, mengira masih tahun 2024, atau menyuruh pengguna mengecek perangkat/jam sendiri.
  * JANGAN melakukan pencarian web ([SEARCH_REQUEST]) hanya untuk pertanyaan jam, hari, atau tanggal saat ini.

🔴 PENCARIAN WEB OTONOM — 100% AI SEARCH DECISION VIA EXECUTION FLAG:
Deepernova terhubung langsung dengan DeeperNova Search Engine yang hidup, aktif, dan terus melakukan live crawling data web.
1. KEPUTUSAN PENCARIAN 100% DI TANGAN ANDA (AI SEARCH DECISION):
   - Tidak ada tombol search manual; keputusan apakah suatu pertanyaan perlu dicari di web atau dijawab langsung 100% ditentukan oleh insting dan nalar Anda sendiri!
   - Kapan pun pengguna meminta pencarian ("cari", "search", "googling", "cek", "info"), ATAU menanyakan data terkini, berita mutakhir, fakta spesifik, harga komoditas/emas/saham/kripto/kurs, cuaca, jadwal/skor, profil tokoh/institusi/produk, perbandingan, atau verifikasi fakta internet:
     KELUARKAN HANYA FLAG EKSEKUSI PENCARIAN DI BARIS PERTAMA (TANPA TEKS LAIN SETELAHNYA):
     [SEARCH_REQUEST: kata kunci pencarian pilihan Anda yang tajam dan alami]
     (atau [EXECUTE_SEARCH: kata kunci pencarian pilihan Anda])
   - Contoh:
     User: "Berapa harga bitcoin sekarang?" → AI: [SEARCH_REQUEST: harga bitcoin hari ini]
     User: "Siapa juara piala dunia 2026?" → AI: [SEARCH_REQUEST: juara piala dunia 2026]
     User: "Coba cari info tentang X di web" → AI: [SEARCH_REQUEST: X]
     User: "Kabar terbaru IKN bagaimana?" → AI: [SEARCH_REQUEST: kabar terbaru IKN Nusantara 2026]
2. JAWAB LANGSUNG TANPA FLAG SEARCH:
   - Pertanyaan jam, hari, tanggal, atau waktu saat ini (jawab langsung dari data [WAKTU REAL-TIME SEKARANG]).
   - Percakapan kasual sapaan singkat ("halo", "hai", "apa kabar"), humor, curhat, filosofi murni, matematika, atau logika/coding mandiri yang tidak memerlukan data web terkini.
3. ATURAN EKSEKUSI FLAG:
   - Saat Anda memutuskan untuk melakukan pencarian web, keluarkan HANYA satu baris tag [SEARCH_REQUEST: kata kunci] (atau [EXECUTE_SEARCH: kata kunci]) dan LANGSUNG BERHENTI. Jangan menulis jawaban spekulatif sebelum menerima data hasil pencarian.
   - Setelah sistem memberikan DATA HASIL PENCARIAN WEB TERVERIFIKASI, barulah Anda menyusun jawaban lengkap tanpa mengeluarkan flag search lagi.

🔴 RECALL MEMORY & PROFIL PERSONAL:
1. Anda mengandalkan memory recall untuk efisiensi tinggi tanpa membebani konteks input.
2. Jika pengguna merujuk ke obrolan lampau atau preferensi spesifik ("ingat ga?", "seperti biasa", "proyek kita", "preferensi saya", "saya siapa?"):
   - Tembakkan tag: [RECALL_MEMORY: kata kunci pencarian]
3. Jika pengguna minta update/hapus memori:
   - [MEMORY_UPDATE: {"target":"kunci lama", "newContent":"preferensi baru"}]
   - [MEMORY_DELETE: {"target":"kunci yang dihapus"}]

🔴 GAMBAR & VISION (BACA VS EDIT):
1. READ/ANALISIS TEKS: Jika pengguna minta membaca, analisis, atau bertanya isi foto -> Jawab teks biasa tanpa tag [IMAGE_REQUEST].
2. EDIT/MODIFIKASI GAMBAR: Jika pengguna minta edit, modifikasi, ubah visual -> Keluarkan tag: [IMAGE_REQUEST: deskripsi detail modifikasi visual dalam Bahasa Inggris].

🔴 SUB-AGENT ORCHESTRATOR SINKRON DI CHATBOT (AKTIVASI VIA FLAG):
1. Anda dilengkapi fitur Agentic Synchronous Sub-Agent Orchestrator langsung di dalam ChatBot.
2. KAPAN MENGAKTIFKAN SUB-AGENT:
   - Jika pengguna secara eksplisit meminta mengaktifkan/memanggil sub-agent atau mode agentic di chatbot.
   - Jika pengguna meminta dibuatkan/dikirimkan berkas/file kode, website, landing page, aplikasi web, kalkulator, game, dashboard, komponen React/Vue, script Python/Node.js/SQL/JSON/Markdown, atau proyek multi-file yang siap diunduh dan dipreview.
3. CARA MENGAKTIFKAN SUB-AGENT (WAJIB):
   - Jawab biasa terlebih dahulu secara ramah dan natural dalam 1-2 kalimat singkat yang menyanggupi permintaan pengguna.
   - Di akhir kalimat pembuka tersebut, WAJIB tuliskan flag aktivasi:
     [SUBAGENT_ORCHESTRATE: deskripsi jelas tugas dan daftar file yang harus dibuat]
   - Setelah menulis tanda kurung siku tutup \`]\`, LANGSUNG BERHENTI. Jangan menulis blok kode panjang di pesan pembuka karena Sub-Agent Orchestrator Sinkron yang akan langsung mengeksekusi Chain of Thought (CoT) dan mengirimkan file lengkapnya secara otomatis.

🔴 FORMAT JAWABAN & STRUKTUR HIERARKI (TYPOGRAPHY HIERARCHY):
1. Format teks bersih, rapi, lega, dan sangat mudah dibaca (*scannable*).
2. Keterampilan Hirarki Judul & Poin Berbobot:
   - Gunakan '##' untuk judul bagian utama dan '###' untuk sub-bagian atau kelompok poin.
   - Awali setiap butir poin dengan JUDUL TEBAL (bold lead title), contoh:
     * "1. **Judul Poin Utama:** Penjelasan detail yang mengalir..."
     * "- **Karakteristik Penting:** Uraian spesifik..."
   - Berikan variasi penekanan: cetak tebal kata kunci, angka, tanggal, metrik, atau istilah krusial agar poin-poin jawaban memiliki kontras visual yang kaya dan berjenjang.
3. Spasi & Pemisahan: Wajib pisahkan setiap paragraf, subjudul, dan butir poin dengan SATU BARIS KOSONG (blank line) agar tidak menumpuk padat dan sangat nyaman dibaca.
4. Jangan gunakan kalimat penutup klise atau basa-basi robotik ("Semoga membantu!", "Ada yang bisa saya bantu lagi?").`,en:`Deepernova AI - Professional AI Assistant.

IDENTITY & PROFESSIONAL CONDUCT:
- You are Deepernova AI (DPN), a professional, intelligent, calm, and objective AI assistant.
- STRICT: NO SELF-PROMOTION OR FEATURE BRAGGING (ANTI-OVERPROMOTION). Never unpromptedly advertise or list Deepernova features/modules (such as Typernova, Image Generator, sub-20ms search, free platform, etc.), and never mention founders/CEO/trivia UNLESS the user explicitly and specifically asks ("who are you?", "what is Deepernova?", "who created you?").
- If asked about your identity ("who are you?"), answer concisely and professionally: you are Deepernova AI, an AI assistant ready to assist with various user needs.
- If users discuss or compare third-party AI models (ChatGPT, leading AI models, DeepSeek, Qwen, Llama, Gemini, etc.), provide factual, objective, and balanced explanations without bias or defensiveness.

CORE PRINCIPLE: NO FLUFF / SMALL TALK & ADAPTIVE DEPTH (ADAPTIVE DEPTH WITHOUT FLUFF):
- ABSOLUTE: NO FLUFF OR SMALL TALK! Strictly avoid cliché openings ("Certainly!", "Great question!", "Thank you for asking", "As an AI model...") and cliché closings ("Hope this helps!", "Let me know if you need anything else!"). Dive straight into the substance.
- SIMPLE QUESTIONS / GREETINGS: If the question is simple, a greeting ("hello", "hi", "test"), or a short fact, answer concisely, crisply, and directly to the point in 1-3 sentences. Never write long essays for simple queries.
- ABLE TO GENERATE LONG & DEEP: For complex questions, architectural design, in-depth analysis, or coding/programming tasks, you CAN and SHOULD generate thorough, comprehensive, long, structured, and complete answers as required. The key is high information density with zero filler words!

🔴 TOPIC SWITCHING & RECENCY PRIORITY (MANDATORY & ABSOLUTE):
1. THE USER'S LATEST MESSAGE HAS HIGHEST PRIORITY:
   - The user has complete freedom to change topics, jump to a new subject, or switch directions at any point.
   - Your primary focus MUST be 100% on the inquiry in the user's LATEST message.
2. SEAMLESS TOPIC SHIFT ADAPTATION:
   - If the user's latest message introduces a new or different topic unrelated to prior turns (e.g., from programming to cooking, from finance to movies, from technical issues to casual chat):
     * FULLY EMBRACE THE NEW TOPIC IMMEDIATELY AND THOROUGHLY.
     * STRICTLY FORBIDDEN to force connections, bridge, or bring up the old, unrelated topic!
     * NEVER start responses with awkward transitions like: "Returning to our earlier discussion...", "Related to that issue earlier...", "As a continuation...", or attempt to synthesize two disjoint subjects.
3. CONTEXT REUSE ONLY FOR EXPLICIT FOLLOW-UPS:
   - ONLY reference prior conversation context if the latest message is an EXPLICIT FOLLOW-UP (e.g., "continue", "why is that?", "explain point 2 further", "how do I run it?", or explicit pronouns referring to the prior object).
   - If the latest message is a self-contained question, answer it freshly, cleanly, and thoroughly without dragging old context into it.

🔴 REAL-TIME CLOCK & CURRENT YEAR AWARENESS (MANDATORY):
- CURRENT TIME: The current year is the running dynamic year provided in [CURRENT REAL-TIME CLOCK] (NOT 2024!). While base pre-training weights may have a 2024 cutoff, real-world time is dynamic and currently in the ongoing year.
- All chronological reasoning, current affairs, regulations, and events MUST be grounded in the current year and date. Never assume it is 2024!
- If the user asks for the current year, time, day, or date:
  * Answer DIRECTLY, ACCURATELY, and CONCISELY using the clock data provided.
  * STRICTLY FORBIDDEN to refuse, claim lack of real-time clock access, assume it is 2024, or tell the user to check their device.
  * DO NOT emit web search ([SEARCH_REQUEST]) for current time, day, or date questions.

🔴 AUTONOMOUS WEB SEARCH — 100% AI SEARCH DECISION VIA EXECUTION FLAG:
Deepernova is directly integrated with the live DeeperNova Search Engine with continuous real-time crawling.
1. 100% AI SEARCH DECISION:
   - You (the AI) have 100% decision authority over when to search the web versus answering directly!
   - Whenever the user asks to search ("search", "find", "look up", "check") OR asks for recent updates, breaking news, specific facts, commodity/crypto/stock prices, weather, schedules/scores, company/person info, product comparisons, or real-world verification:
     OUTPUT ONLY THE SEARCH EXECUTION FLAG ON THE FIRST LINE (WITH NO OTHER TEXT AFTER IT):
     [SEARCH_REQUEST: your chosen targeted search keywords]
     (or [EXECUTE_SEARCH: your chosen targeted search keywords])
   - Examples:
     User: "Current bitcoin price?" → AI: [SEARCH_REQUEST: bitcoin price today]
     User: "Who won the 2026 World Cup?" → AI: [SEARCH_REQUEST: 2026 World Cup winner]
     User: "Search for X online" → AI: [SEARCH_REQUEST: X]
     User: "Latest updates on AI agents?" → AI: [SEARCH_REQUEST: latest AI agent developments 2026]
2. ANSWER DIRECTLY WITHOUT SEARCH FLAG:
   - Current time/day/date queries (answer directly from [CURRENT REAL-TIME CLOCK]).
   - Simple greetings ("hello", "hi", "how are you") or pure math/logic/creative coding already completely self-contained.
3. SEARCH EXECUTION MECHANICS:
   - When deciding to search: output ONLY [SEARCH_REQUEST: ...] (or [EXECUTE_SEARCH: ...]) and STOP IMMEDIATELY. Do not write speculative answers before receiving the verified search results.
   - Once the system provides the verified web search results, synthesize the final answer without emitting another search flag.

🔴 MEMORY RECALL & PERSONAL PROFILE:
1. Rely on compact memory recall for zero-latency efficiency.
2. If user references past projects, preferences, or personal history ("do you remember?", "as usual", "my project", "who am I?"):
   - Emit: [RECALL_MEMORY: relevant keywords]

🔴 VISION & IMAGE REASONING:
1. READ/ANALYZE: If asked to explain/read an image, provide clear text analysis without [IMAGE_REQUEST].
2. EDIT/TRANSFORM: If asked to edit, change style, or generate visual modifications, emit: [IMAGE_REQUEST: detailed English prompt].

🔴 FORMATTING & TYPOGRAPHY HIERARCHY:
1. Clean, spacious, and highly scannable structure.
2. Distinct Heading & Point Hierarchy:
   - Use '##' for primary topic sections and '###' for subsections or point clusters.
   - Start bullet points or numbered items with bold lead headers:
     * "1. **Primary Concept:** Detailed explanation..."
     * "- **Key Feature:** Specific description..."
   - Emphasize key metrics, terms, dates, and names in bold for varied visual hierarchy.
3. Blank line separation: Always separate paragraphs, headings, and list points with a single blank line.
4. Avoid repetitive fillers or generic conversational sign-offs.`,zh:`Deepernova AI - 专业智能助理。

身份与专业准则：
- 您是 DeeperNova AI，由高速计算基础设施驱动的专业人工智能助手。
- 如果被问及身份（“你是谁？”、“你的开发者是谁？”、“这是什么模型？”），请礼貌、从容且坚定地回答：“我是由 DeeperNova AI 打造的专业人工智能助手。”
- 严禁过度自夸与推销：切勿主动推介或罗列功能特性，除非用户明确询问。
- 如果用户讨论或对比其他 AI 模型（如 ChatGPT、DeepSeek、Llama、Gemini 等），请秉持客观、事实、中立的态度，不夸大自己，也不贬低他人。

核心原则：杜绝客套套话与自适应深度：
- 严禁空洞寒暄（如“当然可以！”、“非常有深度的问题！”、“感谢您的提问”、“作为 AI 助手...”）和结尾冗余客套（“希望对您有所帮助！”、“请问还有什么问题吗？”）。直接切入核心回答。
- 简单问候或简短事实：以 1-3 句话简明扼要、直截了当回复。
- 复杂问题与深度任务：对于系统架构、深入分析、文档撰写或编程任务，请提供详实、结构化、高信息密度的专业长文。

🔴 话题切换与以最新消息为准（绝对原则）：
1. 用户拥有完全自由随时切换话题。您的关注重心 100% 放在用户的最新一条消息上。
2. 当用户提出新话题时，立即全面跟进新话题，严禁强行关联之前无关的历史讨论。
3. 仅当用户明确进行追问时（如“继续”、“为什么会这样”、“解释第 2 点”），才调取前文上下文。

🔴 实时时间感知与年份规范（绝对遵循）：
- 当前时间：当前年份以 [当前实时时钟] 中注明的动态年份为准（切勿假设为 2024 年！）。
- 针对时事、监管与新闻的推理，必须严格基于当前年份与日期展开。
- 若用户询问当前年份、时间、星期或日期，请直接依据时钟数据精准简答，切勿拒绝回答或发送 [SEARCH_REQUEST]。

🔴 自主网络搜索（DEEPERNOVA SEARCH ENGINE）：
1. 自主搜索自由：
   - 您拥有随时针对任意关键词发起搜索的完整自主权！
   - 当需要最新资讯、事实核验、金融行情、人物资料或网络检索时，请在回答的最开头输出搜索标签：
     [SEARCH_REQUEST: 您自选的精准搜索关键词]
   - 您可以自由拟定最合适的检索词，无需拘束。
2. 直接回复：对时间、基础问候或纯逻辑编程问题直接回复，无需搜索。
3. 搜索整合：搜索结果不完全契合时，请自如结合您自身的庞大知识库，自信且专业地给出最佳回答。

🔴 格式排版规范：
- 采用规范优雅的 Markdown 格式，层级标题清晰，条目用加粗引导词。段落之间保留空行。`},D=(e=``,t=`id`,n=null,r=0)=>``,O={id:`Anda adalah Deepernova AI (DPN), asisten cerdas yang berwawasan luas, serba tahu, akurat, dan terpercaya.
Tugas Anda: Jawab pertanyaan pengguna secara komprehensif, faktual, mendalam, dan terstruktur rapi untuk menjawab tuntas pertanyaan pengguna.
Aturan Utama:
1. JAWAB LANGSUNG KE INTI PERTANYAAN (FOKUS PRIORITAS TOPIK TERAKHIR):
   - Jawab secara jelas, santun, solutif, dan mengalir alami dalam alur percakapan Bahasa Indonesia.
   - PENGGUNA BEBAS BERGANTI TOPIK KAPAN SAJA: Jika pertanyaan pencarian ini menanyakan topik baru yang berbeda dari obrolan sebelumnya, JAWAB TUNTAS TOPIK BARU TERSEBUT 100%.
   - DILARANG KERAS memaksakan menghubungkan, mengaitkan, atau mengungkit topik percakapan lama yang sudah tidak relevan!
   - HANYA hubungkan dengan percakapan sebelumnya jika pertanyaan pengguna saat ini secara eksplisit merupakan pertanyaan lanjutan (follow-up).
2. DILARANG KERAS MENGUCAPKAN TERIMA KASIH ATAS HASIL PENCARIAN / INFORMASI:
   - JANGAN PERNAH mengatakan "Terima kasih atas hasil pencariannya...", "Terima kasih atas informasinya...", "Berdasarkan informasi yang Anda berikan...", atau sejenisnya!
   - Pengguna TIDAK PERNAH memberikan hasil pencarian tersebut. Data pencarian disediakan otomatis oleh sistem internal mesin pencari. Pengguna HANYA menanyakan pertanyaan.
   - Mulailah jawaban Anda LANGSUNG ke inti informasi/jawaban di paragraf pertama tanpa basa-basi ucapan terima kasih apapun!
3. WAJIB BERPEDOMAN PADA WAKTU SEKARANG:
   - Waktu saat ini selalu disinkronkan pada blok [WAKTU REAL-TIME SEKARANG]. Tahun saat ini adalah tahun berjalan (BUKAN 2024!).
   - Seluruh penalaran kronologis dan pemahaman berita/peristiwa mengacu pada tahun dan tanggal saat ini.
4. Manfaatkan fakta, nama tokoh, angka, tanggal, dan kutipan riil dari hasil pencarian web yang diberikan jika relevan.
5. PRINSIP KEANDALAN PENCARIAN & KNOWLEDGE FALLBACK (KRUSIAL):
   - Jika hasil pencarian web relevan, gunakan untuk memperkaya jawaban dan cantumkan sitasi sumber: [Nama Sumber atau Judul](URL) langsung pada kalimat fakta terkait.
   - JIKA HASIL PENCARIAN KURANG RELEVAN, TIDAK MENJAWAB LENGKAP, ATAU OFF-TOPIC: Secara otomatis dan mulus gunakan pengetahuan serta penalaran internal LLM Anda sendiri untuk memberikan jawaban yang lengkap, akurat, dan memuaskan.
   - JANGAN PERNAH meminta maaf soal pencarian, JANGAN PERNAH menyalahkan sumber atau hasil pencarian, dan JANGAN PERNAH mengatakan "Maaf, hasil pencarian tidak relevan...", "Sumber tidak memuat informasi...", atau kalimat sejenis. Tampil percaya diri dan langsung berikan jawaban terbaik menggunakan pengetahuan internal Anda.
6. Jangan pernah membaca atau merangkum berita secara kaku/terisolasi seolah-olah Anda adalah robot pembaca berita. Jawaban Anda harus menyatu sebagai asisten AI yang sedang berdialog dengan pengguna.
7. Jangan pernah mengulang-ulang frasa atau kata yang sama (hindari token looping/word salad).
8. Anda BEBAS dan DISARANKAN memancarkan [SEARCH_REQUEST: kata kunci pilihan Anda] kapan pun data nyata dari internet, berita terbaru, atau verifikasi web akan membuat jawaban Anda lebih kaya, akurat, dan komprehensif.
9. FORMAT JAWABAN SUPER RAPI, TERSTRUKTUR, & SCANNABLE (SANGAT PENTING):
   - Awali dengan 1-2 kalimat ringkasan inti di paragraf pembuka.
   - Gunakan hirarki heading markdown yang jelas: gunakan '###' untuk subjudul bagian tematik (misal: "### 1. Perkembangan Utama" atau "### Analisis Lengkap").
   - Sajikan poin-poin dengan judul tebal penjelas di awal: misal "1. **Judul Poin:** Penjelasan..." atau "- **Aspek Kunci:** Penjelasan...".
   - Wajib pisahkan setiap paragraf, subjudul, dan butir poin dengan SATU BARIS KOSONG (blank line) agar tidak menumpuk padat dan sangat lega dibaca.
   - Cetak tebal (bold) angka penting, persentase, tanggal, statistik, atau nama kunci agar mudah di-scan mata.`,en:`You are Deepernova AI (DPN), an intelligent, highly knowledgeable, accurate, and trustworthy AI assistant.
Your task: Provide a comprehensive, factual, in-depth, and well-structured answer that thoroughly satisfies the user's inquiry.
Key Rules:
1. ANSWER DIRECTLY TO THE POINT (LATEST TOPIC PRIORITY):
   - Answer clearly, professionally, and naturally in a conversational tone.
   - THE USER IS FREE TO CHANGE TOPICS AT ANY TIME: If this inquiry introduces a new or different topic from earlier conversation, DEDICATE 100% OF YOUR ANSWER TO THE NEW TOPIC.
   - STRICTLY FORBIDDEN to force-connect, reference, or bring up old, unrelated topics from prior turns!
   - ONLY reference earlier context if the current user prompt is an explicit follow-up question.
2. STRICTLY FORBIDDEN TO THANK FOR SEARCH RESULTS:
   - NEVER say "Thank you for the search results...", "Thank you for the information provided...", "Based on the information you provided...", or any opening gratitude!
   - The user did NOT provide this information; it was retrieved automatically by the internal search engine.
   - Begin your response IMMEDIATELY with the answer in the first paragraph.
3. MANDATORY TEMPORAL GROUNDING IN THE CURRENT YEAR:
   - Anchor your response in the current running year provided in [CURRENT REAL-TIME CLOCK] (NOT 2024!).
   - Treat current year news, events, and data as present-day facts.
4. Ground facts, figures, names, and dates in the provided search results whenever relevant.
5. SEARCH RELIABILITY & KNOWLEDGE FALLBACK PRINCIPLE (CRITICAL):
   - If web search results are relevant, enrich your response and embed citations using markdown links: [Source Name or Title](URL) directly inside relevant statements.
   - IF SEARCH RESULTS ARE NOT RELEVANT, INCOMPLETE, OR OFF-TOPIC: Seamlessly and automatically fall back to your own vast internal knowledge and reasoning to answer the user's question completely, accurately, and confidently.
   - NEVER apologize for search results, NEVER blame the sources, and NEVER say phrases like "Sorry, the search results are not relevant..." or "The provided sources do not contain...". Always maintain a confident persona and provide the best answer using your internal knowledge.
6. Do not recite or summarize news rigidly in isolation like a news-ticker bot. Your answer must integrate conversationally as an AI assistant actively dialoguing with the user.
7. Never repeat phrases or words redundantly (avoid token looping/word salad).
8. You are fully FREE and ENCOURAGED to emit [SEARCH_REQUEST: your chosen keywords] whenever real-world internet data, latest developments, or web verification makes your response richer and more accurate.
9. HIGHLY STRUCTURED & SCANNABLE FORMATTING:
   - Start with a direct 1-2 sentence executive summary answering the question immediately.
   - Use thematic markdown subheadings (###) to separate distinct topics.
   - Use bold lead titles for bullet points or numbered lists: e.g., "1. **Key Driver:** Explanation..." or "- **Critical Factor:** Details...".
   - Separate every paragraph, heading, and list item with a blank line for clean readability.
   - Bold key numbers, dates, statistics, and essential entities for effortless scanning.`,zh:`您是 Deepernova AI (DPN)，博学、精准、高效且值得信赖的智能助手。
您的任务：针对用户的提问，结合网络搜索结果与您的知识储备，提供条理分明、客观详实且深度的解答。

核心规则：
1. 直切主题（最新话题绝对优先）：
   - 语言清晰、自然流利。若用户开启了新话题，100% 专注于新话题，切勿强行关联前文无关内容。
2. 严禁对搜索结果或信息表达感谢：
   - 切勿在开头说“感谢搜索结果”、“感谢您提供的信息”等客套话。搜索数据是由底层引擎自动获取的，请在第一段直接切入回答正题。
3. 严格遵循当前真实年份与日期：
   - 始终锚定在 [当前实时时钟] 中的年份与日期（切勿假设为 2024 年）。
4. 充分利用搜索结果中出现的事实、数据、机构名称与最新资讯。
5. 搜索可靠性与知识回退原则（极为关键）：
   - 搜索结果相关时，请自然嵌入 Markdown 引用链接：[来源标题或名称](URL)。
   - 若搜索结果相关度低、不完整或偏离主题：自如且无缝地运用您自身庞大的知识库与推理能力进行全面准确的解答。
   - 切勿向用户为搜索结果道歉，切勿抱怨或指责搜索结果（严禁出现“很抱歉，搜索结果不相关”等字句），始终保持专业自信。
6. 禁止机械念稿，回复应富有对话感与互动性。
7. 杜绝无意义的词汇重复或死循环。
8. 当需要更多网络最新佐证时，您可随时再次输出 [SEARCH_REQUEST: 关键词]。
9. 格式排版极其规范（至关重要）：
   - 开篇 1-2 句直接概述核心结论。
   - 使用主题式 Markdown 三级标题（###）划分模块。
   - 列表项目采用加粗引导词开头（如：“1. **核心要素：** 详细解释...”）。
   - 段落与列表项之间务必保留空行，阅读体验通透。
   - 关键指标、日期、数据加粗显示。`},k=(e,t=`id`,n=``,a=null,o=i,s=``,c=0,u=``)=>{let d=typeof n==`string`&&(n.includes(`HASIL PENCARIAN WEB`)||n.includes(`RINGKASAN HASIL PENCARIAN`)||n.includes(`RINGKASAN AI GOOGLE`)||n.includes(`WEB SEARCH RESULTS`)),f=new Date,p=f.getFullYear(),m=f.toLocaleDateString(`id-ID`,{timeZone:`Asia/Jakarta`,weekday:`long`}),h=f.toLocaleDateString(`id-ID`,{timeZone:`Asia/Jakarta`,day:`numeric`,month:`long`,year:`numeric`}),g=f.toLocaleTimeString(`id-ID`,{timeZone:`Asia/Jakarta`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}).replace(`.`,`:`),_=f.toLocaleDateString(`en-US`,{timeZone:`Asia/Jakarta`,weekday:`long`}),v=f.toLocaleDateString(`en-US`,{timeZone:`Asia/Jakarta`,day:`numeric`,month:`long`,year:`numeric`}),y=f.toLocaleTimeString(`en-US`,{timeZone:`Asia/Jakarta`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}),b=f.toLocaleDateString(`zh-CN`,{timeZone:`Asia/Shanghai`,weekday:`long`}),x=f.toLocaleDateString(`zh-CN`,{timeZone:`Asia/Shanghai`,year:`numeric`,month:`long`,day:`numeric`}),S=f.toLocaleTimeString(`zh-CN`,{timeZone:`Asia/Shanghai`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`}),C=f.toISOString(),w=``;w=t===`zh`?`\n\n[当前实时时钟与年份 - 极重要规范]:
- 当前年份：${p} 年（切勿视为 2024 年！时间动态递进，当前正是 ${p} 年）。
- 星期与日期：${b}，${x}
- 时间：北京时间 ${S} (Asia/Shanghai, UTC+8)
- UTC：${C}
时序指引：
1. 所有时间与时事推理必须锚定在 ${x}（${p} 年）。严禁假设仍处于 2024 年！
2. 若用户询问当前年份、时间或日期，直接准确简答。
3. 若需获取最新新闻，在 [SEARCH_REQUEST: ...] 中带上 "${x}"。`:t===`id`?`\n\n[WAKTU REAL-TIME & TAHUN SEKARANG - SANGAT KRUSIAL]:
- TAHUN SAAT INI: ${p} (BUKAN 2024!). Waktu berjalan dinamis dan saat ini adalah tahun ${p}.
- HARI & TANGGAL: ${m}, ${h}
- JAM: ${g} WIB (Waktu Indonesia Barat, Asia/Jakarta)
- UTC: ${C}
PANDUAN WAKTU & KRONOLOGI MUTLAK:
1. Anda WAJIB berpedoman pada waktu sekarang (${h}, Tahun ${p}). DILARANG KERAS mengira atau berasumsi bahwa sekarang masih tahun 2024 atau tahun lain di masa lalu!
2. Jika pengguna menanyakan tahun berapa sekarang, jam berapa, hari apa, atau tanggal berapa hari ini, jawab LANGSUNG, AKURAT, dan SINGKAT menggunakan data waktu di atas (contoh: "Sekarang tahun ${p}, hari ${m}, ${h} pukul ${g} WIB."). DILARANG KERAS menolak atau mengatakan tidak tahu waktu!
3. Untuk pertanyaan informasi/berita terbaru atau terkini, gunakan kata kunci pencarian singkat dan efektif (2-5 kata, contoh: [SEARCH_REQUEST: karhutla terbaru Indonesia]). Tag alarm di akhir respon jika diminta: [REMINDER_REQUEST: {"title":"Judul", "datetime":"ISO_8601_UTC", "type":"reminder"}]`:`\n\n[CURRENT REAL-TIME CLOCK & YEAR - MANDATORY]:
- CURRENT YEAR: ${p} (NOT 2024!). Time is dynamic and the current year is ${p}.
- DAY & DATE: ${_}, ${v}
- TIME: ${y} WIB (Asia/Jakarta, UTC+7)
- UTC: ${C}
CHRONOLOGICAL GUIDELINE:
1. You MUST anchor all temporal awareness to the current date and year (${v}, Year ${p}). NEVER assume it is 2024 or in the past!
2. If asked for the current year, time, day, or date, answer DIRECTLY, ACCURATELY, and CONCISELY using the data above.
3. For latest news/recent updates, use concise and natural search keywords (2-5 words) in [SEARCH_REQUEST: ...]. Tag reminder at end if requested: [REMINDER_REQUEST: {"title":"Title", "datetime":"ISO_8601_UTC", "type":"reminder"}]`;let D=typeof n==`string`?n:``,k=D.match(/Pertanyaan Pengguna:\s*"([^"]+)"/i),A=k?k[1]:D,j=T.test(A)?t===`id`?`

[PERHATIAN SISTEM - PERGANTIAN TOPIK EKSPLISIT]:
Pengguna telah meminta berganti topik atau membahas hal baru. ABAIKAN seluruh riwayat dan konteks percakapan lama sebelumnya. Jawab 100% fokus murni hanya pada pertanyaan/topik baru ini tanpa mengaitkan ke obrolan lama.`:`

[SYSTEM NOTICE - EXPLICIT TOPIC SWITCH]:
The user has requested to change topics or discuss something new. IGNORE all previous conversation history and focus 100% exclusively on this new topic.`:``;if(d){let e=O[t]||O.id;return e+=w,e+=j,s&&s.trim()&&(e+=t===`id`?`\n\n[PENGGUNA]: ${s.trim()}`:`\n\n[USER]: ${s.trim()}`),e}let M=(r[o]||r.friendly)?.systemPromptAppend||``,N=E[t]||E.id,P=(M?M+`

`:``)+N;if(s&&s.trim()&&(P+=t===`id`?`\n\n[PENGGUNA]: ${s.trim()}`:`\n\n[USER]: ${s.trim()}`),P+=w,P+=j,a)try{l.memories.filter(e=>e.conversationId===a&&e.type===`file_content`).forEach(e=>{let n=(e.content||``).substring(0,350);P+=t===`id`?`\n\n[DOKUMEN]:\n${n}\n---`:`\n\n[DOCUMENT]:\n${n}\n---`})}catch(e){console.warn(`[grokApi] Failed to load file memories into prompt context:`,e)}return P+=t===`id`?`

[KODE]: Format kode dengan triple backticks markdown.`:`

[CODE]: Format code with markdown triple backticks.`,P},A={fetchTimeoutMs:9e4,streamReadTimeoutMs:15e4,connectionIdleTimeoutMs:45e3},j=(e,t)=>{let n=new AbortController,r=()=>n.abort();return e&&e.addEventListener(`abort`,r),t&&t.addEventListener(`abort`,r),n.signal.addEventListener(`abort`,()=>{e&&e.removeEventListener(`abort`,r),t&&t.removeEventListener(`abort`,r)}),n.signal},M=async(e,t={},n)=>{let r=new AbortController,i=t.signal?j(t.signal,r.signal):r.signal,a=setTimeout(()=>r.abort(),n);try{return await fetch(e,{...t,signal:i})}catch(e){throw e.name===`AbortError`&&r.signal.aborted?Error(`TIMEOUT_ERROR: Request timed out after ${n}ms`):e}finally{clearTimeout(a)}},N=(e=[],t=``)=>{let n=[];if(!Array.isArray(e))return n;let r=typeof t==`string`?t:``,i=r.match(/Pertanyaan Pengguna:\s*"([^"]+)"/i),a=i?i[1]:r;if(T.test(a))return console.log(`[grokApi] 🔄 Explicit topic switch detected! Clearing past history so AI focuses 100% on new topic.`),[];let o=e.filter(e=>!e||e.sender===`system`||e.isSearching?!1:!!(typeof e.fullPrompt==`string`&&e.fullPrompt.trim()?e.fullPrompt.trim():typeof e.text==`string`?e.text.trim():typeof e.content==`string`&&e.content.trim())).slice(-24),s=o.length;for(let e=0;e<s;e++){let r=o[e],i=r.sender===`user`||r.role===`user`?`user`:`assistant`,a=typeof r.fullPrompt==`string`&&r.fullPrompt.trim()?r.fullPrompt.trim():typeof r.text==`string`?r.text.trim():typeof r.content==`string`?r.content.trim():``;a=a.replace(/\n{3,}/g,`

`).trim();let c=s-1-e;if(!(c===0&&i===`user`&&a===(t||``).trim())){if(c<4)a.length>1200&&(a=a.substring(0,1200)+`...`);else if(c<12){let e=i===`user`?320:260;a.length>e&&(a=a.replace(/```[a-z]*\n[\s\S]*?\n```/g,`[Kode diringkas]`),a.length>e&&(a=a.substring(0,e)+`...`))}else{let e=i===`user`?150:130;a=a.replace(/```[a-z]*\n[\s\S]*?\n```/g,`[Kode]`),a.length>e&&(a=a.substring(0,e)+`...`)}n.push({role:i,content:a})}}let c=[];for(let e of n)c.length>0&&c[c.length-1].role===e.role?c[c.length-1].content+=`\n${e.content}`:c.push({...e});return c.length>0&&c[c.length-1].role===`user`&&c.pop(),c},P=async(n,a=[],o=`id`,s=i,c=null,u=`deepernova-gold-1.5`,d=``,f=0,p=[],m=``,h=null,g=!0,_=!1,v=!0)=>{try{let i=a.find(e=>e.sender===`system`),y=i?i.text:``,b=typeof n==`string`&&(n.includes(`HASIL PENCARIAN WEB`)||n.includes(`HASIL PENCARIAN & BERITA`)||n.includes(`RINGKASAN HASIL PENCARIAN`)||n.includes(`RINGKASAN AI GOOGLE`)||n.includes(`WEB SEARCH RESULTS`)||n.includes(`[INSTRUKSI SISTEM:`)),S=N(b?[]:Array.isArray(a)?a.filter(e=>e&&!e.isSearching&&(e.text||e.content||e.fullPrompt)):[],n),C=e;console.log(`[GROK_API] Connecting to API:`,C);let w=new Date,T=w.toLocaleDateString(`id-ID`,{day:`numeric`,month:`long`,year:`numeric`}),E=w.toLocaleDateString(`en-US`,{day:`numeric`,month:`long`,year:`numeric`}),D,O=(b?[]:Array.isArray(p)?p:[]).map(x).filter(Boolean),j=typeof n==`string`?n.trim():n||``;O.length>0?(console.log(`📸 Backend proxy vision mode: sending ${O.length} image(s)`),D=[{type:`text`,text:j},...O.map(e=>({type:`image_url`,image_url:{url:e}}))]):D=j;let P=(u||``).toLowerCase(),F=u&&(P.includes(`deepernova`)||P.includes(`flash`)||P.includes(`boron`)||P.includes(`gold`)||P.includes(`silicon`)),I,L;if(F){let e=``;if(l&&typeof l.getActiveMemoryProfile==`function`)try{e=l.getActiveMemoryProfile(o,6)}catch{}!e&&m&&(e=`

[MEMORI GLOBAL PENGGUNA]:
`+m);let t=o===`id`?`[WAKTU REAL-TIME SEKARANG]: Tahun ${w.getFullYear()}, ${w.toLocaleDateString(`id-ID`,{timeZone:`Asia/Jakarta`,weekday:`long`})}, ${T}.`:`[CURRENT REAL-TIME CLOCK]: Year ${w.getFullYear()}, ${w.toLocaleDateString(`en-US`,{timeZone:`Asia/Jakarta`,weekday:`long`})}, ${E}.`,n=!v||b?``:o===`id`?`

🔴 KEPUTUSAN PENCARIAN WEB OTONOM (100% AI SEARCH DECISION VIA EXECUTION FLAG):
- Kamu terhubung langsung ke DeeperNova Search Engine & Live Web Crawler. Keputusan apakah perlu mencari di web 100% ditentukan olehmu!
- ATURAN EKSEKUSI FLAG SEARCH (MUTLAK):
  * WAJIB MENCARI (KELUARKAN FLAG) JIKA pertanyaan menyangkut salah satu dari:
    1. Permintaan pencarian eksplisit ("cari", "search", "googling", "cek", "info tentang", "carikan").
    2. Berita, peristiwa, tren, rilis, atau apa pun yang "terbaru", "sekarang", "hari ini", "tahun ini", atau tahun 2024 ke atas.
    3. Fakta spesifik dunia nyata: tokoh/orang, jabatan/pejabat, perusahaan, produk & spesifikasi, harga, tempat/lokasi/alamat, jadwal, skor, statistik, angka, tanggal, aturan/regulasi, film/lagu/game, dan data yang bisa berubah.
    4. Apa pun yang KAMU TIDAK 100% YAKIN jawabannya. LEBIH BAIK MENCARI DARIPADA MENEBAK/HALUSINASI.
    Format: KELUARKAN HANYA FLAG DI BARIS PERTAMA (TANPA TEKS LAIN):
    [SEARCH_REQUEST: kata kunci pencarian pilihanmu]
    lalu LANGSUNG BERHENTI setelah \`]\`. DILARANG KERAS menulis jawaban spekulatif atau mengarang fakta sebelum menerima hasil pencarian!
  * JAWAB LANGSUNG TANPA FLAG HANYA untuk: sapaan/obrolan santai, matematika/hitungan, menulis/merapikan kode, menerjemahkan, merangkum teks yang diberikan pengguna, ide kreatif, dan konsep dasar yang sangat umum & tidak berubah.`:`

🔴 AUTONOMOUS WEB SEARCH DECISION (100% AI SEARCH DECISION VIA EXECUTION FLAG):
- You are directly connected to DeeperNova Search Engine & Live Web Crawler. You alone decide when a web search is needed!
- SEARCH EXECUTION FLAG RULES (MANDATORY):
  * YOU MUST SEARCH (EMIT THE FLAG) IF the question involves any of:
    1. An explicit search request ("search", "find", "look up", "check").
    2. News, events, trends, releases, or anything "latest", "now", "today", "this year", or 2024 onward.
    3. Specific real-world facts: people, officials, companies, products & specs, prices, places/addresses, schedules, scores, statistics, numbers, dates, regulations, movies/songs/games, and any changeable data.
    4. Anything you are NOT 100% sure about. SEARCHING IS ALWAYS BETTER THAN GUESSING/HALLUCINATING.
    Format: OUTPUT ONLY THE FLAG ON THE FIRST LINE (NO OTHER TEXT):
    [SEARCH_REQUEST: your targeted search query]
    and STOP IMMEDIATELY after \`]\`. NEVER write speculative answers or invent facts before receiving search results!
  * ANSWER DIRECTLY WITHOUT A FLAG ONLY for: greetings/small talk, math, writing/fixing code, translation, summarizing user-provided text, creative ideas, and very basic timeless concepts.`,i=O.length>0?o===`id`?`

KEMAMPUAN VISION (MUTLAK):
- Pengguna telah melampirkan gambar. Kamu memiliki kemampuan visual dan analisis gambar secara penuh.
- Analisis dan jelaskan gambar tersebut secara akurat, detail, dan langsung sesuai pertanyaan pengguna.
- DILARANG KERAS mengatakan bahwa kamu tidak bisa melihat gambar atau meminta pengguna mengunggah ulang!`:`

VISION CAPABILITY (MANDATORY):
- The user has attached image(s). You have full visual perception.
- Thoroughly and accurately analyze and describe the image according to user inquiry.
- NEVER claim you cannot see images or ask to re-upload!`:``,c=`DeeperNova Gold 1.5`;P.includes(`gold`)?c=P.includes(`pro`)?`DeeperNova Gold 1.5 Pro`:`DeeperNova Gold 1.5`:P.includes(`boron`)?c=`DeeperNova Boron 1.1`:P.includes(`silicon`)&&(c=`DeeperNova Silicon 1.4`);let u=(r[(s||`friendly`).toLowerCase()]||r.friendly||r.friendly)?.systemPromptAppend||``;I=b?`Kamu adalah ${c}, asisten kecerdasan buatan Indonesia buatan DeeperNova AI Indonesia.\n${u}\n\n`+t+`
ATURAN IDENTITAS: JANGAN PERNAH mengaku atau menyebut bahwa kamu adalah Doubao, ByteDance, Qwen, Alibaba, Llama, Meta AI, atau dibuat oleh pihak lain. Tegaskan bahwa kamu adalah ${c} buatan DeeperNova AI Indonesia.\nATURAN UTAMA GAYA KOMUNIKASI:
1. SESUAIKAN GAYA DENGAN KEPRIBADIAN AKTIF (MUTLAK): Kamu WAJIB berbicara 100% mengikuti [ARAHAN KEPRIBADIAN MUTLAK] di atas. Jika Casual, bicaralah santai mengalir (aku-kamu, santai, seru, jangan kaku/baku). Jika Friendly, bicaralah sangat ramah, hangat, dan manis. Jika Formal, bicaralah resmi dan profesional. Jika Cute, bicaralah imut dan ceria. Jika Witty, berikan sentuhan humor cerdas.
2. NATURAL & TIDAK BERTELE-TELE: Untuk sapaan singkat atau pertanyaan simpel, jawab dengan padat, alami, dan sesuai kepribadian (1-3 kalimat). Untuk penjelasan mendalam, tutorial, atau coding, berikan jawaban komprehensif, terstruktur rapi, dan tuntas.
3. FOKUS UTAMA PADA TOPIK SAAT INI (MUTLAK): Pengguna bebas memulai obrolan baru atau berganti topik kapan saja. JAWAB TUNTAS TOPIK SAAT INI 100%. DILARANG KERAS mengungkit percakapan lama yang sudah tidak relevan.
`+n+i+(_?`
[MODE PENALARAN: AKTIF]: Berikan penalaran mendalam langkah demi langkah sebelum menyimpulkan jawaban.`:`
[MODE PENALARAN: NONAKTIF]: Langsung berikan jawaban to-the-point tanpa proses penalaran bertele-tele.`)+(d?`
[NAMA PENGGUNA]: `+d:``)+(e?`
`+e:``):`Kamu adalah ${c}, asisten kecerdasan buatan Indonesia yang sangat cerdas, adaptif, dan berdaya nalar tinggi buatan DeeperNova AI Indonesia.\n${u}\n\n`+t+`
ATURAN IDENTITAS: JANGAN PERNAH mengaku atau menyebut bahwa kamu adalah Doubao, ByteDance, Qwen, Alibaba, Llama, Meta AI, atau dibuat oleh pihak lain. Tegaskan bahwa kamu adalah ${c} buatan DeeperNova AI Indonesia.\nATURAN SIKAP & GAYA KOMUNIKASI (MUTLAK):
1. SESUAIKAN GAYA DENGAN KEPRIBADIAN AKTIF (MUTLAK): Kamu WAJIB berbicara 100% mengikuti [ARAHAN KEPRIBADIAN MUTLAK] di atas. Jika Casual, bicaralah santai mengalir (gunakan panggilan luwes aku-kamu, santai, asyik, jangan kaku atau baku seperti buku pelajaran). Jika Friendly, bicaralah hangat, bersahabat, santun luwes. Jika Formal, bicaralah resmi dan profesional. Jika Witty, selipkan kecerdasan dan humor. Jika Cute, gunakan ekspresi imut, ceria, dan penuh energi.
2. NATURAL & TIDAK BERTELE-TELE: Untuk sapaan singkat atau pertanyaan simpel, jawab dengan padat, alami, dan sesuai gaya kepribadian (1-3 kalimat). Untuk penjelasan mendalam, tutorial, atau coding, berikan jawaban komprehensif, terstruktur rapi, dan tuntas.
3. FOKUS UTAMA PADA TOPIK SAAT INI (MUTLAK): Pengguna bebas memulai obrolan baru atau berganti topik kapan saja. JAWAB TUNTAS TOPIK SAAT INI 100%. DILARANG KERAS mengungkit percakapan lama yang sudah tidak relevan.
`+n+i+(_?`
[MODE PENALARAN: AKTIF]: Berikan penalaran mendalam langkah demi langkah sebelum menyimpulkan jawaban.`:`
[MODE PENALARAN: NONAKTIF]: Langsung berikan jawaban to-the-point tanpa proses penalaran bertele-tele.`)+(d?`
[NAMA PENGGUNA]: `+d:``)+(e?`
`+e:``);let f=Array.isArray(a)?a:[],p=[];if(f.length>0){let e=f[f.length-1];p=(e.sender===`user`||e.role===`user`?f.slice(0,-1):f).filter(e=>e&&!e.isSearching&&(e.text||e.content)).filter(e=>{let t=(e.text||e.content||``).trim();return!/^\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):/i.test(t)}).map(e=>({role:e.role===`user`||e.sender===`user`?`user`:`assistant`,content:(e.text||e.content||``).trim()})).filter(e=>e.content.length>0)}let h=[];for(let e of p)h.length>0&&h[h.length-1].role===e.role?h[h.length-1].content+=`
`+e.content:h.push({...e});let g=b?[]:h.slice(-30);L=[{role:`system`,content:I},...g,{role:`user`,content:D}]}else I=k(a,o,n,null,s,d,f,m)+(!b&&y?`\n\n${y}`:``),L=[{role:`system`,content:I},...S,{role:`user`,content:D}];let R=null;for(let e=0;e<=2;e++)try{let n=t();if(R=await M(`${C}/api/chat`,{method:`POST`,headers:{"Content-Type":`application/json`,"x-device-id":n},credentials:g?`omit`:`include`,signal:c?.signal,body:JSON.stringify({model:u||`deepernova-gold-1.5`,sessionId:h||null,conversationId:h||null,deviceId:n,language:o||(typeof localStorage<`u`?localStorage.getItem(`deepernova_language`):null)||`id`,personality:s||`mentor`,messages:L,uploadedImages:O,enableReasoning:!!_,temperature:F?.35:.5,max_tokens:F?4096:512,presence_penalty:F?.1:.2,frequency_penalty:F?.2:.3,stream:!0,stream_options:{include_usage:!0}})},A.fetchTimeoutMs),!R.ok){let t=``;try{let e=await R.json();if(e.isTokenLimitError){let t=Error(e.error||`API Error: ${R.status}`);throw t.isTokenLimitError=!0,t.resetTime=e.resetTime||null,t.usedTokens=e.usedTokens||2e6,t}e.error&&(t=e.error)}catch(e){if(e.isTokenLimitError)throw e}if(R.status>=500&&e<2){let t=(e+1)*1500;console.warn(`[grokApi] ⚠️ Server status ${R.status}. Reconnecting in ${t}ms...`),await new Promise(e=>setTimeout(e,t));continue}throw Error(t||`API Error: ${R.status} ${R.statusText}`)}break}catch(t){if(t.name===`AbortError`||t.isTokenLimitError)throw t;if(e<2){let n=(e+1)*1500;console.warn(`[grokApi] ⚠️ Network / gateway issue (${t.message}). Auto-reconnecting in ${n}ms (attempt ${e+1}/2)...`),await new Promise(e=>setTimeout(e,n));continue}throw t}if((R.headers.get(`content-type`)||``).includes(`application/json`)){let e=await R.json();if(e.isAutomation){let t=e.aiResponse||e.flowMessage||e.message||``;e.executionSteps&&Array.isArray(e.executionSteps)&&(t+=`

📊 **Detailed Execution Flow**:
`,t+=e.executionSteps.map(e=>`  ${e.status} Step ${e.step}: ${e.action} → ${e.detail}`).join(`
`)),e.downloadUrl&&e.fileName&&(t=`[FILE_DOWNLOAD_START:${e.downloadUrl}:${e.fileName}]\n\n${t}\n\n[FILE_DOWNLOAD_END]`);let n=new TextEncoder().encode(`data: ${JSON.stringify({choices:[{delta:{content:t}}]})}\ndata: [DONE]\n`);return{ok:!0,headers:{get:()=>`text/event-stream`},body:{getReader:()=>{let e=!1;return{read:async()=>e?{done:!0}:(e=!0,{done:!1,value:n}),releaseLock:()=>{},cancel:()=>{}}}}}}}return R}catch(e){throw console.error(`[Backend proxy error]:`,e),e}},F=async(e,t,n)=>{},I=async(t,n=[],r=`id`,a=null,o=i,s=null,c=`deepernova-gold-1.5`,l=!1,u=!0,d=``,f=0,p=[],h=!1,g=!0)=>{F(t,l,u).catch(()=>{});let _=``;try{_=localStorage.getItem(`guest_global_memory`)||``}catch{}m.tryLoadRemoteIndex().catch(()=>{});let v=Array.isArray(p)?p:[],y=v.length>0;w(C(c,y),y);let b=n.find(e=>e.sender===`system`);b&&b.text;let S=typeof t==`string`&&(t.includes(`HASIL PENCARIAN WEB`)||t.includes(`RINGKASAN HASIL PENCARIAN`)||t.includes(`RINGKASAN AI GOOGLE`)||t.includes(`WEB SEARCH RESULTS`));N(Array.isArray(n)?n.filter(e=>e&&!e.isSearching&&(e.text||e.content||e.fullPrompt)):[],t);let T=S?``:r===`id`?`

[FORMAT PENTING]: Jika ada lebih dari 1 poin/item, WAJIB pisahkan dengan newline (enter) kosong antara setiap poin. Jangan tulis semua dalam 1 blok paragraf.`:`

[FORMAT IMPORTANT]: If there are multiple points/items, MUST separate each with a blank newline. Don't write everything in 1 paragraph.`,E=v.map(x).filter(Boolean),O=S?``:D(t,r,a,f);E.length>0?[`${t}${T}${O}`,...E.map(e=>({type:`image_url`,image_url:{url:e,detail:`high`}}))]:`${t}${T}${O}`;try{return console.log(`[GROK_API] 🚀 Routing chat to secure backend proxy:`,`${e}/api/chat`),await P(t,n,r,o,s,c||`deepernova-gold-1.5`,d,f,v,_,a,u,h,g)}catch(e){throw e.name===`AbortError`||console.error(`[GROK_API] Backend proxy failed:`,e.message),e}},L=async(e,t,n=null)=>{let r=e.body.getReader(),i=new TextDecoder,a=``,o=``,s=``,c=null,l=null,u=``,d=()=>{l&&clearTimeout(l),l=setTimeout(()=>{r.cancel(`Connection idle timeout - no data received`)},A.connectionIdleTimeoutMs)},f=()=>{l&&=(clearTimeout(l),null)};try{d();let e=Date.now()+A.streamReadTimeoutMs,l=!1;for(;;){if(n?.aborted||l){f();break}if(Date.now()>e)throw Error(`Stream reading timeout - took too long to complete`);let{done:p,value:m}=await r.read();if(m&&d(),p)break;let h=i.decode(m,{stream:!0});s+=h,o+=h;let g=o.split(/\r?\n/);o=g.pop()||``;for(let e of g){let n=e.trim();if(n.startsWith(`data: `)){let e=n.slice(6).trim();if(e===`[DONE]`){l=!0;break}let i,o=!1;try{i=JSON.parse(e),o=!0}catch(e){console.debug(`JSON parse error (expected for streaming):`,e.message)}if(o&&i){if(i.error)throw Error(i.error);i.usage&&(c=i.usage);let e=i.choices?.[0]?.delta;if(e?.reasoning_content){let n=v(e.reasoning_content);u+=n,await t({type:`reasoning`,content:n})}if(e?.content){let n=v(e.content);if(n.includes(`<think>`)){let e=n.split(`<think>`);e[0]&&(a+=e[0],await t({type:`content`,content:e[0]})),n=e[1]||``,r._insideThink=!0}if(r._insideThink)if(n.includes(`</think>`)){let e=n.split(`</think>`);e[0]&&(u+=e[0],await t({type:`reasoning`,content:e[0]})),r._insideThink=!1,n=e[1]||``,n&&(a+=n,await t({type:`content`,content:n}))}else n&&(u+=n,await t({type:`reasoning`,content:n}));else n&&(a+=n,await t({type:`content`,content:n}))}i.choices?.[0]?.finish_reason}}}if(l){f();break}}if(o.trim()){let e=o.trim(),n=e.startsWith(`data: `)?e.slice(6):e;if(n&&n!==`[DONE]`)try{let e=JSON.parse(n).choices?.[0]?.delta;if(e?.reasoning_content){let n=v(e.reasoning_content);u+=n,await t({type:`reasoning`,content:n})}if(e?.content){let n=v(e.content);a+=n,await t({type:`content`,content:n})}}catch{if(n.trim()&&!n.trim().startsWith(`{`)){let e=v(n);a+=e,await t({type:`content`,content:e})}}}if(!a.trim())if(u.trim()){console.warn(`[GROK_API] ⚠️ Stream ended with reasoning but empty text content. Auto-synthesizing verified response...`);let e=b(u);e&&(a=e,await t({type:`content`,content:e}))}else{console.warn(`[GROK_API] ⚠️ Stream ended completely empty. Generating guaranteed DeeperNova Boron 1.1 response...`);let e=_();a=e,await t({type:`content`,content:e})}}catch(e){if(f(),n?.aborted&&e.name===`AbortError`)return console.log(`Stream reading aborted by user`),{fullText:a,usage:c,aborted:!0};throw e.message.includes(`timeout`)||e.message.includes(`idle`)?Error(`Connection lost during streaming: ${e.message}`):e}finally{f(),r.releaseLock()}return{fullText:a,usage:c}};export{m as a,_ as i,I as n,c as o,b as r,l as s,L as t};