import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cleanCodeBlock, detectLanguage } from '../utils/codeHighlight';
import { applyFuzzyPatch, formatLineNumberedWindow, generateUnifiedDiff, createSnapshot, rollbackSnapshot } from '../utils/fuzzyDiffPatcher';
import { validateCodeFile } from '../utils/linterRunner';
import { sendAgenticMessage } from '../services/grokApi';
import { AgenticTaskChainView } from './AgenticTaskChainView';
import './CodeDanceIDE.css';

// Monaco Loader Helper (Loads official Microsoft Monaco Editor)
let monacoPromise = null;
const loadMonaco = () => {
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.monaco) {
      resolve(window.monaco);
      return;
    }
    const vsPath = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs';
    if (typeof window !== 'undefined' && window.require && typeof window.require.config === 'function') {
      window.require.config({ paths: { vs: vsPath } });
      window.require(['vs/editor/editor.main'], () => {
        resolve(window.monaco);
      });
      return;
    }
    const loaderScript = document.createElement('script');
    loaderScript.src = `${vsPath}/loader.min.js`;
    loaderScript.onload = () => {
      window.require.config({ paths: { vs: vsPath } });
      window.require(['vs/editor/editor.main'], () => {
        resolve(window.monaco);
      });
    };
    document.body.appendChild(loaderScript);
  });
  return monacoPromise;
};

const getMonacoLanguage = (fileName) => {
  const ext = (fileName || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': case 'htm': return 'html';
    case 'css': return 'css';
    case 'js': case 'jsx': case 'mjs': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'py': case 'python': return 'python';
    case 'json': return 'json';
    case 'sql': return 'sql';
    case 'md': case 'markdown': return 'markdown';
    case 'sh': case 'bash': return 'shell';
    case 'xml': case 'svg': return 'xml';
    case 'yaml': case 'yml': return 'yaml';
    default: return 'plaintext';
  }
};

// ANSI color escape sequences parser for clean terminal formatting
const renderAnsiText = (text) => {
  if (!text) return null;
  if (typeof text !== 'string') return text;
  if (!text.includes('\x1b[')) return text;

  const parts = text.split(/(\x1b\[[0-9;]*m)/g);
  let currentColor = '';
  let isBold = false;

  const elements = [];
  parts.forEach((part, index) => {
    if (part.startsWith('\x1b[')) {
      if (part === '\x1b[0m') {
        currentColor = '';
        isBold = false;
      } else if (part === '\x1b[31m') {
        currentColor = '#f87171'; // Red
      } else if (part === '\x1b[32m') {
        currentColor = '#4ade80'; // Green
      } else if (part === '\x1b[33m') {
        currentColor = '#fbbf24'; // Yellow
      } else if (part === '\x1b[34m') {
        currentColor = '#60a5fa'; // Blue
      } else if (part === '\x1b[35m') {
        currentColor = '#f472b6'; // Magenta
      } else if (part === '\x1b[36m') {
        currentColor = '#38bdf8'; // Cyan
      } else if (part === '\x1b[90m') {
        currentColor = '#94a3b8'; // Gray
      } else if (part === '\x1b[1m') {
        isBold = true;
      }
      return;
    }

    if (part) {
      elements.push(
        <span 
          key={index} 
          style={{ 
            color: currentColor || undefined, 
            fontWeight: isBold ? 700 : undefined 
          }}
        >
          {part}
        </span>
      );
    }
  });

  return elements.length > 0 ? elements : text;
};

// ============================================================
// VS CODE STARTER PROJECT & HIERARCHICAL TREE ENGINE
// ============================================================
const DEFAULT_STARTER_FILES = [
  {
    name: 'src/App.jsx',
    content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-slate-800/90 backdrop-blur border border-slate-700 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 font-bold">
          ⚛️
        </div>
        <h1 className="text-2xl font-bold tracking-tight">CodeDance React App</h1>
        <p className="text-slate-400 text-sm mt-1">Deepernova Cloud Studio (VS Code Engine)</p>

        <div className="my-6 p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-300 font-medium">State Counter:</span>
          <span className="text-xl font-bold text-blue-400 font-mono">{count}</span>
        </div>

        <button
          onClick={() => setCount(c => c + 1)}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/25"
        >
          Tambah Hitungan (+1)
        </button>
      </div>
    </div>
  );
}
`
  },
  {
    name: 'src/index.css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
}
`
  },
  {
    name: 'public/index.html',
    content: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeDance App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
`
  },
  {
    name: 'package.json',
    content: `{
  "name": "codedance-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
`
  },
  {
    name: 'README.md',
    content: `# 🚀 CodeDance Studio Project

Selamat datang di lingkungan Cloud-Native Coding VS Code Deepernova.
- Edit berkas di \`src/App.jsx\`
- Tekan **Live Preview** untuk melihat hasil seketika.
- Gunakan **AI Agent** untuk mengoding otomatis!
`
  }
];

export const getFileIconInfo = (name, isFolder = false, isOpen = false) => {
  if (isFolder) {
    return { icon: isOpen ? '📂' : '📁', color: '#dcb67a' };
  }
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jsx':
    case 'tsx':
      return { icon: '⚛️', color: '#61dafb' };
    case 'js':
    case 'mjs':
      return { icon: '📜', color: '#f7df1e' };
    case 'ts':
      return { icon: '📘', color: '#3178c6' };
    case 'html':
    case 'htm':
      return { icon: '🌐', color: '#e34f26' };
    case 'css':
    case 'scss':
      return { icon: '🎨', color: '#1572b6' };
    case 'py':
      return { icon: '🐍', color: '#3776ab' };
    case 'json':
      return { icon: '📦', color: '#cbcb41' };
    case 'md':
      return { icon: '📝', color: '#42a5f5' };
    case 'svg':
    case 'png':
    case 'jpg':
      return { icon: '🖼️', color: '#a855f7' };
    default:
      return { icon: '📄', color: '#cccccc' };
  }
};

export const buildFileTree = (filesList = [], emptyFolders = []) => {
  const root = { name: '', path: '', type: 'folder', children: [] };

  // 1. Add all empty folders
  emptyFolders.forEach(folderPath => {
    const parts = folderPath.split('/').filter(Boolean);
    let current = root;
    let currPath = '';
    for (const part of parts) {
      currPath = currPath ? `${currPath}/${part}` : part;
      let child = current.children.find(c => c.name === part && c.type === 'folder');
      if (!child) {
        child = { name: part, path: currPath, type: 'folder', children: [] };
        current.children.push(child);
      }
      current = child;
    }
  });

  // 2. Add all files
  filesList.forEach(file => {
    const parts = file.name.split('/').filter(Boolean);
    let current = root;
    let currPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currPath = currPath ? `${currPath}/${part}` : part;
      const isFile = (i === parts.length - 1);

      if (isFile) {
        current.children.push({
          name: part,
          path: file.name,
          type: 'file',
          content: file.content
        });
      } else {
        let child = current.children.find(c => c.name === part && c.type === 'folder');
        if (!child) {
          child = { name: part, path: currPath, type: 'folder', children: [] };
          current.children.push(child);
        }
        current = child;
      }
    }
  });

  // 3. Sort children: folders first, then files alphabetically
  const sortNodes = (node) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    node.children.forEach(child => {
      if (child.type === 'folder') sortNodes(child);
    });
  };

  sortNodes(root);
  return root.children;
};

export const CodeDanceIDE = ({ user, isAuthenticated = false, onNavigate }) => {
  // Project & File state
  const [projectName, setProjectName] = useState('My-Deepernova-App');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [files, setFiles] = useState(DEFAULT_STARTER_FILES);
  const [activeFileName, setActiveFileName] = useState('src/App.jsx');
  const [openTabs, setOpenTabs] = useState(['src/App.jsx', 'src/index.css']);
  const [dirtyFiles, setDirtyFiles] = useState(new Set());

  // Hierarchical Folder Tree state
  const [emptyFolders, setEmptyFolders] = useState(['src', 'public']);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src', 'public']));
  const [isExplorerRootExpanded, setIsExplorerRootExpanded] = useState(true);
  const [renamingPath, setRenamingPath] = useState(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [creatingItemInFolder, setCreatingItemInFolder] = useState(null); // { folderPath: 'src', type: 'file' | 'folder' }
  const [newItemName, setNewItemName] = useState('');

  // UI state
  const [activeActivity, setActiveActivity] = useState('files'); // 'files' | 'ai' | 'cloud' | 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState('terminal'); // 'terminal' | 'output'

  // Preferences
  const [theme, setTheme] = useState('vs-dark'); // 'vs-dark' | 'white-orange' | 'vs-light'
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);
  const [wordWrap, setWordWrap] = useState('on');

  // Cloud & Execution state
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('Synced');
  const [cloudProjects, setCloudProjects] = useState([]);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [executionOutput, setExecutionOutput] = useState('');

  // Embedded Live Preview state (Desktop & Mobile split view)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewReloadKey, setPreviewReloadKey] = useState(0);
  const [mobileActiveTab, setMobileActiveTab] = useState('editor'); // 'editor' | 'preview' | 'terminal' | 'ai'

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'system', text: '\x1b[36m🌌 Deepernova Cloud Sandbox Terminal v2.5\x1b[0m \x1b[32m[● Connected to Cloud Sandbox]\x1b[0m' },
    { type: 'system', text: '\x1b[90m⚡ Real Subprocess Shell: Node.js & Python | Max Timeout: 10 Menit (600s)\x1b[0m' },
    { type: 'system', text: '\x1b[90m📁 Direktori Proyek Aktif. Mendukung instalasi npm, skrip python, pembuatan file disk, dsb.\x1b[0m\n' }
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalCommandIndex, setTerminalCommandIndex] = useState(-1);
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const commandHistoryRef = useRef([]);
  const terminalAbortCtrlRef = useRef(null);

  // Agentic Living Tasks State (Cursor Composer / Windsurf Style)
  const [tasks, setTasks] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isFlowRunning, setIsFlowRunning] = useState(false);
  const [agentActionStatus, setAgentActionStatus] = useState('');
  const [highlightNotification, setHighlightNotification] = useState('');

  // Editor cursor & Monaco instance
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const monacoContainerRef = useRef(null);
  const monacoEditorInstanceRef = useRef(null);
  const isInternalUpdateRef = useRef(false);
  const terminalEndRef = useRef(null);
  const terminalInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const currentAbortCtrlRef = useRef(null);
  const filesRef = useRef(files);

  // Keep filesRef always updated with latest files state
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Auto-scroll AI task history whenever tasks, steps, or status change
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [tasks, agentActionStatus, isFlowRunning]);

  const handleCancelTask = () => {
    if (currentAbortCtrlRef.current) {
      currentAbortCtrlRef.current.abort();
      showNotification('⏹ Eksekusi task dihentikan');
    }
  };

  const handleRevertFile = (filePath) => {
    const prevContent = rollbackSnapshot(filePath);
    if (prevContent !== null) {
      setFiles(prev => prev.map(f => f.name === filePath ? { ...f, content: prevContent } : f));
      if (activeFileName === filePath && monacoEditorInstanceRef.current) {
        isInternalUpdateRef.current = true;
        monacoEditorInstanceRef.current.setValue(prevContent);
        isInternalUpdateRef.current = false;
      }
      showNotification(`↺ Snapshot berkas "${filePath}" dipulihkan`);
    } else {
      showNotification(`⚠️ Tidak ada snapshot lama untuk "${filePath}"`);
    }
  };

  const activeFile = useMemo(() => {
    return files.find(f => f.name === activeFileName) || files[0] || { name: 'untitled.txt', content: '' };
  }, [files, activeFileName]);

  const activeFileLang = useMemo(() => {
    return detectLanguage(activeFile.content, activeFile.name.split('.').pop());
  }, [activeFile]);

  // Cloud Folder Explorer (Management Office Style)
  const [isCloudExplorerOpen, setIsCloudExplorerOpen] = useState(false);
  const [explorerSearchTerm, setExplorerSearchTerm] = useState('');
  const [selectedCloudFolder, setSelectedCloudFolder] = useState(null);
  const [selectedCloudFile, setSelectedCloudFile] = useState(null);
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [allCloudRawFiles, setAllCloudRawFiles] = useState([]);
  const [currentExplorerView, setCurrentExplorerView] = useState('all'); // 'all' | 'folders' | 'files'
  const [currentDrillFolder, setCurrentDrillFolder] = useState(null);
  const [isSyncingExplorer, setIsSyncingExplorer] = useState(false);

  // Load cloud projects & Management Office folders on mount
  useEffect(() => {
    fetchCloudProjects();
  }, [user]);

  // Refetch when explorer modal opens
  useEffect(() => {
    if (isCloudExplorerOpen) {
      fetchCloudProjects();
    }
  }, [isCloudExplorerOpen]);

  const fetchCloudProjects = async () => {
    setIsSyncingExplorer(true);
    try {
      const currentOwner = (user?.email || 'authenticated@deepernova.com').toLowerCase().trim();
      const userKey = `deepernova_cloud_files_${currentOwner}`;

      // 1. Gather all local files and folders from Management Office keys
      let localItems = [];
      try {
        const userStored = localStorage.getItem(userKey);
        if (userStored) localItems = [...localItems, ...JSON.parse(userStored)];
        const companyStored = localStorage.getItem('deepernova_cloud_company_shared');
        if (companyStored) localItems = [...localItems, ...JSON.parse(companyStored)];
        const legacyStored = localStorage.getItem('deepernova_cloud_files');
        if (legacyStored) localItems = [...localItems, ...JSON.parse(legacyStored)];
        const docArtifacts = sessionStorage.getItem('doc_artifacts');
        if (docArtifacts) {
          const arts = JSON.parse(docArtifacts);
          localItems = [...localItems, ...arts.map(a => ({
            id: a.id || `art_${Date.now()}`,
            name: `${a.title || 'Dokumen'}.${a.type === 'excel' ? 'xlsx' : a.type === 'ppt' ? 'pptx' : 'docx'}`,
            type: a.type,
            category: a.type,
            content: a
          }))];
        }
      } catch (e) {}

      // 2. Fetch server cloud files & codedance projects
      let serverFiles = [];
      let serverProjects = [];

      try {
        const [cloudRes, projRes] = await Promise.allSettled([
          fetch('/api/cloud/files', { credentials: 'include' }),
          fetch('/api/codedance/projects', { credentials: 'include' })
        ]);

        if (cloudRes.status === 'fulfilled' && cloudRes.value.ok) {
          const cData = await cloudRes.value.json();
          if (cData.files && Array.isArray(cData.files)) serverFiles = cData.files;
        }

        if (projRes.status === 'fulfilled' && projRes.value.ok) {
          const pData = await projRes.value.json();
          if (pData.projects && Array.isArray(pData.projects)) serverProjects = pData.projects;
        }
      } catch (e) {}

      // 3. Merge all files into unique map
      const allFilesMap = new Map();
      [...localItems, ...serverFiles].forEach(item => {
        if (item && (item.id || item.name)) {
          const key = item.id || item.name;
          allFilesMap.set(key, { ...allFilesMap.get(key), ...item });
        }
      });
      const allItems = Array.from(allFilesMap.values());
      setAllCloudRawFiles(allItems);

      // 4. Extract all Management Office folders
      const folders = allItems.filter(f => f.category === 'folder' || f.type === 'folder');

      const unifiedFolderList = [];

      // Add folders from Management Office
      folders.forEach(folder => {
        const childFiles = allItems.filter(f => f.parentId === folder.id && f.category !== 'folder' && f.type !== 'folder');
        const formattedChildFiles = childFiles.map(cf => ({
          id: cf.id,
          name: cf.name || 'file.txt',
          content: cf.text || (typeof cf.content === 'string' ? cf.content : '') || (cf.dataUrl ? `/* ${cf.name} binary file stored */` : ''),
          type: cf.type || 'other',
          size: cf.size || '0.1 MB'
        }));

        unifiedFolderList.push({
          id: folder.id,
          name: folder.name || 'Folder Cloud',
          updatedAt: folder.updatedAt || folder.date || folder.createdAt || new Date().toISOString(),
          files: formattedChildFiles,
          filesCount: formattedChildFiles.length,
          folderType: folder.folderType || 'office',
          isOfficeFolder: true
        });
      });

      // Add projects from CodeDance IDE
      serverProjects.forEach(proj => {
        if (!unifiedFolderList.some(f => f.name === proj.name || f.id === proj.id)) {
          unifiedFolderList.push({
            id: proj.id,
            name: proj.name,
            updatedAt: proj.updatedAt,
            files: proj.projectData?.files || proj.files || [],
            filesCount: proj.filesCount || (proj.projectData?.files?.length || 0),
            folderType: 'project',
            projectData: proj.projectData
          });
        }
      });

      // If root level has files not in any folder, group them into a "Server Cloud Drive (Root)" folder
      const rootFiles = allItems.filter(f => !f.parentId && f.category !== 'folder' && f.type !== 'folder');
      if (rootFiles.length > 0 && !unifiedFolderList.some(f => f.name === 'Server Cloud Drive (Root)')) {
        unifiedFolderList.unshift({
          id: 'root_drive_folder',
          name: 'Server Cloud Drive (Root)',
          updatedAt: new Date().toISOString(),
          files: rootFiles.map(rf => ({
            id: rf.id,
            name: rf.name,
            content: rf.text || (typeof rf.content === 'string' ? rf.content : '') || '',
            type: rf.type || 'other',
            size: rf.size || '0.1 MB'
          })),
          filesCount: rootFiles.length,
          folderType: 'root'
        });
      }

      setCloudProjects(unifiedFolderList);
    } catch (e) {
      console.warn('Could not sync cloud projects and folders:', e);
    } finally {
      setIsSyncingExplorer(false);
    }
  };

  const handleSelectWorkspaceFolder = (proj) => {
    if (!proj) return;
    const projFiles = proj.projectData?.files || proj.files || [];
    setProjectName(proj.name);
    setCurrentFolderId(proj.id || null);
    setFiles(projFiles);
    filesRef.current = projFiles;
    if (projFiles.length > 0) {
      setActiveFileName(projFiles[0].name);
      setOpenTabs([projFiles[0].name]);
    } else {
      setActiveFileName('');
      setOpenTabs([]);
    }
    setIsCloudExplorerOpen(false);
    showNotification(`📥 Folder Workspace "${proj.name}" berhasil dimuat dari Cloud Storage!`);
  };

  const handleOpenIndividualFile = (fileItem) => {
    if (!fileItem) return;
    const fileName = fileItem.name || 'untitled.js';
    const fileContent = fileItem.text || (typeof fileItem.content === 'string' ? fileItem.content : '') || (fileItem.content ? JSON.stringify(fileItem.content, null, 2) : '');
    
    // Check if file already exists in current workspace
    const existingIndex = files.findIndex(f => f.name === fileName);
    let newFilesList;
    if (existingIndex >= 0) {
      newFilesList = [...files];
      newFilesList[existingIndex] = { name: fileName, content: fileContent };
    } else {
      newFilesList = [...files, { name: fileName, content: fileContent }];
    }

    setFiles(newFilesList);
    filesRef.current = newFilesList;
    setActiveFileName(fileName);
    if (!openTabs.includes(fileName)) {
      setOpenTabs(prev => [...prev, fileName]);
    }
    setIsCloudExplorerOpen(false);
    showNotification(`📄 Berkas "${fileName}" dibuka di editor`);
  };

  const handleCreateNewCloudFolder = async () => {
    if (!newFolderNameInput.trim()) return;
    const fName = newFolderNameInput.trim();
    const folderId = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentOwner = (user?.email || 'authenticated@deepernova.com').toLowerCase().trim();
    const userKey = `deepernova_cloud_files_${currentOwner}`;

    // 1. Save new empty folder into Management Office storage & server
    try {
      const existingStr = localStorage.getItem(userKey);
      const existingList = existingStr ? JSON.parse(existingStr) : [];
      const newFolderObj = {
        id: folderId,
        name: fName,
        type: 'folder',
        category: 'folder',
        ownerEmail: currentOwner,
        date: new Date().toISOString().split('T')[0],
        parentId: null
      };
      localStorage.setItem(userKey, JSON.stringify([...existingList, newFolderObj]));

      // Call backend folder create endpoint
      fetch('/api/cloud/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFolderObj)
      }).catch(() => {});
    } catch (e) {}

    // 2. Set empty workspace for AI to freely generate any files
    setProjectName(fName);
    setCurrentFolderId(folderId);
    setFiles([]);
    filesRef.current = [];
    setActiveFileName('');
    setOpenTabs([]);
    setIsCreatingNewFolder(false);
    setNewFolderNameInput('');
    setIsCloudExplorerOpen(false);

    // 3. Save empty project structure to cloud
    await handleSaveToCloud(fName, folderId);
    fetchCloudProjects();
    showNotification(`📁 Folder Workspace "${fName}" siap! Beri instruksi pada AI Copilot untuk mulai membuat berkas.`);
  };

  // Scroll terminal to bottom
  useEffect(() => {
    if (activeBottomTab === 'terminal' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, activeBottomTab]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tasks, agentActionStatus]);

  // Save to cloud
  const handleSaveToCloud = async (overrideName = null, overrideFolderId = null) => {
    setIsSavingCloud(true);
    setCloudStatus('Saving...');
    try {
      const pName = overrideName || projectName;
      const currentFiles = filesRef.current || [];
      const currentOwner = (user?.email || 'authenticated@deepernova.com').toLowerCase().trim();
      const userKey = `deepernova_cloud_files_${currentOwner}`;
      const targetFolderId = overrideFolderId || currentFolderId;

      // 1. Save unified CodeDance project
      const res = await fetch('/api/codedance/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: pName,
          files: currentFiles,
          settings: { theme, fontSize, tabSize, wordWrap }
        })
      });
      const data = await res.json();

      // 2. Synchronize folder & all child files to Management Office Cloud Storage & Server SQLite
      try {
        let existingLocal = [];
        try {
          const stored = localStorage.getItem(userKey);
          if (stored) existingLocal = JSON.parse(stored);
        } catch (e) {}

        // Find or create folder in Management Office
        let folderItem = existingLocal.find(item => (item.type === 'folder' || item.category === 'folder') && (item.id === targetFolderId || item.name === pName));
        const folderId = folderItem ? folderItem.id : (targetFolderId || `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

        if (!folderItem) {
          folderItem = {
            id: folderId,
            name: pName,
            type: 'folder',
            category: 'folder',
            ownerEmail: currentOwner,
            date: new Date().toISOString().split('T')[0],
            parentId: null
          };
          existingLocal.push(folderItem);
          fetch('/api/cloud/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(folderItem)
          }).catch(() => {});
        }

        // Filter out deleted child files from this folder
        const currentFileNames = new Set(currentFiles.map(f => f.name));
        const filteredLocal = existingLocal.filter(item => {
          if (item.parentId === folderId && !currentFileNames.has(item.name)) {
            // Delete removed file from server database as well
            fetch(`/api/cloud/files/${item.id}?name=${encodeURIComponent(item.name)}`, { method: 'DELETE' }).catch(() => {});
            return false;
          }
          return true;
        });

        // Add or update every current file inside this folder
        for (const file of currentFiles) {
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'code';
          let localFile = filteredLocal.find(item => item.parentId === folderId && item.name === file.name);
          const fileId = localFile ? localFile.id : `cloud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          const filePayload = {
            id: fileId,
            parentId: folderId,
            name: file.name,
            type: fileExt,
            category: 'code',
            content: file.content,
            text: file.content,
            size: `${(file.content.length / 1024).toFixed(1)} KB`,
            date: new Date().toISOString().split('T')[0],
            ownerEmail: currentOwner
          };

          if (localFile) {
            Object.assign(localFile, filePayload);
          } else {
            filteredLocal.push(filePayload);
          }

          // Persist each file directly to server SQLite database
          fetch('/api/cloud/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filePayload)
          }).catch(() => {});
        }

        localStorage.setItem(userKey, JSON.stringify(filteredLocal));
      } catch (syncErr) {
        console.warn('[Sync to Management Office Error]:', syncErr);
      }

      if (data.success) {
        setCloudStatus('Synced');
        setDirtyFiles(new Set());
        fetchCloudProjects();
        showNotification(`☁️ Folder Cloud "${pName}" & ${currentFiles.length} berkas tersimpan di Cloud`);
      } else {
        setCloudStatus('Error');
      }
    } catch (e) {
      setCloudStatus('Offline');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const showNotification = (text) => {
    setHighlightNotification(text);
    setTimeout(() => setHighlightNotification(''), 4000);
  };

  // Memoized hierarchical tree structure
  const hierarchicalTree = useMemo(() => {
    return buildFileTree(files, emptyFolders);
  }, [files, emptyFolders]);

  const handleToggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const handleCollapseAllFolders = () => {
    setExpandedFolders(new Set());
  };

  const handleExpandAllFolders = () => {
    const allFolderPaths = new Set();
    files.forEach(f => {
      const parts = f.name.split('/');
      let curr = '';
      for (let i = 0; i < parts.length - 1; i++) {
        curr = curr ? `${curr}/${parts[i]}` : parts[i];
        allFolderPaths.add(curr);
      }
    });
    emptyFolders.forEach(fp => allFolderPaths.add(fp));
    setExpandedFolders(allFolderPaths);
  };

  const handleCreateNewItem = (parentFolder = '', type = 'file', name = '') => {
    const cleanName = (name || '').trim();
    if (!cleanName) return;

    const fullPath = parentFolder ? `${parentFolder}/${cleanName}` : cleanName;

    if (type === 'folder') {
      if (!emptyFolders.includes(fullPath)) {
        setEmptyFolders(prev => [...prev, fullPath]);
      }
      setExpandedFolders(prev => new Set(prev).add(fullPath).add(parentFolder));
      showNotification(`📁 Folder "${fullPath}" dibuat`);
    } else {
      if (files.some(f => f.name === fullPath)) {
        showNotification(`⚠️ Berkas "${fullPath}" sudah ada.`);
        handleSelectFile(fullPath);
        return;
      }
      let defaultContent = '';
      const ext = cleanName.split('.').pop()?.toLowerCase();
      if (ext === 'html') {
        defaultContent = `<!DOCTYPE html>\n<html lang="id">\n<head>\n  <meta charset="UTF-8">\n  <title>${cleanName}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>${cleanName}</h1>\n</body>\n</html>`;
      } else if (ext === 'css') {
        defaultContent = `/* ${cleanName} Styles */\nbody {\n  margin: 0;\n  font-family: sans-serif;\n}`;
      } else if (ext === 'jsx' || ext === 'tsx') {
        defaultContent = `import React from 'react';\n\nexport default function ${cleanName.split('.')[0]}() {\n  return (\n    <div className="p-4">\n      <h1 className="text-xl font-bold">${cleanName.split('.')[0]}</h1>\n    </div>\n  );\n}`;
      } else if (ext === 'js') {
        defaultContent = `// ${cleanName}\nconsole.log('${cleanName} loaded');\n`;
      } else if (ext === 'py') {
        defaultContent = `# ${cleanName}\nprint("${cleanName} running")\n`;
      }

      const newFile = { name: fullPath, content: defaultContent };
      setFiles(prev => [...prev, newFile]);
      setOpenTabs(prev => prev.includes(fullPath) ? prev : [...prev, fullPath]);
      setActiveFileName(fullPath);
      if (parentFolder) {
        setExpandedFolders(prev => new Set(prev).add(parentFolder));
      }
      setCloudStatus('Unsaved');
      showNotification(`📄 Berkas "${fullPath}" dibuat`);
    }
    setCreatingItemInFolder(null);
    setNewItemName('');
  };

  const handleDeleteItem = (itemPath, isFolder) => {
    if (isFolder) {
      if (!confirm(`Hapus folder "${itemPath}" beserta seluruh isinya?`)) return;
      setFiles(prev => prev.filter(f => !f.name.startsWith(`${itemPath}/`)));
      setEmptyFolders(prev => prev.filter(p => p !== itemPath && !p.startsWith(`${itemPath}/`)));
      setOpenTabs(prev => prev.filter(t => !t.startsWith(`${itemPath}/`)));
      if (activeFileName && activeFileName.startsWith(`${itemPath}/`)) {
        setActiveFileName('');
      }
      showNotification(`🗑️ Folder "${itemPath}" dihapus`);
    } else {
      handleDeleteFile(itemPath);
    }
  };

  const handleRenameItem = (oldPath, newPath, isFolder) => {
    const trimmed = (newPath || '').trim();
    if (!trimmed || trimmed === oldPath) {
      setRenamingPath(null);
      return;
    }

    if (isFolder) {
      setFiles(prev => prev.map(f => {
        if (f.name.startsWith(`${oldPath}/`)) {
          return { ...f, name: f.name.replace(`${oldPath}/`, `${trimmed}/`) };
        }
        return f;
      }));
      setEmptyFolders(prev => prev.map(p => {
        if (p === oldPath) return trimmed;
        if (p.startsWith(`${oldPath}/`)) return p.replace(`${oldPath}/`, `${trimmed}/`);
        return p;
      }));
      setOpenTabs(prev => prev.map(t => {
        if (t.startsWith(`${oldPath}/`)) return t.replace(`${oldPath}/`, `${trimmed}/`);
        return t;
      }));
      if (activeFileName && activeFileName.startsWith(`${oldPath}/`)) {
        setActiveFileName(activeFileName.replace(`${oldPath}/`, `${trimmed}/`));
      }
    } else {
      setFiles(prev => prev.map(f => f.name === oldPath ? { ...f, name: trimmed } : f));
      setOpenTabs(prev => prev.map(t => t === oldPath ? trimmed : t));
      if (activeFileName === oldPath) {
        setActiveFileName(trimmed);
      }
    }

    setRenamingPath(null);
    setRenamingValue('');
    setCloudStatus('Unsaved');
    showNotification(`✏️ Berhasil diubah menjadi "${trimmed}"`);
  };

  // File system actions
  const handleCreateFile = (customName = null, initialContent = '') => {
    let name = customName;
    if (!name) {
      name = prompt('Masukkan nama berkas (contoh: src/App.jsx, index.html, style.css):');
      if (!name) return;
    }

    if (files.some(f => f.name === name)) {
      showNotification(`⚠️ Berkas "${name}" sudah ada.`);
      handleSelectFile(name);
      return;
    }

    const newFile = { name, content: initialContent };
    setFiles(prev => [...prev, newFile]);
    setOpenTabs(prev => prev.includes(name) ? prev : [...prev, name]);
    setActiveFileName(name);
    setCloudStatus('Unsaved');
    showNotification(`📄 Berkas "${name}" berhasil dibuat`);
  };

  const handleDeleteFile = (fileName) => {
    if (!confirm(`Hapus berkas "${fileName}"?`)) return;
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setOpenTabs(prev => prev.filter(t => t !== fileName));
    if (activeFileName === fileName) {
      const remaining = files.filter(f => f.name !== fileName);
      if (remaining.length > 0) setActiveFileName(remaining[0].name);
      else setActiveFileName('');
    }
    setCloudStatus('Unsaved');
    showNotification(`🗑️ Berkas "${fileName}" dihapus`);
  };

  const handleSelectFile = (fileName) => {
    if (!openTabs.includes(fileName)) {
      setOpenTabs(prev => [...prev, fileName]);
    }
    setActiveFileName(fileName);
  };

  const handleContentChange = (newContent) => {
    if (isInternalUpdateRef.current) return;
    setFiles(prev => {
      const updated = prev.map(f => f.name === activeFileName ? { ...f, content: newContent } : f);
      filesRef.current = updated;
      return updated;
    });
    setDirtyFiles(prev => new Set(prev).add(activeFileName));
    setCloudStatus('Unsaved');
  };

  const handleCloseTab = (e, fileName) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setOpenTabs(prev => {
      const nextTabs = prev.filter(t => t !== fileName);
      if (activeFileName === fileName) {
        if (nextTabs.length > 0) {
          const nextActive = nextTabs[nextTabs.length - 1];
          setActiveFileName(nextActive);
          const activeFileObj = (filesRef.current || files).find(f => f.name === nextActive);
          if (monacoEditorInstanceRef.current && activeFileObj) {
            isInternalUpdateRef.current = true;
            monacoEditorInstanceRef.current.setValue(activeFileObj.content || '');
            isInternalUpdateRef.current = false;
          }
        } else {
          setActiveFileName('');
          if (monacoEditorInstanceRef.current) {
            isInternalUpdateRef.current = true;
            monacoEditorInstanceRef.current.setValue('');
            isInternalUpdateRef.current = false;
          }
        }
      }
      return nextTabs;
    });
  };

  // Context menu state (Right click)
  const [contextMenu, setContextMenu] = useState(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setContextMenu(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Console message listener from embedded iframe
  useEffect(() => {
    const handlePreviewMessage = (e) => {
      if (e.data && e.data.type === 'CODEDANCE_CONSOLE_LOG') {
        const levelIcon = e.data.level === 'error' ? '❌ ' : e.data.level === 'warn' ? '⚠️ ' : '💬 ';
        setTerminalHistory(prev => [
          ...prev,
          { type: e.data.level === 'error' ? 'error' : 'output', text: `${levelIcon}[Preview Log] ${e.data.message}` }
        ]);
      }
    };
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, []);

  // Generate Bundled Live Preview HTML (Supports HTML/CSS/JS and React/JSX Apps)
  const generateBundledPreviewHtml = (targetFileName = null) => {
    if (monacoEditorInstanceRef.current && activeFileName) {
      const currentEditorValue = monacoEditorInstanceRef.current.getValue();
      filesRef.current = filesRef.current.map(f => f.name === activeFileName ? { ...f, content: currentEditorValue } : f);
    }

    const currentFiles = filesRef.current || [];
    const fName = targetFileName || activeFileName || 'index.html';
    
    // Check for HTML entrypoint
    let htmlFile = currentFiles.find(f => f.name === fName && (f.name.endsWith('.html') || f.name.endsWith('.htm')));
    if (!htmlFile) {
      htmlFile = currentFiles.find(f => f.name.endsWith('.html') || f.name.endsWith('.htm'));
    }

    // Check for React / JSX components
    const jsxFiles = currentFiles.filter(f => f.name.endsWith('.jsx') || f.name.endsWith('.tsx') || (f.name.endsWith('.js') && f.content && f.content.includes('<') && f.content.includes('/>')));
    const hasJsx = jsxFiles.length > 0;
    const isReactApp = hasJsx || (htmlFile && htmlFile.content && htmlFile.content.includes('id="root"'));

    let fullHtml = '';

    if (htmlFile) {
      fullHtml = htmlFile.content || '';
    } else if (isReactApp) {
      const mainJsx = jsxFiles.find(f => ['app.jsx', 'main.jsx', 'index.jsx', 'app.js'].includes(f.name.toLowerCase())) || jsxFiles[0];
      const otherJsx = jsxFiles.filter(f => f.name !== mainJsx?.name);

      fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; margin: 0; padding: 0; }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 antialiased min-h-screen">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    ${otherJsx.map(f => `// File: ${f.name}\n${(f.content || '').replace(/import\s+.*?from\s+['"].*?['"];?/g, '')}`).join('\n\n')}

    // File: ${mainJsx ? mainJsx.name : 'App.jsx'}
    ${mainJsx ? (mainJsx.content || '').replace(/import\s+.*?from\s+['"].*?['"];?/g, '').replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, 'function $1').replace(/export\s+default\s+([A-Za-z0-9_]+);?/, '') : 'function App() { return <div className="p-8 text-center"><h1 className="text-2xl font-bold">App Ready</h1></div>; }'}

    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    try {
      const AppComponent = typeof App !== 'undefined' ? App : (typeof Main !== 'undefined' ? Main : () => <div className="p-8">Component ready</div>);
      root.render(<AppComponent />);
    } catch (err) {
      rootElement.innerHTML = '<div style="padding:20px;color:red;font-family:monospace;"><h3>Render Error:</h3><pre>' + err.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
    } else {
      fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="p-6 bg-slate-50 text-slate-900">
  <div class="max-w-2xl mx-auto text-center py-12">
    <div class="inline-block p-3 bg-orange-100 text-orange-600 rounded-2xl mb-4 font-bold text-2xl">🌌</div>
    <h1 class="text-2xl font-black text-slate-800">${projectName}</h1>
    <p class="text-slate-500 mt-2">Buat berkas <code>index.html</code> atau <code>App.jsx</code> untuk melihat antarmuka live di sini.</p>
  </div>
</body>
</html>`;
    }

    // In-line CSS files
    currentFiles.filter(f => f.name.endsWith('.css')).forEach(cssFile => {
      const linkRegex = new RegExp(`<link[^>]*href=["'](?:\\.\\/)?${cssFile.name}["'][^>]*>`, 'gi');
      if (linkRegex.test(fullHtml)) {
        fullHtml = fullHtml.replace(linkRegex, `<style>/* Inlined ${cssFile.name} */\n${cssFile.content}\n</style>`);
      } else if (!fullHtml.includes(cssFile.content) && fullHtml.includes('</head>')) {
        fullHtml = fullHtml.replace('</head>', `<style>/* ${cssFile.name} */\n${cssFile.content}\n</style>\n</head>`);
      }
    });

    // In-line JS files for non-React
    if (!isReactApp) {
      currentFiles.filter(f => f.name.endsWith('.js') && !f.name.includes('node_modules') && !f.name.includes('server')).forEach(jsFile => {
        const scriptRegex = new RegExp(`<script[^>]*src=["'](?:\\.\\/)?${jsFile.name}["'][^>]*>\\s*<\\/script>`, 'gi');
        if (scriptRegex.test(fullHtml)) {
          fullHtml = fullHtml.replace(scriptRegex, `<script>/* Inlined ${jsFile.name} */\n${jsFile.content}\n</script>`);
        } else if (!fullHtml.includes(jsFile.content) && fullHtml.includes('</body>')) {
          fullHtml = fullHtml.replace('</body>', `<script>/* ${jsFile.name} */\n${jsFile.content}\n</script>\n</body>`);
        }
      });
    }

    const consoleInterceptor = `
      <script>
        (function() {
          const sendLog = (type, args) => {
            try {
              window.parent.postMessage({
                type: 'CODEDANCE_CONSOLE_LOG',
                level: type,
                message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
              }, '*');
            } catch(e) {}
          };
          const _log = console.log, _warn = console.warn, _err = console.error;
          console.log = function() { sendLog('log', arguments); _log.apply(console, arguments); };
          console.warn = function() { sendLog('warn', arguments); _warn.apply(console, arguments); };
          console.error = function() { sendLog('error', arguments); _err.apply(console, arguments); };
        })();
      </script>
    `;

    if (fullHtml.includes('<head>')) {
      fullHtml = fullHtml.replace('<head>', `<head>${consoleInterceptor}`);
    } else {
      fullHtml = consoleInterceptor + fullHtml;
    }

    return fullHtml;
  };

  // Toggle or force open Embedded Live Preview panel
  const handleToggleLivePreview = (forceOpen = null, targetFileName = null) => {
    const nextState = forceOpen !== null ? forceOpen : !isPreviewOpen;
    setIsPreviewOpen(nextState);

    if (nextState) {
      const fullHtml = generateBundledPreviewHtml(targetFileName);
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const liveUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl(liveUrl);
      setPreviewReloadKey(prev => prev + 1);
      setMobileActiveTab('preview');
      showNotification('🌐 Live Preview dimuat di panel!');
    }
  };

  // Open with Live Server in new browser tab
  const handleOpenExternalLiveServer = (targetFileName = null) => {
    const fullHtml = generateBundledPreviewHtml(targetFileName);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const liveUrl = URL.createObjectURL(blob);
    const newWindow = window.open(liveUrl, '_blank');
    if (newWindow) {
      showNotification('🌐 Live Server dibuka di tab baru!');
    } else {
      showNotification('⚠️ Popup diblokir. Izinkan popup untuk tab eksternal.');
    }
  };

  const handleOpenLiveServer = (targetFileName = null) => {
    handleToggleLivePreview(true, targetFileName);
  };

  // Insert character from Mobile Coding Accessory Bar
  const handleInsertMobileKey = (symbol) => {
    if (monacoEditorInstanceRef.current) {
      const editor = monacoEditorInstanceRef.current;
      const position = editor.getPosition() || { lineNumber: 1, column: 1 };
      editor.executeEdits('mobile-bar', [{
        range: new window.monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: symbol === 'TAB' ? '  ' : symbol
      }]);
      editor.focus();
    }
  };

  // Run active code
  const handleRunActiveCode = async (customFile = null) => {
    const targetFile = customFile || activeFile;
    if (!targetFile || !targetFile.name) return;

    const ext = targetFile.name.split('.').pop()?.toLowerCase();
    const isWeb = ['html', 'htm', 'css', 'jsx', 'tsx'].includes(ext);

    if (isWeb) {
      handleToggleLivePreview(true, targetFile.name);
      return;
    }

    setIsRunningCode(true);
    setIsBottomPanelOpen(true);

    setActiveBottomTab('terminal');
    const runnerLang = ['py', 'python'].includes(ext) ? 'python' : 'javascript';
    const timestamp = new Date().toLocaleTimeString();

    setTerminalHistory(prev => [
      ...prev,
      { type: 'input', text: `${runnerLang === 'python' ? 'python' : 'node'} ${targetFile.name}` },
      { type: 'system', text: `⏳ Mengirim ke Cloud Sandbox Runner (${timestamp})...` }
    ]);

    try {
      const res = await fetch('/api/codedance/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: targetFile.content,
          language: runnerLang,
          files: filesRef.current,
          projectName
        })
      });
      const data = await res.json();
      
      let out = data.output || '';
      if (data.error) {
        out += (out ? '\n' : '') + data.error;
      }
      out += `\n\x1b[90m[Process exited with code ${data.exitCode} in ${data.executionTimeMs || 0}ms]\x1b[0m`;

      setTerminalHistory(prev => [
        ...prev,
        { type: data.success ? 'output' : 'error', text: out }
      ]);
      setExecutionOutput(out);
      showNotification(`⚡ Selesai dieksekusi di Cloud (${data.executionTimeMs || 0}ms)`);
    } catch (e) {
      setTerminalHistory(prev => [
        ...prev,
        { type: 'error', text: `Gagal menghubungkan ke Cloud Runner: ${e.message}` }
      ]);
    } finally {
      setIsRunningCode(false);
    }
  };

  // Execute Real Terminal Command (100% Direct Real Shell Execution on Server - 10 Min Timeout)
  const executeTerminalCommand = async () => {
    const rawCmd = terminalInput;
    const cmd = rawCmd.trim();
    if (!cmd) {
      setTerminalHistory(prev => [...prev, { type: 'input', text: '' }]);
      setTerminalInput('');
      return;
    }

    commandHistoryRef.current.push(cmd);
    setTerminalCommandIndex(-1);
    setTerminalInput('');

    // Append input line to terminal stream
    setTerminalHistory(prev => [...prev, { type: 'input', text: cmd }]);

    // Only clear and exit are client-side UI actions
    if (cmd === 'clear' || cmd === 'cls') {
      setTerminalHistory([]);
      return;
    }

    if (cmd === 'exit') {
      setIsBottomPanelOpen(false);
      return;
    }

    setIsTerminalRunning(true);
    const abortCtrl = new AbortController();
    terminalAbortCtrlRef.current = abortCtrl;

    // Direct Real Shell Execution in Server Subprocess Sandbox
    try {
      const res = await fetch('/api/codedance/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({ 
          command: cmd, 
          files: filesRef.current || files, 
          projectName 
        })
      });
      const data = await res.json();
      
      // Auto-sync files created, deleted, or modified on disk by the real shell command
      if (data.updatedFiles && Array.isArray(data.updatedFiles) && data.updatedFiles.length > 0) {
        filesRef.current = data.updatedFiles;
        setFiles(data.updatedFiles);
      }

      setTerminalHistory(prev => [
        ...prev,
        { type: data.success ? 'output' : 'error', text: data.output || `[Process exited with code ${data.exitCode || 0}]` }
      ]);
    } catch (e) {
      if (e.name === 'AbortError') {
        setTerminalHistory(prev => [
          ...prev,
          { type: 'system', text: `\x1b[33m^C [Process terminated by user]\x1b[0m` }
        ]);
      } else {
        setTerminalHistory(prev => [
          ...prev,
          { type: 'error', text: `\x1b[31mTerminal Connection Error: ${e.message}\x1b[0m` }
        ]);
      }
    } finally {
      setIsTerminalRunning(false);
      terminalAbortCtrlRef.current = null;
    }
  };

  // Keyboard navigation inside terminal
  const handleTerminalKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeTerminalCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistoryRef.current.length > 0) {
        const nextIdx = terminalCommandIndex === -1 ? commandHistoryRef.current.length - 1 : Math.max(0, terminalCommandIndex - 1);
        setTerminalCommandIndex(nextIdx);
        setTerminalInput(commandHistoryRef.current[nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (terminalCommandIndex !== -1) {
        const nextIdx = terminalCommandIndex + 1;
        if (nextIdx < commandHistoryRef.current.length) {
          setTerminalCommandIndex(nextIdx);
          setTerminalInput(commandHistoryRef.current[nextIdx]);
        } else {
          setTerminalCommandIndex(-1);
          setTerminalInput('');
        }
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      if (isTerminalRunning && terminalAbortCtrlRef.current) {
        terminalAbortCtrlRef.current.abort();
        try {
          fetch('/api/codedance/kill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectName })
          }).catch(() => {});
        } catch (err) {}
      } else {
        setTerminalHistory(prev => [
          ...prev,
          { type: 'input', text: `${terminalInput}^C` }
        ]);
        setTerminalInput('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setTerminalHistory([]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = terminalInput.split(' ');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const matched = (filesRef.current || []).find(f => f.name.startsWith(lastPart));
        if (matched) {
          parts[parts.length - 1] = matched.name;
          setTerminalInput(parts.join(' '));
        }
      }
    }
  };

  // ============================================================
  // AGENTIC DETERMINISTIC TOOL REGISTRY (Cursor/Antigravity Engine)
  // ============================================================

  const toolGrepSearch = (query) => {
    if (!query) return { error: 'Parameter query diperlukan' };
    const qLower = query.toLowerCase();
    const results = [];
    (filesRef.current || []).forEach(f => {
      const lines = (f.content || '').split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(qLower)) {
          results.push({ file: f.name, line: idx + 1, snippet: line.trim() });
        }
      });
    });
    return { query, matchCount: results.length, matches: results.slice(0, 10) };
  };

  const toolReadFileLines = (filePath, startLine = 1, endLine = 80) => {
    const file = (filesRef.current || []).find(f => f.name === filePath);
    if (!file) return { error: `Error: File "${filePath}" tidak ditemukan di workspace.` };
    const formatted = formatLineNumberedWindow(filePath, file.content, startLine, endLine);
    return { file: filePath, windowText: formatted };
  };

  const toolCreateFile = (filePath, content) => {
    if (!filePath) return { error: 'Parameter filePath diperlukan' };
    const cleaned = cleanCodeBlock(content || '');

    // Synchronous immediate update to filesRef so next tool calls in loop read it instantly
    const cur = filesRef.current || [];
    const exists = cur.find(f => f.name === filePath);
    const updatedList = exists 
      ? cur.map(f => f.name === filePath ? { ...f, content: cleaned } : f)
      : [...cur, { name: filePath, content: cleaned }];
    filesRef.current = updatedList;

    setFiles(updatedList);
    setOpenTabs(prev => prev.includes(filePath) ? prev : [...prev, filePath]);
    setActiveFileName(filePath);
    setCloudStatus('Saving to Cloud...');

    // Trigger instant cloud persistence (Cloud-Native Auto-Save)
    setTimeout(() => {
      handleSaveToCloud().catch(() => {});
    }, 50);

    return { success: true, file: filePath, lines: cleaned.split('\n').length, message: `Success: File ${filePath} berhasil dibuat & tersimpan ke Cloud Storage.` };
  };

  const toolEditFileBlock = (filePath, targetSnippet, replacement) => {
    const file = (filesRef.current || []).find(f => f.name === filePath);
    if (!file) return { error: `Error: File "${filePath}" tidak ditemukan.` };

    // 1. Save snapshot for rollback protection
    createSnapshot(filePath, file.content);

    // 2. Apply Fuzzy Patch
    const patchResult = applyFuzzyPatch(file.content, targetSnippet, replacement);
    if (!patchResult.success) return { error: patchResult.error };

    // 3. Automated Linter Verification Hook (Self-Healing Loop)
    const lintResult = validateCodeFile(filePath, patchResult.newContent);

    // Synchronous immediate update to filesRef
    const updatedList = (filesRef.current || []).map(f => f.name === filePath ? { ...f, content: patchResult.newContent } : f);
    filesRef.current = updatedList;

    setFiles(updatedList);
    setOpenTabs(prev => prev.includes(filePath) ? prev : [...prev, filePath]);
    setActiveFileName(filePath);
    setCloudStatus('Saving to Cloud...');

    // Trigger instant cloud persistence (Cloud-Native Auto-Save)
    setTimeout(() => {
      handleSaveToCloud().catch(() => {});
    }, 50);

    if (lintResult.hasError) {
      return {
        success: true,
        hasLinterWarning: true,
        file: filePath,
        matchType: patchResult.matchType,
        confidence: patchResult.confidence,
        lineRange: patchResult.matchedLineRange,
        diagnostics: lintResult.diagnostics,
        message: `[PERINGATAN] File '${filePath}' berhasil dimodifikasi & disimpan ke Cloud, TETAPI LINTER MENDETEKSI ERROR SINTAKS:\n${lintResult.diagnostics}\nInstruksi: Analisis error di atas dan perbaiki dengan 'editFileBlock' atau jalankan terminal untuk verifikasi.`
      };
    }

    return {
      success: true,
      hasLinterWarning: false,
      file: filePath,
      matchType: patchResult.matchType,
      confidence: patchResult.confidence,
      lineRange: patchResult.matchedLineRange,
      message: `Sukses: File '${filePath}' berhasil diperbarui, disimpan ke Cloud Storage, dan lolos validasi linter tanpa error sintaks.`
    };
  };

  const toolDeleteFile = (filePath) => {
    if (!filePath) return { error: 'Parameter filePath diperlukan' };
    const cur = filesRef.current || [];
    const exists = cur.find(f => f.name === filePath);
    if (!exists) {
      return { error: `File "${filePath}" tidak ditemukan di workspace cloud.` };
    }

    const updatedList = cur.filter(f => f.name !== filePath);
    filesRef.current = updatedList;
    setFiles(updatedList);

    // Close tab if open
    setOpenTabs(prev => prev.filter(t => t !== filePath));
    if (activeFileName === filePath) {
      const remaining = updatedList.map(f => f.name);
      setActiveFileName(remaining.length > 0 ? remaining[0] : '');
    }

    setCloudStatus('Saving to Cloud...');
    // Auto-save cloud persistence
    setTimeout(() => {
      handleSaveToCloud().catch(() => {});
    }, 50);

    return {
      success: true,
      file: filePath,
      message: `File "${filePath}" berhasil dihapus dari cloud workspace & cloud storage.`
    };
  };

  const toolRunCommand = async (command) => {
    setIsBottomPanelOpen(true);
    setActiveBottomTab('terminal');
    setTerminalHistory(prev => [...prev, { type: 'system', text: `🤖 [Cloud Sandbox] $ ${command}` }]);

    try {
      const res = await fetch('/api/codedance/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, files: filesRef.current, projectName })
      });
      const data = await res.json();
      setTerminalHistory(prev => [...prev, { type: data.success ? 'output' : 'error', text: data.output || '' }]);
      return { exitCode: data.exitCode || (data.success ? 0 : 1), output: data.output || '', success: data.success };
    } catch (e) {
      return { exitCode: 1, error: e.message, success: false };
    }
  };



  // ============================================================
  // MULTI-TURN AUTONOMOUS AGENTIC HARNESS (True ReAct Control Loop)
  // ============================================================
  const runReActControlLoop = async (goalPrompt) => {
    setIsAiGenerating(true);
    setIsFlowRunning(true);
    setAgentActionStatus('🧠 Menginisialisasi Agen Otonom & ReAct Loop...');

    const abortCtrl = new AbortController();
    currentAbortCtrlRef.current = abortCtrl;

    const currentTaskId = `task_${Date.now()}`;
    const initialThoughtStep = {
      id: `thought_${currentTaskId}_1`,
      type: 'thought',
      title: `Reasoning & Analysis [Turn 1]`,
      details: 'Menganalisis instruksi & merancang struktur file di cloud...',
      status: 'running'
    };

    const taskSteps = [initialThoughtStep];
    const actionsTaken = [];
    let primaryFileToOpen = null;
    let hasWebPreview = false;
    const latestFileContents = {};

    const newTask = {
      taskId: currentTaskId,
      prompt: goalPrompt,
      status: 'running',
      steps: [...taskSteps],
      finalAnswer: null,
      actionsTaken: []
    };

    setTasks(prev => [...prev, newTask]);

    const updateTaskState = (updatedProps) => {
      setTasks(prev => prev.map(t => t.taskId === currentTaskId ? { ...t, ...updatedProps } : t));
    };

    const syncMonacoLive = (fName, newCode) => {
      latestFileContents[fName] = newCode;
      setOpenTabs(prev => prev.includes(fName) ? prev : [...prev, fName]);
      setActiveFileName(fName);
      if (monacoEditorInstanceRef.current) {
        isInternalUpdateRef.current = true;
        monacoEditorInstanceRef.current.setValue(newCode);
        isInternalUpdateRef.current = false;
      }
    };

    try {
      // 1. Build rich workspace context & unlimited code memory from filesRef
      const currentWorkspaceFiles = filesRef.current || [];
      const fileContentsContext = currentWorkspaceFiles.map(f => {
        const content = f.content || '';
        const lines = content.split('\n').length;
        if (lines <= 500 && content.length < 30000) {
          return `=== FILE: ${f.name} (${lines} lines) ===\n${content}\n=== END FILE ===`;
        }
        return `=== FILE: ${f.name} (${lines} lines, Preview) ===\n${content.slice(0, 500)}\n...\n=== END PREVIEW ===`;
      }).join('\n\n') || '(Empty workspace)';

      // 2. Build multi-turn session history memory from all previous tasks
      const pastTasksMemory = tasks
        .filter(t => t.taskId !== currentTaskId && t.prompt)
        .slice(-10)
        .map((t, idx) => `[Interaction #${idx + 1}]\nUser Requested: "${t.prompt}"\nActions Done: ${(t.actionsTaken || []).map(a => a.label).join(', ') || 'Code generation'}\nOutcome: ${t.finalAnswer || (t.status === 'completed' ? 'Successfully completed' : 'Processed')}`)
        .join('\n\n');

      const systemPrompt = `You are DEEPERNOVA AI, an Elite Senior Full-Stack Engineer and Collaborative Pair Programming Partner with UNLIMITED CONTEXT MEMORY.

=== YOUR DUAL CAPABILITIES ===
1. 💬 CONVERSATION & TECH CONSULTATION:
   - When the user asks advice, questions ("menurut lu bagusan mana?", "kenapa begini?", "gimana arsitekturnya?"), brainstorms, or discusses the project, RESPOND WARMLY, ENGAGINGLY, AND EXPERTLY in natural Indonesian (or user's language).
   - Provide clear, well-reasoned answers, pros & cons, code examples, and friendly guidance. Conclude with [FINISH] your conversational response [/FINISH].
   - NEVER output raw '***' asterisks or machine jargon. Use clean Markdown headings (###) and bullet lists.

2. ⚡ AUTONOMOUS CODE EXECUTION:
   - When the user asks to build, modify, fix, or add features, JUMP STRAIGHT to writing or editing files using [CREATE_FILE] or [EDIT_FILE].
   - All workspace files and code are ALREADY in your context memory below.
   - For Frontend Web Apps (HTML/CSS/JS/React): Write complete, gorgeous production-ready code with [CREATE_FILE] and conclude with [FINISH].

=== AVAILABLE TOOLS ===
1. Think & Plan (Brief step-by-step reasoning):
<thought>
- Step 1: Analyze user request and determine files to create or modify.
- Step 2: Implement code or formulate conversational advice.
</thought>

2. Create or rewrite file:
[CREATE_FILE: filename]
complete production-ready code...
[/CREATE_FILE]

3. Edit existing file (fuzzy matching replacement):
[EDIT_FILE: filename]
[TARGET]
exact lines to replace
[/TARGET]
[REPLACEMENT]
new replacement lines
[/REPLACEMENT]
[/EDIT_FILE]

4. Read specific file lines:
[READ_LINES: filename, startLine, endLine]

5. Search workspace for text/symbols:
[GREP_SEARCH: keyword]

6. Delete redundant file:
[DELETE_FILE: filename]

7. Run script in cloud sandbox (ONLY after writing code):
[RUN_TERMINAL: command] (e.g. [RUN_TERMINAL: node app.js] or [RUN_TERMINAL: python main.py])

8. Conclude task or conversational response:
[FINISH]
Your warm, beautifully formatted final answer, advice, or project walkthrough.
[/FINISH]

=== PERSISTENT SESSION CONTEXT & HISTORY ===
Project Name: ${projectName}
Active File: ${activeFileName || 'None'}
Total Workspace Files: ${currentWorkspaceFiles.length}

--- PREVIOUS SESSION ACTIONS & GOALS ---
${pastTasksMemory || '(This is the initial prompt of the session)'}

--- CURRENT WORKSPACE CODE SNAPSHOT (FULL MEMORY) ---
${fileContentsContext}`;

      const conversationHistory = [
        { role: 'system', content: systemPrompt }
      ];

      // Inject past dialogues into conversation history for conversational flow
      const recentTasks = tasks.filter(t => t.taskId !== currentTaskId && t.prompt).slice(-5);
      for (const pt of recentTasks) {
        conversationHistory.push({ role: 'user', content: pt.prompt });
        if (pt.finalAnswer) {
          conversationHistory.push({ role: 'assistant', content: pt.finalAnswer });
        } else if (pt.actionsTaken && pt.actionsTaken.length > 0) {
          conversationHistory.push({ role: 'assistant', content: `[FINISH]\nCompleted: ${pt.actionsTaken.map(a => a.label).join(', ')}\n[/FINISH]` });
        }
      }

      conversationHistory.push({ role: 'user', content: goalPrompt });

      // Unlimited autonomous turns (safety ceiling 50 turns)
      const MAX_TURNS = 50;
      let turn = 1;
      let isTaskFinished = false;
      let finalSummary = '';
      let consecutiveEmptyTurns = 0;

      // ============================================================
      // MULTI-TURN ReAct EXECUTION LOOP
      // ============================================================
      while (turn <= MAX_TURNS && !isTaskFinished) {
        if (abortCtrl.signal.aborted) break;

        setAgentActionStatus(`⚡ [Step ${turn}] Deepernova Neural Engine autonomous reasoning & executing...`);

        // Call the lean agentic API (proper {role, content} format, 8192 max_tokens)
        const response = await sendAgenticMessage(conversationHistory, abortCtrl);

        let turnOutput = '';
        let currentThoughtStep = taskSteps.find(s => s.id === `thought_${currentTaskId}_${turn}`);
        if (!currentThoughtStep) {
          currentThoughtStep = {
            id: `thought_${currentTaskId}_${turn}`,
            type: 'thought',
            title: `Reasoning & Analysis [Turn ${turn}]`,
            details: 'Menganalisis hasil & merencanakan aksi berikutnya...',
            status: 'running'
          };
          taskSteps.push(currentThoughtStep);
          updateTaskState({ steps: [...taskSteps] });
        }

        if (response && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            if (abortCtrl.signal.aborted) break;
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const sseLines = chunk.split('\n');

            for (const line of sseLines) {
              if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  turnOutput += delta;

                  if (currentThoughtStep) {
                    const thoughtMatch = turnOutput.match(/<(?:thought|thinking)>([\s\S]*?)(?:<\/(?:thought|thinking)>|$)/i);
                    if (thoughtMatch && thoughtMatch[1]) {
                      currentThoughtStep.details = thoughtMatch[1].trim();
                    } else {
                      // If no explicit thought tag, show text leading up to tool calls
                      const preToolText = turnOutput.split(/\[(?:CREATE_FILE|EDIT_FILE|DELETE_FILE|RUN_TERMINAL|GREP_SEARCH|READ_LINES|FINISH)/i)[0].trim();
                      if (preToolText) {
                        currentThoughtStep.details = preToolText;
                      }
                    }

                    // Complete reasoning when thought tag ends or tool execution starts
                    const hasFinishedThought = turnOutput.includes('</thought>') || 
                                               turnOutput.includes('</thinking>') || 
                                               /\[(?:CREATE_FILE|EDIT_FILE|DELETE_FILE|RUN_TERMINAL|GREP_SEARCH|READ_LINES|FINISH)/i.test(turnOutput);
                    
                    if (hasFinishedThought && currentThoughtStep.status === 'running') {
                      currentThoughtStep.status = 'completed';
                    }
                    updateTaskState({ steps: [...taskSteps] });
                  }
                } catch (e) {}
              }
            }
          }
        } else if (typeof response === 'string') {
          turnOutput = response;
        }

        if (currentThoughtStep) {
          currentThoughtStep.status = 'completed';
          updateTaskState({ steps: [...taskSteps] });
        }

        // Record assistant turn in history
        conversationHistory.push({ role: 'assistant', content: turnOutput });

        const toolFeedback = [];

        // ------------------------------------------------------------
        // ------------------------------------------------------------
        // ACTION 1: [GREP_SEARCH: keyword]
        // ------------------------------------------------------------
        const grepMatches = [...turnOutput.matchAll(/\[(?:GREP_SEARCH|GREP):\s*([^\]]+)\]/gi)];
        for (const gm of grepMatches) {
          const kw = gm[1].trim().replace(/^["']|["']$/g, '');
          const searchStep = {
            id: `grep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'search',
            title: `🔍 Grep Search: "${kw}"`,
            details: `Searching codebase for "${kw}"...`,
            status: 'running'
          };
          taskSteps.push(searchStep);
          updateTaskState({ steps: [...taskSteps] });
          setAgentActionStatus(`🔍 Mencari kode "${kw}" di workspace...`);
          await new Promise(r => setTimeout(r, 250));

          const grepRes = toolGrepSearch(kw);
          searchStep.status = 'completed';
          searchStep.matches = grepRes.matches || [];
          searchStep.details = grepRes.matchCount > 0
            ? `Found ${grepRes.matchCount} matches for "${kw}".`
            : `No matches found for "${kw}".`;
          updateTaskState({ steps: [...taskSteps] });
          await new Promise(r => setTimeout(r, 150));

          const snippetFeedback = (grepRes.matches || []).map(m => `- File: ${m.file} (Line ${m.line}): ${m.snippet}`).join('\n');
          toolFeedback.push(`[TOOL_RESULT: GREP_SEARCH "${kw}"]\n${snippetFeedback || 'No matching lines found.'}`);
        }

        // ------------------------------------------------------------
        // ACTION 2: [READ_LINES: filePath, start, end]
        // ------------------------------------------------------------
        const readMatches = [...turnOutput.matchAll(/\[(?:READ_LINES|READ_FILE):\s*([^,\]]+)(?:,\s*(\d+)\s*,\s*(\d+))?\]/gi)];
        for (const rm of readMatches) {
          const fName = rm[1].trim().replace(/^["']|["']$/g, '');
          const startL = parseInt(rm[2] || '1', 10);
          const endL = parseInt(rm[3] || '80', 10);

          const readStep = {
            id: `read_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'read',
            title: `📖 Read: ${fName}`,
            target: fName,
            lines: `${startL}-${endL}`,
            details: 'Reading file lines...',
            status: 'running'
          };
          taskSteps.push(readStep);
          updateTaskState({ steps: [...taskSteps] });
          setAgentActionStatus(`📖 Membaca baris ${startL}-${endL} dari ${fName}...`);
          await new Promise(r => setTimeout(r, 250));

          const readRes = toolReadFileLines(fName, startL, endL);
          readStep.status = readRes.error ? 'error' : 'completed';
          readStep.details = readRes.windowText || readRes.error;
          updateTaskState({ steps: [...taskSteps] });
          await new Promise(r => setTimeout(r, 150));

          toolFeedback.push(`[TOOL_RESULT: READ_LINES ${fName} (${startL}-${endL})]\n${readRes.windowText || readRes.error}`);
        }

        // ------------------------------------------------------------
        // ACTION 3: [EDIT_FILE: filePath] [TARGET]...[/TARGET] [REPLACEMENT]...[/REPLACEMENT] [/EDIT_FILE]
        // ------------------------------------------------------------
        const editBlockMatches = [...turnOutput.matchAll(/\[EDIT_FILE:\s*([^\s\]]+)\][\s\S]*?\[TARGET\]([\s\S]*?)\[\/TARGET\][\s\S]*?\[REPLACEMENT\]([\s\S]*?)\[\/REPLACEMENT\][\s\S]*?\[\/EDIT_FILE\]/gi)];
        for (const ebm of editBlockMatches) {
          const fName = ebm[1].trim();
          const target = ebm[2];
          const replacement = ebm[3];

          const editStep = {
            id: `edit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'edit',
            title: `✏️ Edit: ${fName}`,
            target: fName,
            diff: { original: target.trim(), modified: replacement.trim() },
            status: 'running'
          };
          taskSteps.push(editStep);
          updateTaskState({ steps: [...taskSteps] });
          setAgentActionStatus(`✏️ Mengedit bagian file ${fName}...`);
          await new Promise(r => setTimeout(r, 300));

          const editRes = toolEditFileBlock(fName, target, replacement);
          editStep.status = editRes.success ? 'completed' : 'error';
          editStep.confidence = editRes.confidence;
          editStep.details = editRes.message;
          updateTaskState({ steps: [...taskSteps] });

          // Linter Check
          const linterStep = {
            id: `lint_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'linter',
            title: `🔍 Lint: ${fName}`,
            status: editRes.hasLinterWarning ? 'error' : 'completed',
            diagnostics: editRes.diagnostics || 'Syntax valid ✓'
          };
          taskSteps.push(linterStep);
          updateTaskState({ steps: [...taskSteps] });

          if (editRes.success) {
            setFiles(prev => {
              const updatedFile = prev.find(f => f.name === fName);
              if (updatedFile) syncMonacoLive(fName, updatedFile.content);
              return prev;
            });
            actionsTaken.push({ type: 'file', label: `Edited: ${fName}`, target: fName });
            primaryFileToOpen = fName;
            if (['html', 'htm', 'css', 'js'].some(ext => fName.endsWith(`.${ext}`))) hasWebPreview = true;
          }
          await new Promise(r => setTimeout(r, 200));

          toolFeedback.push(`[TOOL_RESULT: EDIT_FILE ${fName}]\n${editRes.message}`);
        }

        // ------------------------------------------------------------
        // ACTION 4: [CREATE_FILE: filePath] ... [/CREATE_FILE]
        // ------------------------------------------------------------
        const createMatches = [...turnOutput.matchAll(/\[CREATE_FILE:\s*([^\s\]]+)\]([\s\S]*?)\[\/CREATE_FILE\]/gi)];
        for (const cm of createMatches) {
          const fName = cm[1].trim();
          const fCode = cleanCodeBlock(cm[2].trim());
          const isExisting = files.some(f => f.name === fName);

          const createStep = {
            id: `create_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: isExisting ? 'edit' : 'create',
            title: `${isExisting ? '📝 Update' : '📄 Create'}: ${fName}`,
            target: fName,
            previewSnippet: fCode.split('\n').slice(0, 8).join('\n') + (fCode.split('\n').length > 8 ? '\n...' : ''),
            status: 'running'
          };
          taskSteps.push(createStep);
          updateTaskState({ steps: [...taskSteps] });
          setAgentActionStatus(`${isExisting ? '📝 Mengupdate' : '📄 Membuat'} file ${fName}...`);
          await new Promise(r => setTimeout(r, 350));

          const createRes = toolCreateFile(fName, fCode);
          syncMonacoLive(fName, fCode);
          createStep.status = 'completed';
          createStep.details = createRes.message;

          const lintRes = validateCodeFile(fName, fCode);
          const linterStep = {
            id: `lint_c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'linter',
            title: `🔍 Lint: ${fName}`,
            status: lintRes.valid ? 'completed' : 'error',
            diagnostics: lintRes.diagnostics
          };
          taskSteps.push(linterStep);
          updateTaskState({ steps: [...taskSteps] });

          actionsTaken.push({
            type: 'file',
            label: `${isExisting ? 'Updated' : 'Created'}: ${fName} (${fCode.split('\n').length} lines)`,
            target: fName
          });

          if (!primaryFileToOpen || fName.endsWith('.html') || fName.endsWith('.py')) primaryFileToOpen = fName;
          if (['html', 'htm', 'css', 'js'].some(ext => fName.endsWith(`.${ext}`))) hasWebPreview = true;
          await new Promise(r => setTimeout(r, 200));

          toolFeedback.push(`[TOOL_RESULT: CREATE_FILE ${fName} — ${createRes.message}. Linter: ${lintRes.valid ? 'Valid ✓' : 'Warning: ' + lintRes.diagnostics}]`);
        }

        // ------------------------------------------------------------
        // ACTION 5: [DELETE_FILE: filePath]
        // ------------------------------------------------------------
        const deleteMatches = [...turnOutput.matchAll(/\[(?:DELETE_FILE|REMOVE_FILE):\s*([^\]]+)\]/gi)];
        for (const dm of deleteMatches) {
          const fName = dm[1].trim().replace(/^["']|["']$/g, '');
          const delStep = {
            id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'delete',
            title: `🗑️ Delete: ${fName}`,
            target: fName,
            status: 'running'
          };
          taskSteps.push(delStep);
          updateTaskState({ steps: [...taskSteps] });
          setAgentActionStatus(`🗑️ Menghapus file ${fName}...`);
          await new Promise(r => setTimeout(r, 300));

          const delRes = toolDeleteFile(fName);
          delStep.status = delRes.success ? 'completed' : 'error';
          delStep.details = delRes.message || delRes.error;
          updateTaskState({ steps: [...taskSteps] });

          if (delRes.success) {
            actionsTaken.push({ type: 'delete', label: `Deleted: ${fName}`, target: fName });
          }
          await new Promise(r => setTimeout(r, 150));

          toolFeedback.push(`[TOOL_RESULT: DELETE_FILE ${fName} — ${delRes.message || delRes.error}]`);
        }

        // ------------------------------------------------------------
        // ACTION 6: [RUN_TERMINAL: command]
        // ------------------------------------------------------------
        const termMatches = [...turnOutput.matchAll(/\[RUN_TERMINAL:\s*([^\]]+)\]/gi)];
        for (const tm of termMatches) {
          const cmd = tm[1].trim();
          const termStep = {
            id: `term_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'terminal',
            title: `⚡ Terminal: ${cmd}`,
            command: cmd,
            status: 'running'
          };
          taskSteps.push(termStep);
          updateTaskState({ steps: [...taskSteps] });
          setAgentActionStatus(`⚡ Menjalankan terminal: ${cmd}...`);

          const termRes = await toolRunCommand(cmd);
          termStep.status = 'completed';
          termStep.output = termRes.output || (termRes.success ? 'Exit 0' : 'Error');
          updateTaskState({ steps: [...taskSteps] });

          actionsTaken.push({ type: 'terminal', label: `Terminal: ${cmd}` });
          toolFeedback.push(`[TOOL_RESULT: RUN_TERMINAL "${cmd}"]\nExit: ${termRes.exitCode}\n${termRes.output}`);
          await new Promise(r => setTimeout(r, 200));
        }

        // ------------------------------------------------------------
        // ACTION 6: [FINISH]
        // ------------------------------------------------------------
        if (turnOutput.includes('[FINISH]') || turnOutput.includes('</finish>')) {
          isTaskFinished = true;
          const finishMatch = turnOutput.match(/\[FINISH\]([\s\S]*?)\[\/FINISH\]/i) || turnOutput.match(/<finish>([\s\S]*?)<\/finish>/i);
          if (finishMatch && finishMatch[1]) {
            finalSummary = finishMatch[1].trim();
          }
        }

        // FIXED: Don't prematurely terminate. Only stop if:
        // - Model explicitly said [FINISH]
        // - 2 consecutive turns with zero tool calls (model is stuck)
        if (!isTaskFinished) {
          if (toolFeedback.length === 0) {
            consecutiveEmptyTurns++;
            if (consecutiveEmptyTurns >= 2) {
              isTaskFinished = true;
            }
          } else {
            consecutiveEmptyTurns = 0;
            // Feed tool execution results back to LLM for next turn reasoning
            conversationHistory.push({
              role: 'user',
              content: `Tool execution results from workspace:\n${toolFeedback.join('\n\n')}\n\nContinue to the next step. When fully done, end with [FINISH].`
            });
          }
        }

        turn++;
      }

      if (abortCtrl.signal.aborted) {
        updateTaskState({
          status: 'cancelled',
          finalAnswer: '⏹ Task execution cancelled by user.',
          actionsTaken
        });
        showNotification('⏹ Task dihentikan');
        return;
      }

      if (primaryFileToOpen) {
        setActiveFileName(primaryFileToOpen);
        if (!openTabs.includes(primaryFileToOpen)) {
          setOpenTabs(prev => [...prev, primaryFileToOpen]);
        }
      }

      // Persist full workspace state to cloud database & Management Office
      await handleSaveToCloud();
      fetchCloudProjects();

      const cleanDisplay = finalSummary || `✅ ReAct loop complete: ${actionsTaken.length} actions executed across ${turn - 1} turns. Semua berkas tersimpan ke Cloud Storage.`;

      updateTaskState({
        status: 'completed',
        finalAnswer: cleanDisplay,
        actionsTaken: actionsTaken,
        steps: [...taskSteps]
      });

      showNotification(`⚡ Task selesai & tersimpan di Cloud Storage`);

    } catch (err) {
      if (err.name === 'AbortError' || abortCtrl.signal.aborted) {
        updateTaskState({
          status: 'cancelled',
          finalAnswer: '⏹ Task execution cancelled by user.',
          actionsTaken
        });
      } else {
        updateTaskState({
          status: 'failed',
          finalAnswer: `⚠️ Execution error: ${err.message}`
        });
      }
    } finally {
      setIsAiGenerating(false);
      setIsFlowRunning(false);
      setAgentActionStatus('');
      currentAbortCtrlRef.current = null;
    }
  };

  const handleSendAiPrompt = async (customPrompt = null) => {
    const textToSend = customPrompt || aiPrompt;
    if (!textToSend.trim() || isAiGenerating) return;
    setAiPrompt('');
    await runReActControlLoop(textToSend);
  };

  // Auto-start CodeDance Autonomous IDE task if navigated from ChatBot with a task prompt
  useEffect(() => {
    try {
      const autoPrompt = sessionStorage.getItem('codedance_auto_task_prompt') || localStorage.getItem('codedance_auto_task_prompt');
      if (autoPrompt && autoPrompt.trim()) {
        sessionStorage.removeItem('codedance_auto_task_prompt');
        localStorage.removeItem('codedance_auto_task_prompt');
        setAiPrompt(autoPrompt);
        setActiveActivity('ai');
        setIsSidebarOpen(true);
        const timer = setTimeout(() => {
          handleSendAiPrompt(autoPrompt);
        }, 900);
        return () => clearTimeout(timer);
      }
    } catch (_e) {}
  }, []);

  // Monaco Editor Lifecycle
  useEffect(() => {
    if (files.length === 0 || !monacoContainerRef.current) return;

    let isCancelled = false;

    loadMonaco().then(monaco => {
      if (isCancelled || !monacoContainerRef.current) return;

      try {
        monaco.editor.defineTheme('deepernova-orange-light', {
          base: 'vs',
          inherit: true,
          rules: [
            { token: 'keyword', foreground: 'ea580c', fontStyle: 'bold' },
            { token: 'identifier', foreground: '0f172a' },
            { token: 'string', foreground: '16a34a' },
            { token: 'number', foreground: 'd97706' },
            { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
            { token: 'type', foreground: '2563eb' },
            { token: 'tag', foreground: 'ea580c' },
            { token: 'attribute.name', foreground: 'd97706' }
          ],
          colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#0f172a',
            'editorCursor.foreground': '#ea580c',
            'editor.lineHighlightBackground': '#fff7ed',
            'editorLineNumber.foreground': '#cbd5e1',
            'editorLineNumber.activeForeground': '#ea580c',
            'editorIndentGuide.background': '#f1f5f9',
            'editorIndentGuide.activeBackground': '#fed7aa',
            'editor.selectionBackground': '#ffedd5',
            'editor.inactiveSelectionBackground': '#fff7ed'
          }
        });
      } catch (e) {}

      const monacoThemeName = theme === 'white-orange' ? 'deepernova-orange-light' : theme === 'vs-light' ? 'vs' : 'vs-dark';

      if (!monacoEditorInstanceRef.current) {
        monacoContainerRef.current.innerHTML = '';
        const editor = monaco.editor.create(monacoContainerRef.current, {
          value: activeFile.content || '',
          language: getMonacoLanguage(activeFile.name),
          theme: monacoThemeName,
          fontSize: fontSize,
          tabSize: tabSize,
          wordWrap: wordWrap === 'on' ? 'on' : 'off',
          minimap: { enabled: true },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          lineNumbers: 'on',
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnPaste: true,
          formatOnType: true,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace"
        });

        monacoEditorInstanceRef.current = editor;

        editor.onDidChangeModelContent(() => {
          if (!isInternalUpdateRef.current) {
            const val = editor.getValue();
            handleContentChange(val);
          }
        });

        editor.onDidChangeCursorPosition((e) => {
          setCursorPos({ line: e.position.lineNumber, col: e.position.column });
        });

        editor.addCommand(monaco.KeyCode.F5, () => {
          handleRunActiveCode();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          handleSaveToCloud();
        });

        // Register Open with Live Server in Monaco context menu (Alt+L)
        editor.addAction({
          id: 'open-live-server',
          label: '🌐 Open with Live Server',
          keybindings: [
            monaco.KeyMod.Alt | monaco.KeyCode.KeyL
          ],
          contextMenuGroupId: 'navigation',
          contextMenuOrder: 1.5,
          run: () => {
            handleOpenLiveServer();
          }
        });
      } else {
        const editor = monacoEditorInstanceRef.current;
        const currentVal = editor.getValue();
        const targetLang = getMonacoLanguage(activeFile.name);
        
        const model = editor.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, targetLang);
          if (currentVal !== activeFile.content) {
            isInternalUpdateRef.current = true;
            editor.setValue(activeFile.content || '');
            isInternalUpdateRef.current = false;
          }
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeFileName, files.length]);

  // Update Monaco Options
  useEffect(() => {
    if (monacoEditorInstanceRef.current && typeof window !== 'undefined' && window.monaco) {
      monacoEditorInstanceRef.current.updateOptions({
        fontSize,
        tabSize,
        wordWrap: wordWrap === 'on' ? 'on' : 'off'
      });
      const monacoThemeName = theme === 'white-orange' ? 'deepernova-orange-light' : theme === 'vs-light' ? 'vs' : 'vs-dark';
      window.monaco.editor.setTheme(monacoThemeName);
    }
  }, [fontSize, tabSize, wordWrap, theme]);

  // Clean up Monaco
  useEffect(() => {
    return () => {
      if (monacoEditorInstanceRef.current) {
        monacoEditorInstanceRef.current.dispose();
        monacoEditorInstanceRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // RECURSIVE FILE & FOLDER TREE NODE RENDERER (VS CODE EXPLORER)
  // ============================================================
  const renderTreeNode = (node, depth = 0) => {
    const isFolder = node.type === 'folder';
    const isOpen = expandedFolders.has(node.path);
    const isSelected = activeFileName === node.path;
    const isRenaming = renamingPath === node.path;
    const isCreatingInside = creatingItemInFolder && creatingItemInFolder.folderPath === node.path;
    const iconInfo = getFileIconInfo(node.name, isFolder, isOpen);
    const paddingLeft = depth * 14 + 12;

    return (
      <div key={node.path} className="tree-node-container">
        {/* Node Row */}
        <div 
          className={`tree-item-row ${isSelected ? 'selected' : ''} ${isFolder ? 'folder-row' : 'file-row'}`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => {
            if (isFolder) {
              handleToggleFolder(node.path);
            } else {
              handleSelectFile(node.path);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              item: node,
              isFolder
            });
          }}
          title={node.path}
        >
          {/* Guide Indentation Lines */}
          {Array.from({ length: depth }).map((_, i) => (
            <span key={i} className="tree-guide-indent" style={{ left: `${i * 14 + 14}px` }} />
          ))}

          {/* Caret / Chevron for folder */}
          {isFolder ? (
            <span 
              className="tree-folder-caret" 
              onClick={(e) => { 
                e.stopPropagation(); 
                handleToggleFolder(node.path); 
              }}
            >
              {isOpen ? '▾' : '▸'}
            </span>
          ) : (
            <span className="tree-file-spacer" />
          )}

          {/* File/Folder Icon */}
          <span className="tree-node-icon" style={{ color: iconInfo.color }}>
            {iconInfo.icon}
          </span>

          {/* Name or Inline Rename Input */}
          {isRenaming ? (
            <input
              type="text"
              className="tree-inline-input"
              value={renamingValue}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setRenamingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameItem(node.path, renamingValue, isFolder);
                if (e.key === 'Escape') setRenamingPath(null);
              }}
              onBlur={() => handleRenameItem(node.path, renamingValue, isFolder)}
            />
          ) : (
            <span className="tree-node-name">{node.name}</span>
          )}

          {/* Dirty Dot for unsaved file */}
          {!isFolder && dirtyFiles.has(node.path) && <span className="tree-dirty-dot">●</span>}

          {/* Action Hover Buttons */}
          <div className="tree-hover-actions" onClick={(e) => e.stopPropagation()}>
            {isFolder && (
              <>
                <button 
                  className="tree-action-btn" 
                  onClick={() => { 
                    setExpandedFolders(p => new Set(p).add(node.path)); 
                    setCreatingItemInFolder({ folderPath: node.path, type: 'file' }); 
                  }} 
                  title="Buat Berkas di folder ini"
                >
                  <i className="fa-solid fa-file-circle-plus"></i>
                </button>
                <button 
                  className="tree-action-btn" 
                  onClick={() => { 
                    setExpandedFolders(p => new Set(p).add(node.path)); 
                    setCreatingItemInFolder({ folderPath: node.path, type: 'folder' }); 
                  }} 
                  title="Buat Subfolder di folder ini"
                >
                  <i className="fa-solid fa-folder-plus"></i>
                </button>
              </>
            )}
            <button 
              className="tree-action-btn" 
              onClick={() => { 
                setRenamingPath(node.path); 
                setRenamingValue(node.name); 
              }} 
              title="Ganti Nama"
            >
              <i className="fa-solid fa-pen"></i>
            </button>
            <button 
              className="tree-action-btn danger" 
              onClick={() => handleDeleteItem(node.path, isFolder)} 
              title="Hapus"
            >
              <i className="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        {/* Inline Create Row inside this folder */}
        {isFolder && isOpen && isCreatingInside && (
          <div className="tree-create-input-row" style={{ paddingLeft: `${paddingLeft + 16}px` }}>
            <span className="tree-item-icon">{creatingItemInFolder.type === 'folder' ? '📁' : '📄'}</span>
            <input
              type="text"
              className="tree-inline-input"
              placeholder={creatingItemInFolder.type === 'folder' ? 'nama_folder' : 'nama_file.jsx'}
              value={newItemName}
              autoFocus
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNewItem(node.path, creatingItemInFolder.type, newItemName);
                if (e.key === 'Escape') setCreatingItemInFolder(null);
              }}
              onBlur={() => {
                if (newItemName.trim()) handleCreateNewItem(node.path, creatingItemInFolder.type, newItemName);
                else setCreatingItemInFolder(null);
              }}
            />
          </div>
        )}

        {/* Children if folder is expanded */}
        {isFolder && isOpen && node.children && (
          <div className="tree-node-children">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`vscode-ide-container theme-${theme}`}>
      {/* VS Code Pixel-Perfect Titlebar / Window Header */}
      <header className="vscode-menu-bar">
        <div className="menu-bar-left">
          {/* VS Code Blue Ribbon Logo */}
          <div className="vscode-brand-logo" onClick={() => onNavigate?.('universe')} title="Deepernova CodeDance - Back to Universe">
            <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
              <path d="M72.2 96.5L98.5 73.1C99.5 72.2 100 70.9 100 69.6V30.4C100 29.1 99.5 27.8 98.5 26.9L72.2 3.5C70.6 2.1 68.3 2.1 66.8 3.5L25.3 40.5L9.6 28.5C8.3 27.5 6.4 27.7 5.3 29L1.5 33.6C0.5 34.8 0.7 36.6 1.9 37.6L16.2 49.9L1.9 62.3C0.7 63.3 0.5 65.1 1.5 66.3L5.3 70.9C6.4 72.2 8.3 72.4 9.6 71.4L25.3 59.4L66.8 96.5C68.3 97.9 70.6 97.9 72.2 96.5Z" fill="#007ACC"/>
            </svg>
          </div>

          <div className="vscode-top-menus">
            <span className="top-menu-item" onClick={() => handleCreateFile()}>File</span>
            <span className="top-menu-item" onClick={() => monacoEditorInstanceRef.current?.focus()}>Edit</span>
            <span className="top-menu-item">Selection</span>
            <span className="top-menu-item" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>View</span>
            <span className="top-menu-item">Go</span>
            <span className="top-menu-item" onClick={() => handleRunActiveCode()}>Run</span>
            <span className="top-menu-item" onClick={() => { setIsBottomPanelOpen(true); setActiveBottomTab('terminal'); }}>Terminal</span>
            <span className="top-menu-item" onClick={() => setIsCloudExplorerOpen(true)}>Help</span>
          </div>
        </div>

        {/* Center VS Code Command Center (Search & Project Switcher) */}
        <div className="menu-bar-center">
          <div className="vscode-command-center" onClick={() => setIsCloudExplorerOpen(true)} title="Quick Open & Cloud Projects (Ctrl+P)">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <span className="command-text">{projectName} — {activeFileName || 'index.html'}</span>
            <kbd className="command-kbd">Ctrl+P</kbd>
          </div>

          {highlightNotification && (
            <div className="notification-pill">
              {highlightNotification}
            </div>
          )}

          {agentActionStatus && (
            <div className="agentic-action-pill">
              <span className="pulse-dot"></span>
              {agentActionStatus}
              {isFlowRunning && (
                <button className="topbar-cancel-flow-btn" onClick={handleCancelTask} title="Hentikan eksekusi AI">
                  ⏹ Stop
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right VS Code Action Controls */}
        <div className="menu-bar-right">
          <button 
            className="vs-action-btn run-btn"
            onClick={() => handleRunActiveCode()} 
            title="Run Code / Live Preview (F5)"
          >
            <i className="fa-solid fa-play"></i>
            <span className="btn-label">Run</span>
          </button>

          <button 
            className={`vs-action-btn preview-btn ${isPreviewOpen ? 'active' : ''}`}
            onClick={() => handleToggleLivePreview()}
            title="Toggle Live Web & React App Preview"
          >
            <i className="fa-solid fa-display"></i>
            <span className="btn-label">Live Preview</span>
          </button>

          <button 
            className="vs-action-btn cloud-save-btn" 
            onClick={() => handleSaveToCloud()}
            disabled={isSavingCloud}
            title="Save all files to Cloud Vault (Ctrl+S)"
          >
            <i className={`fa-solid ${isSavingCloud ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i>
            <span className="btn-label">{isSavingCloud ? 'Saving...' : 'Save'}</span>
          </button>

          <div className="menu-separator"></div>

          <button 
            className={`vs-layout-btn ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle Primary Side Bar (Ctrl+B)"
          >
            <i className="fa-solid fa-table-columns"></i>
          </button>

          <button 
            className={`vs-layout-btn ${isBottomPanelOpen ? 'active' : ''}`}
            onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
            title="Toggle Panel (Ctrl+J)"
          >
            <i className="fa-solid fa-terminal"></i>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="vscode-workspace">
        {/* Left Activity Bar */}
        <div className="vscode-activity-bar">
          <div className="activity-bar-top">
            <button 
              className={`activity-icon ${activeActivity === 'files' && isSidebarOpen ? 'active' : ''}`}
              onClick={() => { setActiveActivity('files'); setIsSidebarOpen(true); }}
              title="Explorer (Ctrl+Shift+E)"
            >
              <i className="fa-regular fa-folder-open"></i>
              {files.length > 0 && <span className="activity-badge">{files.length}</span>}
            </button>

            <button 
              className={`activity-icon ${activeActivity === 'ai' && isSidebarOpen ? 'active' : ''}`}
              onClick={() => { setActiveActivity('ai'); setIsSidebarOpen(true); }}
              title="AI Agentic Copilot (Deepernova AI)"
            >
              <span className="activity-icon-glow">🤖</span>
              {isFlowRunning && <span className="flow-live-dot"></span>}
            </button>

            <button 
              className={`activity-icon ${activeActivity === 'cloud' && isSidebarOpen ? 'active' : ''}`}
              onClick={() => { setActiveActivity('cloud'); setIsSidebarOpen(true); }}
              title="Source Control & Cloud Storage Vault"
            >
              <i className="fa-solid fa-code-branch"></i>
            </button>

            <button 
              className={`activity-icon ${activeActivity === 'run' && isSidebarOpen ? 'active' : ''}`}
              onClick={() => { handleRunActiveCode(); }}
              title="Run and Debug (F5)"
            >
              <i className="fa-solid fa-play"></i>
            </button>
          </div>

          <div className="activity-bar-bottom">
            <button 
              className="activity-icon"
              onClick={() => setIsCloudExplorerOpen(true)}
              title={`Akun: ${user?.email || 'authenticated@deepernova.com'}`}
            >
              <i className="fa-regular fa-user"></i>
            </button>

            <button 
              className={`activity-icon ${activeActivity === 'settings' && isSidebarOpen ? 'active' : ''}`}
              onClick={() => { setActiveActivity('settings'); setIsSidebarOpen(true); }}
              title="Settings (Preferences)"
            >
              <i className="fa-solid fa-gear"></i>
            </button>
          </div>
        </div>

        {/* Left Sidebar */}
        {isSidebarOpen && (
          <aside className="vscode-sidebar">
            {/* 1. AGENTIC AI COPILOT TAB */}
            {activeActivity === 'ai' && (
              <div className="sidebar-section ai-copilot-section">
                <div className="sidebar-header ai-agent-glowing-header">
                  <div className="header-title-group">
                    <span className="header-title-text"><i className="fa-solid fa-brain" style={{ color: '#a855f7', marginRight: '6px' }}></i> DEEPERNOVA AGENT</span>
                    <span className="ai-status-tag" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#ffffff', border: 'none', fontWeight: 800, padding: '2px 6px' }}>ReAct Loop</span>
                  </div>
                  <div className="ai-model-pill" style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    ⚡ SYNAPSE ULTRA
                  </div>
                </div>

                {/* Agentic Living Activity Chain Tasks (Cursor Composer Style) */}
                <div className="ai-chat-history">
                  {tasks.length === 0 ? (
                    <div className="ai-empty-state-clean">
                      <div className="ai-empty-glow-icon" style={{ fontSize: '32px', marginBottom: '8px', filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.6))' }}>
                        🧠
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>Deepernova AI Copilot</h4>
                      <p className="ai-empty-greeting" style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                        Ceritakan ide proyek atau fitur kamu, {user?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Developer')} — AI akan merancang, mengedit berkas, dan mengeksekusi di Cloud Sandbox secara mandiri!
                      </p>
                    </div>
                  ) : (
                    tasks.map(taskItem => (
                      <AgenticTaskChainView 
                        key={taskItem.taskId}
                        task={taskItem}
                        onOpenFile={handleSelectFile}
                        onOpenTerminal={() => { setIsBottomPanelOpen(true); setActiveBottomTab('terminal'); }}
                        onRevertFile={handleRevertFile}
                        onCancelTask={handleCancelTask}
                      />
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Modern Clean AI Chat Input Composer (Cursor & ChatGPT Style) */}
                <div className="modern-ai-composer-wrapper">
                  <form 
                    className={`modern-ai-composer-container ${isFlowRunning ? 'is-running' : ''}`}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!isFlowRunning) handleSendAiPrompt();
                    }}
                  >
                    <textarea
                      className="modern-composer-textarea"
                      placeholder={isFlowRunning ? "AI sedang bekerja... (Tekan Stop untuk membatalkan)" : "Instruksikan AI (contoh: 'Bikin landing page modern', 'Fix bug navbar')..."}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (!isFlowRunning) handleSendAiPrompt();
                        }
                      }}
                      rows={1}
                    />
                    <div className="modern-composer-footer">
                      <div className="composer-hints">
                        {isFlowRunning ? (
                          <span className="live-ai-badge">
                            <span className="live-dot-pulse"></span>
                            Agentic Loop Active
                          </span>
                        ) : (
                          <span className="key-hint">
                            <kbd>↵</kbd> Kirim • <kbd>Shift+↵</kbd> Baris baru
                          </span>
                        )}
                      </div>

                      <div className="composer-actions">
                        {isFlowRunning ? (
                          <button 
                            type="button" 
                            className="composer-action-btn stop-generating-btn"
                            onClick={handleCancelTask}
                            title="Stop Generating (Hentikan AI)"
                          >
                            <i className="fa-solid fa-square"></i>
                          </button>
                        ) : (
                          <button 
                            type="submit" 
                            className="composer-action-btn send-prompt-btn" 
                            disabled={!aiPrompt.trim()}
                            title="Kirim Instruksi (Enter)"
                          >
                            <i className="fa-solid fa-arrow-up"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 2. VS CODE HIERARCHICAL FILE & FOLDER EXPLORER TAB */}
            {activeActivity === 'files' && (
              <div className="sidebar-section file-explorer-section">
                <div className="sidebar-header">
                  <span className="sidebar-header-title">EXPLORER</span>
                  <div className="sidebar-actions">
                    <button className="exp-hdr-btn" onClick={() => setIsCloudExplorerOpen(true)} title="Buka Proyek dari Cloud">
                      <i className="fa-solid fa-cloud"></i>
                    </button>
                    <button className="exp-hdr-btn" onClick={() => setCreatingItemInFolder({ folderPath: '', type: 'file' })} title="Buat Berkas Baru">
                      <i className="fa-solid fa-file-circle-plus"></i>
                    </button>
                    <button className="exp-hdr-btn" onClick={() => setCreatingItemInFolder({ folderPath: '', type: 'folder' })} title="Buat Folder Baru">
                      <i className="fa-solid fa-folder-plus"></i>
                    </button>
                    <button className="exp-hdr-btn" onClick={fetchCloudProjects} title="Refresh">
                      <i className="fa-solid fa-rotate-right"></i>
                    </button>
                    <button className="exp-hdr-btn" onClick={handleCollapseAllFolders} title="Tutup Semua Folder">
                      <i className="fa-solid fa-chevron-up"></i>
                    </button>
                  </div>
                </div>

                {/* Root Workspace Project Accordion */}
                <div className="vscode-tree-container">
                  <div className="tree-root-header" onClick={() => setIsExplorerRootExpanded(!isExplorerRootExpanded)}>
                    <span className="tree-root-caret">{isExplorerRootExpanded ? '▾' : '▸'}</span>
                    <span className="tree-root-name">{projectName.toUpperCase()}</span>
                    <div className="tree-root-actions" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setCreatingItemInFolder({ folderPath: '', type: 'file' })} title="New File">
                        <i className="fa-solid fa-file-circle-plus"></i>
                      </button>
                      <button onClick={() => setCreatingItemInFolder({ folderPath: '', type: 'folder' })} title="New Folder">
                        <i className="fa-solid fa-folder-plus"></i>
                      </button>
                      <button onClick={handleExpandAllFolders} title="Expand All">
                        <i className="fa-solid fa-chevron-down"></i>
                      </button>
                    </div>
                  </div>

                  {isExplorerRootExpanded && (
                    <div className="tree-content-body">
                      {/* Inline Input for Root Item Creation */}
                      {creatingItemInFolder && creatingItemInFolder.folderPath === '' && (
                        <div className="tree-create-input-row" style={{ paddingLeft: '22px' }}>
                          <span className="tree-item-icon">{creatingItemInFolder.type === 'folder' ? '📁' : '📄'}</span>
                          <input
                            type="text"
                            className="tree-inline-input"
                            placeholder={creatingItemInFolder.type === 'folder' ? 'nama_folder' : 'nama_file.jsx'}
                            value={newItemName}
                            autoFocus
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateNewItem('', creatingItemInFolder.type, newItemName);
                              if (e.key === 'Escape') setCreatingItemInFolder(null);
                            }}
                            onBlur={() => {
                              if (newItemName.trim()) handleCreateNewItem('', creatingItemInFolder.type, newItemName);
                              else setCreatingItemInFolder(null);
                            }}
                          />
                        </div>
                      )}

                      {/* Recursive Tree Nodes */}
                      {hierarchicalTree.length === 0 ? (
                        <div className="empty-files-hint">
                          Belum ada berkas. Klik '+' atau minta AI untuk membuatnya.
                        </div>
                      ) : (
                        hierarchicalTree.map(node => renderTreeNode(node, 0))
                      )}
                    </div>
                  )}

                  {/* Outline Section Accordion */}
                  <div className="tree-root-header secondary-accordion">
                    <span className="tree-root-caret">▸</span>
                    <span className="tree-root-name">OUTLINE</span>
                  </div>

                  {/* Timeline Section Accordion */}
                  <div className="tree-root-header secondary-accordion">
                    <span className="tree-root-caret">▸</span>
                    <span className="tree-root-name">TIMELINE</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CLOUD STORAGE TAB */}
            {activeActivity === 'cloud' && (
              <div className="sidebar-section cloud-vault-section">
                <div className="sidebar-header">
                  <span className="sidebar-header-title">☁️ CLOUD VAULT</span>
                  <div className="sidebar-actions">
                    <button onClick={() => setIsCloudExplorerOpen(true)} title="Buka Management Office Cloud Explorer">📂</button>
                  </div>
                </div>
                <div className="cloud-projects-list">
                  {cloudProjects.length === 0 ? (
                    <div className="empty-cloud-hint">Belum ada proyek tersimpan di cloud.</div>
                  ) : (
                    cloudProjects.map(proj => (
                      <div key={proj.id} className="cloud-project-card" onClick={() => {
                        handleSelectWorkspaceFolder(proj);
                      }}>
                        <div className="card-title">📁 {proj.name}</div>
                        <div className="card-meta">{proj.files?.length || proj.projectData?.files?.length || 0} berkas • {new Date(proj.updatedAt || Date.now()).toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. SETTINGS TAB */}
            {activeActivity === 'settings' && (
              <div className="sidebar-section settings-section">
                <div className="sidebar-header">
                  <span className="sidebar-header-title">⚙️ SETTINGS</span>
                </div>
                <div className="setting-item">
                  <label>Tema Tampilan</label>
                  <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option value="vs-dark">VS Code Dark Modern (Default)</option>
                    <option value="white-orange">White & Orange</option>
                    <option value="vs-light">VS Code Light</option>
                  </select>
                </div>
                <div className="setting-item">
                  <label>Ukuran Font: {fontSize}px</label>
                  <input type="range" min="12" max="22" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} />
                </div>
                <div className="setting-item">
                  <label>Word Wrap</label>
                  <select value={wordWrap} onChange={(e) => setWordWrap(e.target.value)}>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Center Editor Pane */}
        <main className="vscode-editor-pane">
          {/* Tabs Bar */}
          <div className="vscode-tabs-bar">
            {Array.from(new Set(openTabs)).map(tabName => {
              const fileIcon = getFileIconInfo(tabName);
              return (
                <div 
                  key={tabName} 
                  className={`vscode-tab ${tabName === activeFileName ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFileName(tabName);
                    const activeFileObj = (filesRef.current || files).find(f => f.name === tabName);
                    if (monacoEditorInstanceRef.current && activeFileObj) {
                      isInternalUpdateRef.current = true;
                      monacoEditorInstanceRef.current.setValue(activeFileObj.content || '');
                      isInternalUpdateRef.current = false;
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const fileObj = files.find(f => f.name === tabName) || { name: tabName };
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      item: fileObj,
                      isFolder: false
                    });
                  }}
                >
                  <span className="tab-icon" style={{ color: fileIcon.color }}>
                    {fileIcon.icon}
                  </span>
                  <span className="tab-name">{tabName.split('/').pop()}</span>
                  {dirtyFiles.has(tabName) && <span className="tab-dirty">●</span>}
                  <button 
                    type="button"
                    className="tab-close-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleCloseTab(e, tabName);
                    }}
                    title="Tutup tab"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* VS Code Breadcrumbs Navigation Bar */}
          <div className="vscode-breadcrumbs">
            <span className="clickable-crumb" onClick={() => setIsCloudExplorerOpen(true)} title="Ganti folder workspace">
              <i className="fa-solid fa-folder-tree"></i> {projectName}
            </span>
            {activeFileName ? (
              activeFileName.split('/').map((part, idx, arr) => (
                <React.Fragment key={idx}>
                  <span className="crumb-sep">›</span>
                  <span className={`crumb-part ${idx === arr.length - 1 ? 'crumb-active' : ''}`}>
                    {idx === arr.length - 1 ? getFileIconInfo(part).icon : '📁'} {part}
                  </span>
                </React.Fragment>
              ))
            ) : (
              <>
                <span className="crumb-sep">›</span>
                <span className="crumb-part crumb-active">No file open</span>
              </>
            )}
          </div>

          {/* Split Pane: Code Editor + Embedded Live Web & React Preview */}
          <div className={`vscode-split-pane ${isPreviewOpen ? 'with-preview' : ''}`}>
            {/* Editor Canvas Wrapper */}
            <div className={`vscode-editor-canvas-wrapper ${mobileActiveTab !== 'editor' ? 'mobile-hidden' : ''}`}>
              {files.length === 0 ? (
                <div className="vscode-empty-workspace-view minimalist-workspace">
                  <div className="empty-workspace-inner">
                    <div className="empty-hero-badge">⚡ WORKSPACE KOSONG</div>
                    <h2 className="empty-hero-title">CodeDance Studio</h2>
                    <p className="empty-hero-subtitle">
                      Autonomous cloud coding environment. Pilih folder di <strong>Cloud Explorer</strong> atau buat berkas baru:
                    </p>

                    {/* Minimalist Starter Action Buttons */}
                    <div className="empty-minimal-starters">
                      <button className="minimal-starter-btn primary-folder-starter" onClick={() => setIsCloudExplorerOpen(true)}>
                        <span className="btn-icon">📁</span> Buka Folder Cloud (Management Office)
                      </button>
                      <button className="minimal-starter-btn" onClick={() => handleCreateFile()}>
                        <span className="btn-icon">+</span> Buat Berkas Baru
                      </button>
                      <button className="minimal-starter-btn" onClick={() => handleCreateFile('index.html')}>
                        <span className="btn-icon">📄</span> index.html
                      </button>
                      <button className="minimal-starter-btn" onClick={() => handleCreateFile('App.jsx')}>
                        <span className="btn-icon">⚛️</span> App.jsx (React)
                      </button>
                      <button className="minimal-starter-btn" onClick={() => handleCreateFile('main.py')}>
                        <span className="btn-icon">🐍</span> main.py
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="vscode-editor-canvas">
                  <div 
                    ref={monacoContainerRef} 
                    className="monaco-editor-host"
                  />
                </div>
              )}

              {/* Mobile Touch Coding Accessory Bar */}
              <div className="vscode-mobile-accessory-bar">
                {['TAB', '{', '}', '(', ')', '[', ']', ';', '=', '<', '>', '/', '"', "'", '$'].map(sym => (
                  <button 
                    key={sym} 
                    className="mobile-key-btn" 
                    type="button"
                    onClick={() => handleInsertMobileKey(sym)}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Embedded Live Web & React Preview Panel */}
            {isPreviewOpen && (
              <div className={`vscode-live-preview-panel ${mobileActiveTab !== 'preview' ? 'mobile-hidden' : ''}`}>
                {/* Preview Toolbar */}
                <div className="preview-toolbar">
                  <div className="preview-toolbar-left">
                    <span className="preview-live-indicator">● LIVE</span>
                    <span className="preview-url-badge">http://cloud-sandbox:5500/{activeFileName || 'index.html'}</span>
                  </div>
                  
                  <div className="preview-device-switcher">
                    <button 
                      className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                      onClick={() => setPreviewDevice('desktop')}
                      title="Desktop View (100%)"
                    >
                      💻 Desktop
                    </button>
                    <button 
                      className={`device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                      onClick={() => setPreviewDevice('tablet')}
                      title="Tablet View (768px)"
                    >
                      📟 Tablet
                    </button>
                    <button 
                      className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                      onClick={() => setPreviewDevice('mobile')}
                      title="Mobile View (375px)"
                    >
                      📱 HP
                    </button>
                  </div>

                  <div className="preview-toolbar-right">
                    <button 
                      className="preview-action-btn" 
                      onClick={() => handleToggleLivePreview(true)} 
                      title="Reload Preview"
                    >
                      🔄 Reload
                    </button>
                    <button 
                      className="preview-action-btn" 
                      onClick={() => handleOpenExternalLiveServer()} 
                      title="Buka di Tab Baru"
                    >
                      ↗️ Tab Baru
                    </button>
                    <button 
                      className="preview-close-btn" 
                      onClick={() => setIsPreviewOpen(false)} 
                      title="Tutup Preview"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Preview Iframe Container */}
                <div className={`preview-viewport-wrapper device-${previewDevice}`}>
                  {previewBlobUrl ? (
                    <iframe 
                      key={previewReloadKey}
                      src={previewBlobUrl} 
                      className="preview-iframe"
                      title="Live App Preview"
                      sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
                    />
                  ) : (
                    <div className="preview-loading-state">
                      <div className="preview-spinner"></div>
                      <p>Mempersiapkan Live Sandbox Preview...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* VS Code Bottom Panel with True Native Interactive CLI Terminal */}
          {isBottomPanelOpen && (
            <div className={`vscode-bottom-panel ${mobileActiveTab === 'terminal' ? 'mobile-active' : mobileActiveTab !== 'editor' ? 'mobile-hidden' : ''}`}>
              <div className="bottom-panel-header">
                <div className="bottom-tabs">
                  <button 
                    className={`bottom-tab-btn ${activeBottomTab === 'problems' ? 'active' : ''}`}
                    onClick={() => setActiveBottomTab('problems')}
                  >
                    PROBLEMS <span className="tab-count-badge">0</span>
                  </button>
                  <button 
                    className={`bottom-tab-btn ${activeBottomTab === 'output' ? 'active' : ''}`}
                    onClick={() => setActiveBottomTab('output')}
                  >
                    OUTPUT
                  </button>
                  <button 
                    className={`bottom-tab-btn ${activeBottomTab === 'debug' ? 'active' : ''}`}
                    onClick={() => setActiveBottomTab('debug')}
                  >
                    DEBUG CONSOLE
                  </button>
                  <button 
                    className={`bottom-tab-btn ${activeBottomTab === 'terminal' ? 'active' : ''}`}
                    onClick={() => setActiveBottomTab('terminal')}
                  >
                    TERMINAL
                  </button>
                  <button 
                    className={`bottom-tab-btn ${activeBottomTab === 'ports' ? 'active' : ''}`}
                    onClick={() => setActiveBottomTab('ports')}
                  >
                    PORTS
                  </button>
                </div>

                <div className="bottom-panel-actions">
                  {activeBottomTab === 'terminal' && (
                    <>
                      <div className="terminal-selector-dropdown">
                        <span className="term-type-icon">{isTerminalRunning ? '⏳' : '⚡'}</span>
                        <span className="term-type-name">1: bash {isTerminalRunning ? '(running...)' : ''}</span>
                      </div>
                      {isTerminalRunning && (
                        <button 
                          className="panel-action-btn panel-kill-btn" 
                          onClick={() => {
                            terminalAbortCtrlRef.current?.abort();
                            fetch('/api/codedance/kill', { 
                              method: 'POST', 
                              headers: { 'Content-Type': 'application/json' }, 
                              body: JSON.stringify({ projectName }) 
                            }).catch(() => {});
                          }}
                          title="Stop Running Process (Ctrl+C)"
                          style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)', fontWeight: 600, padding: '2px 8px' }}
                        >
                          ⏹ Stop
                        </button>
                      )}
                      <button 
                        className="panel-action-btn" 
                        onClick={() => setTerminalHistory([{ type: 'system', text: '🌌 Deepernova Cloud Sandbox Terminal v2.5 (Online - 10 Min Timeout)' }])} 
                        title="Clear Terminal (Ctrl+L)"
                      >
                        <i className="fa-solid fa-ban"></i>
                      </button>
                      <button 
                        className="panel-action-btn" 
                        onClick={() => handleRunActiveCode()} 
                        title="Run Active File (F5)"
                      >
                        <i className="fa-solid fa-play"></i>
                      </button>
                      <button 
                        className="panel-action-btn" 
                        onClick={() => setTerminalHistory(prev => [...prev, { type: 'system', text: 'New terminal session created.' }])} 
                        title="New Terminal"
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </>
                  )}
                  <button 
                    className="panel-close-btn" 
                    onClick={() => setIsBottomPanelOpen(false)} 
                    title="Close Panel (Ctrl+J)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="bottom-panel-body">
                {/* 1. True Inline Flowing CLI Terminal (No separate web input box!) */}
                {activeBottomTab === 'terminal' && (
                  <div 
                    className="terminal-view-native" 
                    onClick={() => terminalInputRef.current?.focus()}
                  >
                    <div className="terminal-content-stream">
                      {terminalHistory.map((item, idx) => (
                        <div key={idx} className={`term-line term-${item.type}`}>
                          {item.type === 'input' && (
                            <span className="term-prompt">
                              <span className="prompt-user">deepernova</span>
                              <span className="prompt-at">@</span>
                              <span className="prompt-host">sandbox</span>
                              <span className="prompt-colon">:</span>
                              <span className="prompt-path">~/{projectName}</span>
                              <span className="prompt-dollar">$ </span>
                            </span>
                          )}
                          <span className="term-text-content">{renderAnsiText(item.text)}</span>
                        </div>
                      ))}

                      {/* Active Prompt Line with Typing and Blinking Cursor */}
                      <div className="terminal-active-line">
                        <span className="term-prompt">
                          <span className="prompt-user">deepernova</span>
                          <span className="prompt-at">@</span>
                          <span className="prompt-host">sandbox</span>
                          <span className="prompt-colon">:</span>
                          <span className="prompt-path">~/{projectName}</span>
                          <span className="prompt-dollar">$ </span>
                        </span>
                        <span className="term-typed-chars">{terminalInput}</span>
                        <span className="term-blinking-cursor">█</span>
                        
                        {/* Hidden native input for seamless keyboard & mobile typing */}
                        <input 
                          ref={terminalInputRef}
                          type="text" 
                          className="terminal-native-capture-input"
                          value={terminalInput}
                          autoFocus
                          onChange={(e) => setTerminalInput(e.target.value)}
                          onKeyDown={handleTerminalKeyDown}
                          spellCheck={false}
                          autoComplete="off"
                          autoCapitalize="none"
                        />
                      </div>
                      <div ref={terminalEndRef} />
                    </div>
                  </div>
                )}

                {/* 2. Problems Tab */}
                {activeBottomTab === 'problems' && (
                  <div className="problems-view-tab">
                    <div className="no-problems-msg">
                      <i className="fa-regular fa-circle-check"></i> No problems have been detected in the workspace.
                    </div>
                  </div>
                )}

                {/* 3. Raw Output */}
                {activeBottomTab === 'output' && (
                  <div className="output-view">
                    <pre>{executionOutput || 'Belum ada output eksekusi.'}</pre>
                  </div>
                )}

                {/* 4. Debug Console */}
                {activeBottomTab === 'debug' && (
                  <div className="debug-console-view">
                    <p className="debug-hint">Debug session is idle. Press F5 or Run to start debugging.</p>
                  </div>
                )}

                {/* 5. Ports Tab */}
                {activeBottomTab === 'ports' && (
                  <div className="ports-view">
                    <table className="ports-table">
                      <thead>
                        <tr>
                          <th>Port</th>
                          <th>Protocol</th>
                          <th>Local Address</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>5173 / 5500</td>
                          <td>HTTP</td>
                          <td>http://localhost:5500</td>
                          <td><span className="port-active-dot">●</span> Forwarded (Live Preview)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Screen Bottom Navigation Bar (HP Friendly) */}
      <nav className="vscode-mobile-bottom-nav">
        <button 
          className={`mobile-nav-btn ${mobileActiveTab === 'editor' ? 'active' : ''}`}
          onClick={() => { setMobileActiveTab('editor'); setIsSidebarOpen(false); }}
        >
          <span className="nav-icon">📝</span>
          <span className="nav-label">Editor</span>
        </button>
        <button 
          className={`mobile-nav-btn ${mobileActiveTab === 'preview' ? 'active' : ''}`}
          onClick={() => { handleToggleLivePreview(true); setMobileActiveTab('preview'); }}
        >
          <span className="nav-icon">🌐</span>
          <span className="nav-label">Preview</span>
          {isPreviewOpen && <span className="mobile-live-dot">●</span>}
        </button>
        <button 
          className={`mobile-nav-btn ${mobileActiveTab === 'terminal' ? 'active' : ''}`}
          onClick={() => { setIsBottomPanelOpen(true); setActiveBottomTab('terminal'); setMobileActiveTab('terminal'); }}
        >
          <span className="nav-icon">💻</span>
          <span className="nav-label">Terminal</span>
        </button>
        <button 
          className={`mobile-nav-btn ${mobileActiveTab === 'ai' ? 'active' : ''}`}
          onClick={() => { setActiveActivity('ai'); setIsSidebarOpen(true); setMobileActiveTab('ai'); }}
        >
          <span className="nav-icon">🤖</span>
          <span className="nav-label">AI Agent</span>
          {isFlowRunning && <span className="mobile-active-pulse">●</span>}
        </button>
      </nav>

      {/* VS Code Pixel-Perfect Bottom Status Bar */}
      <footer className="vscode-status-bar">
        <div className="status-left">
          <div className="status-item git-status" title="Source Control Git Branch">
            <i className="fa-solid fa-code-branch"></i>
            <span>main*</span>
          </div>
          <div className="status-item problems-status" title="No Problems">
            <span><i className="fa-regular fa-circle-xmark"></i> 0</span>
            <span><i className="fa-solid fa-triangle-exclamation"></i> 0</span>
          </div>
          <div className="status-item copilot-status" title="Cloud Execution Sandbox Status">
            <span className="live-status-dot">●</span>
            <span>Cloud Sandbox: Online</span>
          </div>
        </div>

        <div className="status-right">
          <div className="status-item" title="Cursor Line and Column">
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          </div>
          <div className="status-item" title="Tab Indentation">
            <span>Spaces: {tabSize}</span>
          </div>
          <div className="status-item" title="File Encoding">
            <span>UTF-8</span>
          </div>
          <div className="status-item" title="Line Endings">
            <span>LF</span>
          </div>
          <div className="status-item lang-badge" title="Language Mode">
            <span>{activeFileLang.toUpperCase()}</span>
          </div>
          <div className="status-item prettier-status" title="Code Formatter">
            <span>Prettier</span>
          </div>
          <div className="status-item bell-status" title="Notifications">
            <i className="fa-regular fa-bell"></i>
          </div>
        </div>
      </footer>

      {/* VS Code Pixel-Perfect Right-Click Context Menu */}
      {contextMenu && (
        <div 
          className="vscode-context-menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isFolder ? (
            <>
              <div 
                className="context-menu-item"
                onClick={() => {
                  setExpandedFolders(p => new Set(p).add(contextMenu.item.path));
                  setCreatingItemInFolder({ folderPath: contextMenu.item.path, type: 'file' });
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">📄</span>
                <span className="menu-item-text">New File...</span>
              </div>
              <div 
                className="context-menu-item"
                onClick={() => {
                  setExpandedFolders(p => new Set(p).add(contextMenu.item.path));
                  setCreatingItemInFolder({ folderPath: contextMenu.item.path, type: 'folder' });
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">📁</span>
                <span className="menu-item-text">New Folder...</span>
              </div>
              <div className="context-menu-separator" />
              <div 
                className="context-menu-item"
                onClick={() => {
                  setRenamingPath(contextMenu.item.path);
                  setRenamingValue(contextMenu.item.name);
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">✏️</span>
                <span className="menu-item-text">Rename...</span>
                <span className="menu-item-shortcut">F2</span>
              </div>
              <div 
                className="context-menu-item"
                onClick={() => {
                  navigator.clipboard?.writeText(contextMenu.item.path);
                  showNotification(`📋 Path disalin: ${contextMenu.item.path}`);
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">📋</span>
                <span className="menu-item-text">Copy Path</span>
              </div>
              <div className="context-menu-separator" />
              <div 
                className="context-menu-item danger-item"
                onClick={() => {
                  handleDeleteItem(contextMenu.item.path, true);
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">🗑️</span>
                <span className="menu-item-text">Delete Folder</span>
              </div>
            </>
          ) : (
            <>
              {(contextMenu.item?.path?.endsWith('.html') || contextMenu.item?.name?.endsWith('.html') || contextMenu.item?.path?.endsWith('.jsx')) && (
                <div 
                  className="context-menu-item highlight-live-server"
                  onClick={() => {
                    handleOpenLiveServer(contextMenu.item?.path || contextMenu.item?.name);
                    setContextMenu(null);
                  }}
                >
                  <span className="menu-item-icon">🌐</span>
                  <span className="menu-item-text">Open with Live Server</span>
                  <span className="menu-item-shortcut">Alt+L</span>
                </div>
              )}
              <div 
                className="context-menu-item"
                onClick={() => {
                  handleSelectFile(contextMenu.item?.path || contextMenu.item?.name);
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">📂</span>
                <span className="menu-item-text">Buka Berkas</span>
              </div>
              <div 
                className="context-menu-item"
                onClick={() => {
                  setRenamingPath(contextMenu.item?.path || contextMenu.item?.name);
                  setRenamingValue(contextMenu.item?.name);
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">✏️</span>
                <span className="menu-item-text">Ganti Nama...</span>
                <span className="menu-item-shortcut">F2</span>
              </div>
              <div 
                className="context-menu-item"
                onClick={() => {
                  navigator.clipboard?.writeText(contextMenu.item?.path || contextMenu.item?.name);
                  showNotification(`📋 Path disalin: ${contextMenu.item?.path || contextMenu.item?.name}`);
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">📋</span>
                <span className="menu-item-text">Copy Path</span>
              </div>
              <div className="context-menu-separator" />
              <div 
                className="context-menu-item danger-item"
                onClick={() => {
                  handleDeleteFile(contextMenu.item?.path || contextMenu.item?.name);
                  setContextMenu(null);
                }}
              >
                <span className="menu-item-icon">🗑️</span>
                <span className="menu-item-text">Hapus Berkas</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================
          MANAGEMENT OFFICE CLOUD EXPLORER MODAL (Full Drive & Workspace Picker)
          ============================================================ */}
      {isCloudExplorerOpen && (
        <div className="cloud-explorer-overlay" onClick={() => setIsCloudExplorerOpen(false)}>
          <div className="cloud-explorer-window" onClick={(e) => e.stopPropagation()}>
            {/* Window Header */}
            <div className="cloud-explorer-header">
              <div className="header-brand">
                <div className="cloud-icon-badge">📁</div>
                <div>
                  <h3 className="explorer-title">Cloud Storage Workspace Explorer</h3>
                  <div className="explorer-breadcrumb">
                    <span 
                      className={`clickable-crumb ${!currentDrillFolder ? 'active-crumb' : ''}`}
                      onClick={() => {
                        setCurrentDrillFolder(null);
                        setSelectedCloudFolder(null);
                        setSelectedCloudFile(null);
                      }}
                    >
                      Server Cloud Drive
                    </span>
                    {currentDrillFolder && (
                      <>
                        <span>›</span>
                        <span className="active-crumb">📁 {currentDrillFolder.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="header-actions">
                <button 
                  className={`refresh-sync-btn ${isSyncingExplorer ? 'spinning' : ''}`}
                  onClick={fetchCloudProjects}
                  title="Sinkronkan Berkas & Folder dari Server"
                  disabled={isSyncingExplorer}
                >
                  <i className={`fa-solid fa-arrows-rotate ${isSyncingExplorer ? 'fa-spin' : ''}`}></i>
                  <span>{isSyncingExplorer ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
                </button>

                <button 
                  className="new-folder-btn"
                  onClick={() => setIsCreatingNewFolder(true)}
                  title="Buat Folder Workspace Baru"
                >
                  <i className="fa-solid fa-folder-plus"></i> + Folder Baru
                </button>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsCloudExplorerOpen(false)}
                  title="Tutup Explorer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Toolbar Tabs & Search */}
            <div className="cloud-explorer-toolbar">
              <div className="explorer-category-tabs">
                <button 
                  className={`cat-tab-btn ${currentExplorerView === 'all' ? 'active' : ''}`}
                  onClick={() => { setCurrentExplorerView('all'); setCurrentDrillFolder(null); }}
                >
                  📁 Semua Folder ({cloudProjects.length})
                </button>
                <button 
                  className={`cat-tab-btn ${currentExplorerView === 'files' ? 'active' : ''}`}
                  onClick={() => { setCurrentExplorerView('files'); setCurrentDrillFolder(null); }}
                >
                  📄 Semua Berkas ({allCloudRawFiles.filter(f => f.category !== 'folder' && f.type !== 'folder').length})
                </button>
                <button 
                  className={`cat-tab-btn ${currentExplorerView === 'code' ? 'active' : ''}`}
                  onClick={() => { setCurrentExplorerView('code'); setCurrentDrillFolder(null); }}
                >
                  ⚡ Berkas Web & Script
                </button>
              </div>

              <div className="explorer-search-box">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input 
                  type="text" 
                  placeholder="Cari folder / berkas cloud..."
                  value={explorerSearchTerm}
                  onChange={(e) => setExplorerSearchTerm(e.target.value)}
                />
                {explorerSearchTerm && (
                  <button className="clear-search-btn" onClick={() => setExplorerSearchTerm('')}>✕</button>
                )}
              </div>
            </div>

            {/* Inline New Folder Input */}
            {isCreatingNewFolder && (
              <div className="inline-new-folder-bar">
                <i className="fa-solid fa-folder-plus text-orange"></i>
                <input 
                  type="text"
                  placeholder="Nama folder / proyek baru (contoh: my-awesome-app)..."
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNewCloudFolder();
                    if (e.key === 'Escape') setIsCreatingNewFolder(false);
                  }}
                />
                <button className="create-confirm-btn" onClick={handleCreateNewCloudFolder}>Buat Folder</button>
                <button className="create-cancel-btn" onClick={() => setIsCreatingNewFolder(false)}>Batal</button>
              </div>
            )}

            {/* Folder Grid Body */}
            <div className="cloud-explorer-body">
              {/* 1. DRILLDOWN VIEW INSIDE A FOLDER */}
              {currentDrillFolder ? (
                <div className="drilldown-folder-view">
                  <div className="drilldown-header-card">
                    <div className="drilldown-title-row">
                      <div className="drill-icon">📁</div>
                      <div>
                        <h3>{currentDrillFolder.name}</h3>
                        <p>{currentDrillFolder.files?.length || 0} berkas di dalam folder ini</p>
                      </div>
                    </div>
                    <div className="drilldown-actions">
                      <button 
                        className="drill-back-btn"
                        onClick={() => setCurrentDrillFolder(null)}
                      >
                        ‹ Kembali ke Folder Utama
                      </button>
                      <button 
                        className="drill-open-workspace-btn"
                        onClick={() => handleSelectWorkspaceFolder(currentDrillFolder)}
                      >
                        📂 Buka Seluruh Folder Sebagai Workspace
                      </button>
                    </div>
                  </div>

                  <div className="drilldown-files-grid">
                    {currentDrillFolder.files?.length === 0 ? (
                      <div className="empty-folder-hint">
                        Folder ini masih kosong. Klik "Buka Seluruh Folder Sebagai Workspace" untuk mulai menambahkan berkas.
                      </div>
                    ) : (
                      currentDrillFolder.files?.map(f => (
                        <div 
                          key={f.name} 
                          className="drilldown-file-card"
                          onClick={() => handleOpenIndividualFile(f)}
                        >
                          <div className="file-icon-box">
                            {f.name.endsWith('.html') ? '🌐' : f.name.endsWith('.css') ? '🎨' : f.name.endsWith('.py') ? '🐍' : f.name.endsWith('.js') ? '⚡' : f.name.endsWith('.json') ? '📋' : '📄'}
                          </div>
                          <div className="file-info-box">
                            <span className="file-card-name" title={f.name}>{f.name}</span>
                            <span className="file-card-sub">{f.size || '0.1 MB'}</span>
                          </div>
                          <button className="drill-open-single-file-btn" onClick={(e) => {
                            e.stopPropagation();
                            handleOpenIndividualFile(f);
                          }}>
                            Buka
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : currentExplorerView === 'files' || currentExplorerView === 'code' ? (
                /* 2. INDIVIDUAL FILES VIEW */
                <div className="cloud-individual-files-view">
                  {allCloudRawFiles
                    .filter(f => f.category !== 'folder' && f.type !== 'folder')
                    .filter(f => {
                      if (currentExplorerView === 'code') {
                        const name = (f.name || '').toLowerCase();
                        return name.endsWith('.html') || name.endsWith('.js') || name.endsWith('.css') || name.endsWith('.py') || name.endsWith('.json') || name.endsWith('.ts') || name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.code');
                      }
                      return true;
                    })
                    .filter(f => !explorerSearchTerm || (f.name || '').toLowerCase().includes(explorerSearchTerm.toLowerCase()))
                    .length === 0 ? (
                      <div className="empty-explorer-state">
                        <div className="empty-icon">📄</div>
                        <h4>Belum Ada Berkas di Cloud Storage</h4>
                        <p>Simpan dokumen di Management Office atau buat berkas di CodeDance IDE.</p>
                      </div>
                    ) : (
                      <div className="cloud-files-grid">
                        {allCloudRawFiles
                          .filter(f => f.category !== 'folder' && f.type !== 'folder')
                          .filter(f => {
                            if (currentExplorerView === 'code') {
                              const name = (f.name || '').toLowerCase();
                              return name.endsWith('.html') || name.endsWith('.js') || name.endsWith('.css') || name.endsWith('.py') || name.endsWith('.json') || name.endsWith('.ts') || name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.code');
                            }
                            return true;
                          })
                          .filter(f => !explorerSearchTerm || (f.name || '').toLowerCase().includes(explorerSearchTerm.toLowerCase()))
                          .map(fileItem => {
                            const isSelected = selectedCloudFile?.id === fileItem.id;
                            const name = fileItem.name || 'Untitled';
                            return (
                              <div 
                                key={fileItem.id || name}
                                className={`cloud-file-item-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedCloudFile(fileItem);
                                  setSelectedCloudFolder(null);
                                }}
                                onDoubleClick={() => handleOpenIndividualFile(fileItem)}
                              >
                                <div className="file-card-top">
                                  <div className="file-big-icon">
                                    {name.endsWith('.html') ? '🌐' : name.endsWith('.css') ? '🎨' : name.endsWith('.py') ? '🐍' : name.endsWith('.js') ? '⚡' : name.endsWith('.docx') ? '📄' : name.endsWith('.xlsx') ? '📊' : name.endsWith('.pptx') ? '📈' : '📜'}
                                  </div>
                                  <span className="file-size-badge">{fileItem.size || '0.1 MB'}</span>
                                </div>

                                <div className="file-card-info">
                                  <h4 className="file-card-title" title={name}>{name}</h4>
                                  <div className="file-card-meta">
                                    <span>{fileItem.date || new Date().toLocaleDateString()}</span>
                                  </div>
                                </div>

                                <button 
                                  className="select-card-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenIndividualFile(fileItem);
                                  }}
                                >
                                  📄 Buka di Editor
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                </div>
              ) : (
                /* 3. FOLDERS & WORKSPACES VIEW */
                cloudProjects
                  .filter(proj => !explorerSearchTerm || proj.name.toLowerCase().includes(explorerSearchTerm.toLowerCase()))
                  .length === 0 ? (
                    <div className="empty-explorer-state">
                      <div className="empty-icon">📂</div>
                      <h4>Belum Ada Folder Proyek di Cloud Storage</h4>
                      <p>Klik tombol <strong>"+ Folder Baru"</strong> di atas atau tombol <strong>"Sinkronkan"</strong> untuk memuat dari server.</p>
                      <div className="empty-actions-row">
                        <button className="create-first-folder-btn" onClick={() => setIsCreatingNewFolder(true)}>
                          + Buat Folder Proyek Baru
                        </button>
                        <button className="sync-now-btn" onClick={fetchCloudProjects}>
                          🔄 Sinkronkan Sekarang
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="cloud-folders-grid">
                      {cloudProjects
                        .filter(proj => !explorerSearchTerm || proj.name.toLowerCase().includes(explorerSearchTerm.toLowerCase()))
                        .map(proj => {
                          const isSelected = selectedCloudFolder?.id === proj.id || projectName === proj.name;
                          const fileCount = proj.projectData?.files?.length || proj.files?.length || proj.filesCount || 0;
                          const filesSample = proj.projectData?.files || proj.files || [];
                          return (
                            <div 
                              key={proj.id}
                              className={`cloud-folder-item-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedCloudFolder(proj);
                                setSelectedCloudFile(null);
                              }}
                              onDoubleClick={() => handleSelectWorkspaceFolder(proj)}
                            >
                              <div className="folder-card-top">
                                <div className="folder-big-icon">📁</div>
                                {projectName === proj.name && (
                                  <span className="current-workspace-badge">Sedang Aktif</span>
                                )}
                              </div>

                              <div className="folder-card-info">
                                <h4 className="folder-card-name" title={proj.name}>{proj.name}</h4>
                                <div className="folder-card-meta">
                                  <span>📄 {fileCount} berkas</span>
                                  <span>•</span>
                                  <span>{new Date(proj.updatedAt || Date.now()).toLocaleDateString()}</span>
                                </div>

                                {filesSample.length > 0 && (
                                  <div className="folder-files-preview-chips">
                                    {filesSample.slice(0, 3).map(f => (
                                      <span key={f.name} className="file-chip">
                                        {f.name.endsWith('.html') ? '🌐' : f.name.endsWith('.py') ? '🐍' : '📜'} {f.name}
                                      </span>
                                    ))}
                                    {filesSample.length > 3 && (
                                      <span className="file-chip-more">+{filesSample.length - 3}</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="folder-card-button-row">
                                <button 
                                  className="explore-folder-inside-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentDrillFolder(proj);
                                  }}
                                  title="Jelajahi berkas di dalam folder ini"
                                >
                                  🔍 Jelajahi
                                </button>
                                <button 
                                  className="select-card-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectWorkspaceFolder(proj);
                                  }}
                                >
                                  📂 Buka Workspace
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )
              )}
            </div>

            {/* Explorer Footer */}
            <div className="cloud-explorer-footer">
              <div className="footer-selection-info">
                {selectedCloudFolder ? (
                  <span>Folder terpilih: <strong>📁 {selectedCloudFolder.name}</strong> ({selectedCloudFolder.projectData?.files?.length || selectedCloudFolder.files?.length || selectedCloudFolder.filesCount || 0} berkas)</span>
                ) : selectedCloudFile ? (
                  <span>Berkas terpilih: <strong>📄 {selectedCloudFile.name}</strong> ({selectedCloudFile.size || '0.1 MB'})</span>
                ) : (
                  <span>Pilih folder atau berkas di atas untuk dimuat ke CodeDance IDE.</span>
                )}
              </div>

              <div className="footer-buttons">
                <button className="explorer-cancel-btn" onClick={() => setIsCloudExplorerOpen(false)}>
                  Tutup
                </button>
                {selectedCloudFile ? (
                  <button 
                    className="explorer-confirm-btn"
                    onClick={() => handleOpenIndividualFile(selectedCloudFile)}
                  >
                    <i className="fa-regular fa-file-code"></i> Buka Berkas di Editor
                  </button>
                ) : (
                  <button 
                    className="explorer-confirm-btn"
                    disabled={!selectedCloudFolder}
                    onClick={() => handleSelectWorkspaceFolder(selectedCloudFolder)}
                  >
                    <i className="fa-regular fa-folder-open"></i> Buka Folder Ini
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CodeDanceIDE;
