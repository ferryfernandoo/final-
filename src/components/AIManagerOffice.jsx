import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../apiConfig';
import './AIManagerOffice.css';

// No dummy DEFAULT_FILES — Cloud Storage only shows real user-uploaded files

const AIManagerOffice = ({ user, onNavigate, isAuthenticated }) => {
  const userName = user?.name || user?.email?.split('@')[0] || 'Administrator';
  const userEmail = user?.email || 'authenticated@deepernova.com';

  const [files, setFiles] = useState([]);
  const [storageInfo, setStorageInfo] = useState({
    usedBytes: 0,
    totalBytes: 1073741824, // 1 GB Quota
    usedMB: '0.00',
    totalMB: 1024,
    percent: 0,
    tier: 'Free Tier (1 GB Cloud Vault)'
  });
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // ===== DESKTOP OS & WINDOW SYSTEM STATES =====
  const [isWindowOpen, setIsWindowOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [wallpaperIndex, setWallpaperIndex] = useState(0);

  const wallpapers = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1920&q=80'
  ];

  const cycleWallpaper = () => {
    setWallpaperIndex((prev) => (prev + 1) % wallpapers.length);
  };

  // Real-time clock for Windows Taskbar
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateString(now.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([{ id: null, name: 'Server Cloud Drive' }]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // History stack for Back (←) and Forward (→) navigation
  const [navHistory, setNavHistory] = useState([
    { folderId: null, path: [{ id: null, name: 'Server Cloud Drive' }] }
  ]);
  const [navIndex, setNavIndex] = useState(0);

  const navigateToFolder = (folderId, newPath) => {
    setCurrentFolderId(folderId);
    setFolderPath(newPath);

    const updatedHistory = navHistory.slice(0, navIndex + 1);
    updatedHistory.push({ folderId, path: newPath });
    setNavHistory(updatedHistory);
    setNavIndex(updatedHistory.length - 1);
  };

  const handleNavBack = () => {
    if (navIndex > 0) {
      const prev = navHistory[navIndex - 1];
      setNavIndex(navIndex - 1);
      setCurrentFolderId(prev.folderId);
      setFolderPath(prev.path);
    }
  };

  const handleNavForward = () => {
    if (navIndex < navHistory.length - 1) {
      const next = navHistory[navIndex + 1];
      setNavIndex(navIndex + 1);
      setCurrentFolderId(next.folderId);
      setFolderPath(next.path);
    }
  };

  // ===== CONTEXT MENU & LONG PRESS STATES =====
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    file: null
  });
  const touchTimerRef = useRef(null);

  const handleItemContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 220);
    setContextMenu({
      visible: true,
      x: Math.max(10, x),
      y: Math.max(10, y),
      file: file
    });
  };

  const handleTouchStart = (e, file) => {
    const touch = e.touches[0];
    if (!touch) return;
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    
    touchTimerRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_e) {}
      }
      const x = Math.min(clientX, window.innerWidth - 230);
      const y = Math.min(clientY, window.innerHeight - 220);
      setContextMenu({
        visible: true,
        x: Math.max(10, x),
        y: Math.max(10, y),
        file: file
      });
    }, 450); // 450ms long press threshold
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(prev => prev.visible ? { visible: false, x: 0, y: 0, file: null } : prev);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCloseMenu();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ===== FOLDER CREATION & EDITING STATES =====
  const [uploadNotification, setUploadNotification] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderType, setFolderType] = useState('company'); // 'private' | 'company'
  const [founderName, setFounderName] = useState('Ferry');
  const [founderEmail, setFounderEmail] = useState('ferry@deepmail.com');
  const [ceoName, setCeoName] = useState('');
  const [ceoEmail, setCeoEmail] = useState('');
  const [customRoles, setCustomRoles] = useState([
    { role: 'CTO', name: 'Anju', email: 'anju@deepmail.com' },
    { role: 'Manager Operasional', name: '', email: '' }
  ]);

  const getFolderCreatorInfo = (folder) => {
    if (!folder) {
      return {
        name: userName || userEmail || 'authenticated@deepernova.com',
        role: 'Pemilik Cloud Drive (Root)',
        type: 'root'
      };
    }
    
    if (folder.folderType === 'private') {
      return {
        name: folder.ownerEmail || userEmail || 'Pengguna',
        role: 'Pemilik Private Folder',
        type: 'private'
      };
    }

    const fEmail = (folder.founderEmail || 'ferry@deepmail.com').toLowerCase().trim();
    const cEmail = (folder.ceoEmail || '').toLowerCase().trim();
    const ownerEmail = (folder.ownerEmail || '').toLowerCase().trim();

    if (ownerEmail && ownerEmail === fEmail) {
      return {
        name: folder.founder || 'Ferry',
        email: fEmail,
        role: 'Founder',
        type: 'company'
      };
    }

    if (ownerEmail && cEmail && ownerEmail === cEmail) {
      return {
        name: folder.ceo || 'CEO',
        email: cEmail,
        role: 'CEO',
        type: 'company'
      };
    }

    if (folder.roles && Array.isArray(folder.roles)) {
      const matchRole = folder.roles.find(r => r.email && r.email.toLowerCase().trim() === ownerEmail);
      if (matchRole) {
        return {
          name: matchRole.name || ownerEmail,
          email: ownerEmail,
          role: matchRole.role || 'Struktur Perusahaan',
          type: 'company'
        };
      }
    }

    return {
      name: folder.founder || folder.ownerEmail || 'Ferry',
      email: folder.founderEmail || folder.ownerEmail || 'ferry@deepmail.com',
      role: folder.founder ? 'Founder' : 'Pembuat Company Folder',
      type: 'company'
    };
  };

  const getFileUploaderAndFolderInfo = (file) => {
    if (!file) return null;
    const cat = (file.category || file.type || '').toLowerCase();
    
    if (cat === 'folder') {
      const creator = getFolderCreatorInfo(file);
      return {
        uploaderName: creator.name,
        uploaderRole: creator.role,
        folderName: file.name,
        isFolder: true
      };
    }

    const parentFolder = file.parentId ? files.find(f => f.id === file.parentId) : null;
    const uploaderEmail = (file.ownerEmail || userEmail || 'authenticated@deepernova.com').toLowerCase().trim();
    
    let uploaderName = file.folderCreator || file.ownerEmail || userName || 'Pengguna';
    let uploaderRole = file.folderCreatorRole || 'Pengunggah Berkas';

    if (parentFolder && parentFolder.folderType === 'company') {
      const fEmail = (parentFolder.founderEmail || 'ferry@deepmail.com').toLowerCase().trim();
      const cEmail = (parentFolder.ceoEmail || '').toLowerCase().trim();
      
      if (uploaderEmail === fEmail) {
        uploaderName = parentFolder.founder || 'Ferry';
        uploaderRole = 'Founder';
      } else if (cEmail && uploaderEmail === cEmail) {
        uploaderName = parentFolder.ceo || 'CEO';
        uploaderRole = 'CEO';
      } else if (parentFolder.roles && Array.isArray(parentFolder.roles)) {
        const rMatch = parentFolder.roles.find(r => r.email && r.email.toLowerCase().trim() === uploaderEmail);
        if (rMatch) {
          uploaderName = rMatch.name || uploaderEmail;
          uploaderRole = rMatch.role || 'Karyawan Perusahaan';
        }
      }
    }

    return {
      uploaderName: uploaderName,
      uploaderRole: uploaderRole,
      folderName: parentFolder ? parentFolder.name : 'Server Cloud Drive (Root)',
      isFolder: false
    };
  };

  const formatDeepmail = (str) => {
    if (!str) return '';
    const val = str.trim().toLowerCase();
    return val.endsWith('@deepmail.com') ? val : (val.includes('@') ? val : `${val}@deepmail.com`);
  };

  const openNewFolderModal = () => {
    setEditingFolder(null);
    setNewFolderName('');
    setFolderType('company');
    setFounderName('Ferry');
    setFounderEmail('ferry@deepmail.com');
    setCeoName('');
    setCeoEmail('');
    setCustomRoles([
      { role: 'CTO', name: 'Anju', email: 'anju@deepmail.com' },
      { role: 'Manager Operasional', name: '', email: '' }
    ]);
    setShowNewFolderModal(true);
  };

  const handleEditFolder = (folder, e) => {
    e?.stopPropagation();
    setEditingFolder(folder);
    setNewFolderName(folder.name || '');
    setFolderType(folder.folderType || 'company');
    setFounderName(folder.founder || 'Ferry');
    setFounderEmail(folder.founderEmail || 'ferry@deepmail.com');
    setCeoName(folder.ceo || '');
    setCeoEmail(folder.ceoEmail || '');
    setCustomRoles(folder.roles && Array.isArray(folder.roles) && folder.roles.length > 0 ? folder.roles : [
      { role: 'CTO', name: 'Anju', email: 'anju@deepmail.com' },
      { role: 'Manager Operasional', name: '', email: '' }
    ]);
    setShowNewFolderModal(true);
  };

  const handleAddCustomRole = () => {
    setCustomRoles([...customRoles, { role: '', name: '', email: '' }]);
  };

  const handleUpdateCustomRole = (index, field, value) => {
    const updated = [...customRoles];
    updated[index] = { ...updated[index], [field]: value };
    setCustomRoles(updated);
  };

  const handleRemoveCustomRole = (index) => {
    setCustomRoles(customRoles.filter((_, i) => i !== index));
  };

  const handleSaveFolder = async () => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    const cleanRoles = customRoles.map(r => ({
      ...r,
      email: r.email ? formatDeepmail(r.email) : ''
    })).filter(r => r.role.trim() || r.name.trim() || r.email.trim());

    const fEmail = founderEmail ? formatDeepmail(founderEmail) : 'ferry@deepmail.com';
    const cEmail = ceoEmail ? formatDeepmail(ceoEmail) : '';

    const empEmails = [];
    if (fEmail) empEmails.push(fEmail);
    if (cEmail) empEmails.push(cEmail);
    cleanRoles.forEach(r => {
      if (r.email) empEmails.push(r.email);
    });

    const currentOwner = (userEmail || 'authenticated@deepernova.com').toLowerCase().trim();

    if (editingFolder) {
      const updatedFolder = {
        ...editingFolder,
        name: name,
        folderType: folderType,
        founder: folderType === 'company' ? (founderName.trim() || 'Ferry') : null,
        founderEmail: folderType === 'company' ? fEmail : null,
        ceo: folderType === 'company' ? (ceoName.trim() || null) : null,
        ceoEmail: folderType === 'company' ? (cEmail || null) : null,
        roles: folderType === 'company' ? cleanRoles : [],
        employeeEmails: folderType === 'company' ? Array.from(new Set(empEmails)) : [currentOwner],
        ownerEmail: editingFolder.ownerEmail || currentOwner
      };

      const updatedFiles = files.map(f => f.id === editingFolder.id ? updatedFolder : f);
      setFiles(updatedFiles);
      saveLocalFiles(updatedFiles);

      setShowNewFolderModal(false);
      setEditingFolder(null);

      try {
        await fetch(`${API_BASE_URL}/api/cloud/folder/${editingFolder.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: updatedFolder })
        });
      } catch (_e) {}
    } else {
      const newFolder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name,
        type: 'folder',
        category: 'folder',
        folderType: folderType,
        founder: folderType === 'company' ? (founderName.trim() || 'Ferry') : null,
        founderEmail: folderType === 'company' ? fEmail : null,
        ceo: folderType === 'company' ? (ceoName.trim() || null) : null,
        ceoEmail: folderType === 'company' ? (cEmail || null) : null,
        roles: folderType === 'company' ? cleanRoles : [],
        employeeEmails: folderType === 'company' ? Array.from(new Set(empEmails)) : [currentOwner],
        ownerEmail: currentOwner,
        parentId: currentFolderId,
        size: '0 B',
        sizeBytes: 0,
        date: new Date().toISOString().split('T')[0]
      };

      const updatedFiles = [newFolder, ...files];
      setFiles(updatedFiles);
      saveLocalFiles(updatedFiles);

      setShowNewFolderModal(false);

      try {
        await fetch(`${API_BASE_URL}/api/cloud/folder`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: newFolder })
        });
      } catch (_e) {}
    }
  };

  const calculateDynamicStorage = (fileList) => {
    const totalBytesQuota = 1073741824; // 1 GB
    const usedBytes = fileList.reduce((acc, f) => {
      if (f.sizeBytes && typeof f.sizeBytes === 'number') return acc + f.sizeBytes;
      if (f.size && typeof f.size === 'string') {
        const num = parseFloat(f.size);
        if (!isNaN(num)) {
          if (f.size.includes('KB')) return acc + Math.round(num * 1024);
          if (f.size.includes('MB')) return acc + Math.round(num * 1024 * 1024);
          if (f.size.includes('GB')) return acc + Math.round(num * 1024 * 1024 * 1024);
        }
      }
      return acc + 500000; // default 500 KB estimate
    }, 0);

    const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
    const percent = Math.min(100, parseFloat(((usedBytes / totalBytesQuota) * 100).toFixed(2)));

    setStorageInfo(prev => ({
      ...prev,
      usedBytes,
      totalBytes: totalBytesQuota,
      usedMB,
      totalMB: 1024,
      percent: Math.max(0.5, percent)
    }));
  };

  const getUserStorageKey = (email) => {
    const clean = (email || '').toLowerCase().trim();
    return clean ? `deepernova_cloud_files_${clean}` : 'deepernova_cloud_files_guest';
  };

  const getCompanySharedKey = () => 'deepernova_cloud_company_shared';

  const saveLocalFiles = (updatedFilesList) => {
    try {
      const metadataOnly = updatedFilesList.map(f => ({
        ...f,
        dataUrl: f.dataUrl ? '[[stored]]' : null
      }));

      const currentOwner = (userEmail || 'authenticated@deepernova.com').toLowerCase().trim();
      const userKey = getUserStorageKey(currentOwner);

      // Save user's complete files & folders to userKey
      localStorage.setItem(userKey, JSON.stringify(metadataOnly));

      // Save company folders & files inside company folders to shared company storage
      const companyFolderIds = new Set(
        metadataOnly
          .filter(f => f.folderType === 'company' || (f.category === 'folder' && f.employeeEmails))
          .map(f => f.id)
      );

      const companyItems = metadataOnly.filter(f => {
        if (f.folderType === 'company' || (f.category === 'folder' && f.employeeEmails)) return true;
        if (f.parentId && (companyFolderIds.has(f.parentId) || f.folderType === 'company')) return true;
        return false;
      });

      let existingShared = [];
      try {
        const existingStr = localStorage.getItem(getCompanySharedKey());
        if (existingStr) existingShared = JSON.parse(existingStr);
      } catch {}

      const sharedMap = new Map();
      if (Array.isArray(existingShared)) {
        existingShared.forEach(cf => {
          if (cf && cf.id) sharedMap.set(cf.id, cf);
        });
      }
      companyItems.forEach(cf => {
        if (cf && cf.id) sharedMap.set(cf.id, cf);
      });

      localStorage.setItem(getCompanySharedKey(), JSON.stringify(Array.from(sharedMap.values())));
    } catch (_e) {
      console.warn('[CloudStorage] Local caching error:', _e);
    }
  };

  const isInitialRef = useRef(true);

  const fetchCloudStorageData = async (silent = false) => {
    if (!silent && isInitialRef.current) setIsLoading(true);
    let serverFiles = [];

    try {
      const infoRes = await fetch(`${API_BASE_URL}/api/cloud/storage-info`, {
        credentials: 'include'
      });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        if (infoData.success) {
          setStorageInfo(infoData);
        }
      }

      const filesRes = await fetch(`${API_BASE_URL}/api/cloud/files`, {
        credentials: 'include'
      });
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        if (filesData.success && Array.isArray(filesData.files)) {
          serverFiles = filesData.files;
        }
      }
    } catch (err) {
      console.warn('[CloudStorage] Backend error:', err);
    }

    try {
      const currentOwner = (userEmail || 'authenticated@deepernova.com').toLowerCase().trim();
      const currentName = (userName || '').toLowerCase().trim();
      const userKey = getUserStorageKey(currentOwner);

      // Load user's private files from scoped key
      const localCloud = localStorage.getItem(userKey);
      let localCloudFiles = localCloud ? JSON.parse(localCloud) : [];

      // Migrate legacy shared key 'deepernova_cloud_files' if present
      const legacyCloud = localStorage.getItem('deepernova_cloud_files');
      if (legacyCloud) {
        try {
          const legacyFiles = JSON.parse(legacyCloud);
          const userLegacy = legacyFiles.filter(f => !f.ownerEmail || f.ownerEmail.toLowerCase().trim() === currentOwner);
          if (userLegacy.length > 0) {
            const combinedMap = new Map();
            [...localCloudFiles, ...userLegacy].forEach(f => combinedMap.set(f.id, { ...f, ownerEmail: f.ownerEmail || currentOwner }));
            localCloudFiles = Array.from(combinedMap.values());
            localStorage.setItem(userKey, JSON.stringify(localCloudFiles));
          }
          localStorage.removeItem('deepernova_cloud_files');
        } catch {}
      }

      // Load Company Folders & files inside Company Folders accessible to current user
      let companySharedFiles = [];
      try {
        const sharedStr = localStorage.getItem(getCompanySharedKey());
        if (sharedStr) {
          companySharedFiles = JSON.parse(sharedStr);
        }
      } catch {}

      // Clean dummy files
      const dummyIds = ['file_1', 'file_2', 'file_3', 'file_4'];
      localCloudFiles = [...localCloudFiles, ...companySharedFiles].filter(f => !dummyIds.includes(f.id));

      // Restore dataUrl from sessionStorage for locally cached files
      localCloudFiles = localCloudFiles.map(f => {
        if (f.dataUrl === '[[stored]]' && f.id) {
          const storedData = sessionStorage.getItem(`cloud_file_data_${f.id}`);
          return { ...f, dataUrl: storedData || null };
        }
        return f;
      });

      const docArtifacts = sessionStorage.getItem('doc_artifacts');
      const artifactFiles = docArtifacts ? JSON.parse(docArtifacts)
        .filter(art => !art.ownerEmail || art.ownerEmail.toLowerCase().trim() === currentOwner)
        .map(art => ({
          id: art.id || `art_${art.createdAt || Date.now()}`,
          name: `${art.title || 'Dokumen_Typernova'}.${art.type === 'excel' ? 'xlsx' : art.type === 'ppt' ? 'pptx' : 'docx'}`,
          type: art.type,
          category: art.type === 'excel' ? 'excel' : art.type === 'ppt' ? 'pptx' : 'docx',
          size: '0.4 MB',
          sizeBytes: 419430,
          date: art.createdAt ? art.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          ownerEmail: art.ownerEmail || currentOwner,
          content: art
        })) : [];

      const fileMap = new Map();
      [...localCloudFiles, ...artifactFiles, ...serverFiles].forEach(f => {
        const idKey = f.id || (f.name || '').toLowerCase().trim();
        if (idKey) {
          const existing = fileMap.get(idKey) || {};
          fileMap.set(idKey, {
            ...existing,
            ...f,
            ownerEmail: f.ownerEmail || existing.ownerEmail || currentOwner,
            folderType: f.folderType || existing.folderType,
            founder: f.founder || existing.founder,
            founderEmail: f.founderEmail || existing.founderEmail,
            ceo: f.ceo || existing.ceo,
            ceoEmail: f.ceoEmail || existing.ceoEmail,
            employeeEmails: f.employeeEmails || existing.employeeEmails,
            folderCreator: f.folderCreator || existing.folderCreator,
            folderCreatorRole: f.folderCreatorRole || existing.folderCreatorRole,
            parentId: (f.parentId !== undefined && f.parentId !== null) ? f.parentId : (existing.parentId !== undefined ? existing.parentId : null),
            dataUrl: f.dataUrl || existing.dataUrl || null,
            thumbnail: (f.thumbnail !== undefined && f.thumbnail !== null) ? f.thumbnail : (existing.thumbnail || null)
          });
        }
      });

      const combined = Array.from(fileMap.values());
      setFiles(combined);
      calculateDynamicStorage(combined);
    } catch (e) {
      console.warn('Error combining cloud files:', e);
      setFiles(serverFiles);
      calculateDynamicStorage(serverFiles);
    } finally {
      if (isInitialRef.current) {
        setIsLoading(false);
        isInitialRef.current = false;
      }
    }
  };

  useEffect(() => {
    fetchCloudStorageData(false);
    // Real-time polling every 5 seconds so uploads on Device A immediately appear on Device B
    const interval = setInterval(() => {
      fetchCloudStorageData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const MAX_SINGLE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB Limit per file

  const handleFileUpload = async (e) => {
    const uploaded = Array.from(e.target.files || []);
    if (uploaded.length === 0) return;

    // Check for files exceeding 50 MB single file limit
    const oversizedFiles = uploaded.filter(file => file.size > MAX_SINGLE_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(', ');
      alert(`⚠️ Berkas melebihi batas maksimum 50 MB per berkas:\n${names}\n\nSilakan pilih berkas yang berukuran di bawah 50 MB.`);
    }

    const validFiles = uploaded.filter(file => file.size <= MAX_SINGLE_FILE_SIZE_BYTES);
    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoading(true);

    const currentFolder = currentFolderId ? files.find(f => f.id === currentFolderId) : null;
    const creatorInfo = getFolderCreatorInfo(currentFolder);

    const filePayloads = [];
    for (const file of validFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let category = 'other';
      
      if (['docx', 'doc'].includes(ext)) category = 'docx';
      else if (['xlsx', 'xls', 'csv'].includes(ext)) category = 'excel';
      else if (['pptx', 'ppt'].includes(ext)) category = 'pptx';
      else if (['pdf'].includes(ext)) category = 'pdf';
      else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext)) category = 'image';
      else if (['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext)) category = 'video';
      else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) category = 'audio';
      else if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) category = 'archive';
      else if (['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext)) category = 'code';
      else category = 'other';

      let dataUrl = null;
      let thumbnail = null;
      let textContent = null;
      
      // Read data URL for small/medium files (< 20 MB)
      if (file.size < 20 * 1024 * 1024) {
        try {
          dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
        } catch (_err) {}
      }

      // Generate lightweight thumbnail for image files (~180px JPEG)
      if (category === 'image' && dataUrl) {
        try {
          thumbnail = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                const maxDim = 180;
                let w = img.width;
                let h = img.height;
                if (w > h) {
                  if (w > maxDim) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                  }
                } else {
                  if (h > maxDim) {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                  }
                }
                canvas.width = Math.max(1, w);
                canvas.height = Math.max(1, h);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
              } catch (_e) {
                resolve(dataUrl);
              }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
          });
        } catch (_e) {
          thumbnail = dataUrl;
        }
      }

      // Read text content for code/text files
      if (category === 'code' || ext === 'txt' || ext === 'md' || ext === 'json') {
        try {
          textContent = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
          });
        } catch (_err) {}
      }

      const singleFileId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const currentOwner = (userEmail || 'authenticated@deepernova.com').toLowerCase().trim();

      filePayloads.push({
        id: singleFileId,
        parentId: currentFolderId || null,
        name: file.name,
        type: category,
        category: category,
        sizeBytes: file.size,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        dataUrl: dataUrl,
        thumbnail: thumbnail,
        text: textContent,
        ownerEmail: currentOwner,
        folderType: currentFolder ? currentFolder.folderType : null,
        founder: currentFolder ? currentFolder.founder : null,
        founderEmail: currentFolder ? currentFolder.founderEmail : null,
        ceo: currentFolder ? currentFolder.ceo : null,
        ceoEmail: currentFolder ? currentFolder.ceoEmail : null,
        employeeEmails: currentFolder ? currentFolder.employeeEmails : null,
        folderCreator: creatorInfo.name,
        folderCreatorRole: creatorInfo.role
      });
    }

    const currentOwner = (userEmail || 'authenticated@deepernova.com').toLowerCase().trim();

    // Build file objects for immediate UI display (optimistic update)
    const newFileObjs = filePayloads.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.category,
      category: file.category,
      parentId: file.parentId,
      sizeBytes: file.sizeBytes,
      size: file.size,
      dataUrl: file.dataUrl,
      thumbnail: file.thumbnail,
      text: file.text,
      ownerEmail: currentOwner,
      folderType: file.folderType,
      founder: file.founder,
      founderEmail: file.founderEmail,
      ceo: file.ceo,
      ceoEmail: file.ceoEmail,
      employeeEmails: file.employeeEmails,
      folderCreator: file.folderCreator,
      folderCreatorRole: file.folderCreatorRole,
      date: new Date().toISOString().split('T')[0]
    }));

    // IMMEDIATELY show uploaded files in UI (don't wait for server)
    const updatedFiles = [...newFileObjs, ...files];
    setFiles(updatedFiles);
    calculateDynamicStorage(updatedFiles);
    saveLocalFiles(updatedFiles);

    setUploadNotification({
      folderName: currentFolder ? currentFolder.name : 'Server Cloud Drive (Root)',
      creatorName: creatorInfo.name,
      creatorRole: creatorInfo.role,
      count: validFiles.length
    });

    setTimeout(() => {
      setUploadNotification(null);
    }, 4000);

    // Save dataUrl separately in sessionStorage per file (survives tab lifetime) & memory cache
    for (const fObj of newFileObjs) {
      if (fObj.dataUrl) {
        if (typeof window !== 'undefined') {
          window.deepernova_file_cache = window.deepernova_file_cache || new Map();
          window.deepernova_file_cache.set(fObj.id, fObj);
        }
        try {
          sessionStorage.setItem(`cloud_file_data_${fObj.id}`, fObj.dataUrl);
        } catch (_e) {}
      }
    }

    // Try server upload in background (non-blocking)
    try {
      const res = await fetch(`${API_BASE_URL}/api/cloud/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filePayloads })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('[CloudStorage] Server upload failed:', data.error || 'Unknown error');
        // Files already visible in UI — no action needed
      } else {
        console.log('[CloudStorage] ✅ Server upload success:', data.uploadedCount, 'files');
      }
    } catch (err) {
      console.warn('[CloudStorage] Server offline, files saved locally:', err.message);
      // Files already visible in UI — no action needed
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (id, e) => {
    e?.stopPropagation();
    const targetFile = files.find(f => f.id === id);
    if (!window.confirm(`Apakah Anda yakin ingin menghapus berkas "${targetFile?.name || 'ini'}" dari Cloud Storage?`)) {
      return;
    }

    const targetName = targetFile?.name;
    const targetBaseName = targetName ? targetName.replace(/\.[^/.]+$/, '') : '';
    const currentOwner = (userEmail || 'authenticated@deepernova.com').toLowerCase().trim();

    // 1. IMMEDIATELY remove from UI state (optimistic delete)
    const updated = files.filter(f => f.id !== id && f.name !== targetName);
    setFiles(updated);
    calculateDynamicStorage(updated);

    // 2. Remove from User Private Storage Key
    try {
      const uKey = getUserStorageKey(currentOwner);
      const uStr = localStorage.getItem(uKey);
      if (uStr) {
        const uArr = JSON.parse(uStr);
        const filteredU = uArr.filter(f => f.id !== id && f.name !== targetName);
        localStorage.setItem(uKey, JSON.stringify(filteredU));
      }
    } catch (_e) {}

    // 3. Remove from Company Shared Storage Key (prevent polling from restoring it)
    try {
      const sharedStr = localStorage.getItem(getCompanySharedKey());
      if (sharedStr) {
        const sharedArr = JSON.parse(sharedStr);
        const filteredShared = sharedArr.filter(f => f.id !== id && f.name !== targetName);
        localStorage.setItem(getCompanySharedKey(), JSON.stringify(filteredShared));
      }
    } catch (_e) {}

    // 4. Remove from Legacy Shared Key
    try {
      const legacyStr = localStorage.getItem('deepernova_cloud_files');
      if (legacyStr) {
        const legacyArr = JSON.parse(legacyStr);
        const filteredLegacy = legacyArr.filter(f => f.id !== id && f.name !== targetName);
        localStorage.setItem('deepernova_cloud_files', JSON.stringify(filteredLegacy));
      }
    } catch (_e) {}

    // 5. Remove dataUrl from sessionStorage & memory cache
    try {
      sessionStorage.removeItem(`cloud_file_data_${id}`);
      if (typeof sessionStorage !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('cloud_file_data_') && targetName && k.includes(targetName)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      }
    } catch (_e) {}

    if (typeof window !== 'undefined') {
      if (window.deepernova_file_cache) {
        window.deepernova_file_cache.delete(id);
        for (const [ckey, cval] of window.deepernova_file_cache.entries()) {
          if (cval && (cval.id === id || cval.name === targetName)) {
            window.deepernova_file_cache.delete(ckey);
          }
        }
      }
      if (window.deepernova_active_cloud_file?.id === id) {
        window.deepernova_active_cloud_file = null;
      }
    }

    // 6. Remove from doc_artifacts in sessionStorage
    try {
      const docArtifactsStr = sessionStorage.getItem('doc_artifacts');
      if (docArtifactsStr) {
        const docArtifacts = JSON.parse(docArtifactsStr);
        const filteredArtifacts = docArtifacts.filter(art => {
          const artName = `${art.title || ''}.${art.type === 'excel' ? 'xlsx' : art.type === 'ppt' ? 'pptx' : 'docx'}`;
          return art.id !== id && art.title !== targetBaseName && artName !== targetName;
        });
        sessionStorage.setItem('doc_artifacts', JSON.stringify(filteredArtifacts));
      }
    } catch (_e) {}

    // 7. Clear open_target_artifact if matching
    try {
      const openTargetStr = sessionStorage.getItem('open_target_artifact');
      if (openTargetStr) {
        const openTarget = JSON.parse(openTargetStr);
        if (openTarget.id === id || openTarget.title === targetBaseName) {
          sessionStorage.removeItem('open_target_artifact');
        }
      }
    } catch (_e) {}

    // 8. Try server delete in background (non-blocking)
    try {
      const deleteUrl = `${API_BASE_URL}/api/cloud/files/${id}?name=${encodeURIComponent(targetName || '')}`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('[CloudStorage] Server delete finished:', err.message);
    }
  };

  const [selectedMediaFile, setSelectedMediaFile] = useState(null);

  const handleOpenFile = (file) => {
    if (file.type === 'folder' || file.category === 'folder') {
      const newPath = [...folderPath, { id: file.id, name: file.name }];
      navigateToFolder(file.id, newPath);
      return;
    }

    const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
    const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'];
    const videoExts = ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'];
    const codeExts = ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'];

    if (imageExts.includes(ext) || videoExts.includes(ext) || audioExts.includes(ext) || codeExts.includes(ext) || 
        ['image', 'video', 'audio', 'code', 'archive'].includes(file.category)) {
      setSelectedMediaFile(file);
      return;
    }

    const cat = (file.category || file.type || '').toLowerCase();
    const isDocx = cat === 'docx' || cat === 'word' || cat === 'doc' || ext === 'docx' || ext === 'doc';
    const isExcel = cat === 'excel' || cat === 'xlsx' || ext === 'xlsx' || ext === 'csv';
    const isPpt = cat === 'pptx' || cat === 'ppt' || ext === 'pptx' || ext === 'ppt';
    const isPdf = cat === 'pdf' || ext === 'pdf';

    let editorCategory = 'word';
    let docxType = 'docx';
    if (isExcel) { editorCategory = 'excel'; docxType = 'excel'; }
    else if (isPpt) { editorCategory = 'ppt'; docxType = 'ppt'; }
    else { editorCategory = 'word'; docxType = 'docx'; }

    // Retrieve the actual file binary data (dataUrl)
    let fileDataUrl = file.dataUrl;
    if ((!fileDataUrl || fileDataUrl === '[[stored]]') && file.id) {
      if (typeof window !== 'undefined' && window.deepernova_file_cache?.has(file.id)) {
        fileDataUrl = window.deepernova_file_cache.get(file.id)?.dataUrl || null;
      }
      if (!fileDataUrl) {
        fileDataUrl = sessionStorage.getItem(`cloud_file_data_${file.id}`) || null;
      }
    }

    // Pass file to DocumentEditor via memory cache & sessionStorage
    const cloudFilePayload = {
      id: file.id,
      name: file.name,
      ext: ext,
      type: docxType,
      dataUrl: fileDataUrl,
      content: file.content
    };

    if (typeof window !== 'undefined') {
      window.deepernova_active_cloud_file = cloudFilePayload;
    }

    if (fileDataUrl && fileDataUrl.startsWith('data:')) {
      try {
        sessionStorage.setItem('cloud_file_to_parse', JSON.stringify({
          id: file.id,
          name: file.name,
          ext: ext,
          type: docxType
        }));
      } catch (_e) {}
      onNavigate?.('documents', editorCategory);
      return;
    }

    // Fallback: use content/text if available (for AI-generated artifacts)
    let artifactContent = file.content;
    if (!artifactContent || typeof artifactContent !== 'object') {
      artifactContent = {
        id: file.id || `doc_${Date.now()}`,
        title: file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Dokumen Cloud',
        type: docxType,
        content: file.text ? [{ type: 'paragraph', text: file.text }] : [{ type: 'paragraph', text: `Berkas ini tidak memiliki konten yang dapat dibaca. Silakan unggah ulang file.` }]
      };
    }

    try {
      sessionStorage.setItem('open_target_artifact', JSON.stringify(artifactContent));
    } catch (_e) {}

    onNavigate?.('documents', editorCategory);
  };

  const currentEmail = (userEmail || '').toLowerCase().trim();

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchTerm || file.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Filter by Folder & File Access Rights (Strict multi-tenant account isolation)
    const cat = (file.category || file.type || '').toLowerCase();
    if (cat === 'folder') {
      if (file.folderType === 'private') {
        const isOwner = !file.ownerEmail || file.ownerEmail.toLowerCase().trim() === currentEmail;
        if (!isOwner && currentEmail && !currentEmail.includes('authenticated@deepernova.com')) {
          return false;
        }
      }
    } else {
      // Non-folder file: check ownership if at root level
      if (!file.parentId) {
        const isOwner = !file.ownerEmail || file.ownerEmail.toLowerCase().trim() === currentEmail;
        if (!isOwner && currentEmail && !currentEmail.includes('authenticated@deepernova.com')) {
          return false;
        }
      } else {
        // File inside a folder: check if parent folder is private
        const parentFolder = files.find(f => f.id === file.parentId);
        if (parentFolder && (parentFolder.category === 'folder' || parentFolder.type === 'folder')) {
          if (parentFolder.folderType === 'private') {
            const isOwner = !parentFolder.ownerEmail || parentFolder.ownerEmail.toLowerCase().trim() === currentEmail;
            if (!isOwner && currentEmail && !currentEmail.includes('authenticated@deepernova.com')) {
              return false;
            }
          }
        }
      }
    }

    // Filter by Folder Location (Root vs Subfolder)
    if (!searchTerm.trim()) {
      if (currentFolderId === null) {
        if (file.parentId && file.parentId !== null) return false;
      } else {
        if (file.parentId !== currentFolderId) return false;
      }
    }

    if (activeCategory === 'all') return true;

    const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';

    if (cat === 'folder') return true; // Always show folders in current location

    if (activeCategory === 'docx') return cat === 'docx' || cat === 'word' || ext === 'docx' || ext === 'doc';
    if (activeCategory === 'excel') return cat === 'excel' || cat === 'xlsx' || ext === 'xlsx' || ext === 'csv';
    if (activeCategory === 'pptx') return cat === 'pptx' || cat === 'ppt' || ext === 'pptx' || ext === 'ppt';
    if (activeCategory === 'pdf') return cat === 'pdf' || ext === 'pdf';
    if (activeCategory === 'image') return cat === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext);
    if (activeCategory === 'video') return cat === 'video' || ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext);
    if (activeCategory === 'audio') return cat === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext);
    if (activeCategory === 'archive') return cat === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext);
    if (activeCategory === 'code') return cat === 'code' || ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext);

    return cat === activeCategory;
  });

  const getFileIcon = (item, size = 48) => {
    const fileObj = typeof item === 'object' ? item : null;
    const cat = (fileObj ? (fileObj.category || fileObj.type || '') : String(item || '')).toLowerCase();
    const fileName = (fileObj ? (fileObj.name || '') : String(item || '')).toLowerCase();
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    const isImg = cat === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext);

    if (isImg && fileObj) {
      const storedSessionData = fileObj.id && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`cloud_file_data_${fileObj.id}`) : null;
      const storedMemoryData = fileObj.id && typeof window !== 'undefined' && window.deepernova_file_cache ? window.deepernova_file_cache.get(fileObj.id)?.dataUrl : null;
      let imgSrc = fileObj.thumbnail || fileObj.dataUrl || storedSessionData || storedMemoryData || fileObj.url || fileObj.filePath || fileObj.path;
      if (imgSrc === '[[stored]]') imgSrc = storedSessionData || storedMemoryData || null;

      if (imgSrc) {
        return (
          <div
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.1)',
              background: '#090d16',
              verticalAlign: 'middle',
              flexShrink: 0
            }}
          >
            <img
              src={imgSrc}
              alt={fileObj.name || 'Image'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://img.icons8.com/fluency/96/image.png';
                e.target.style.objectFit = 'contain';
                e.target.style.padding = '4px';
              }}
            />
          </div>
        );
      }
    }

    let url = 'https://img.icons8.com/fluency/96/document.png';

    if (cat === 'folder') {
      if (fileObj?.folderType === 'company') {
        url = 'https://img.icons8.com/fluency/96/organization.png';
      } else if (fileObj?.folderType === 'private') {
        url = 'https://img.icons8.com/fluency/96/lock.png';
      } else {
        url = 'https://img.icons8.com/fluency/96/folder-invoices.png';
      }
    }
    else if (cat === 'word' || cat === 'docx' || cat === 'doc' || ext === 'docx' || ext === 'doc') url = 'https://img.icons8.com/fluency/96/microsoft-word-2019.png';
    else if (cat === 'excel' || cat === 'xlsx' || cat === 'csv' || ext === 'xlsx' || ext === 'csv') url = 'https://img.icons8.com/fluency/96/microsoft-excel-2019.png';
    else if (cat === 'ppt' || cat === 'pptx' || ext === 'pptx' || ext === 'ppt') url = 'https://img.icons8.com/fluency/96/microsoft-powerpoint-2019.png';
    else if (cat === 'pdf' || ext === 'pdf') url = 'https://img.icons8.com/fluency/96/pdf-2.png';
    else if (isImg) url = 'https://img.icons8.com/fluency/96/image.png';
    else if (cat === 'video' || ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext)) url = 'https://img.icons8.com/fluency/96/video-file.png';
    else if (cat === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) url = 'https://img.icons8.com/color/96/music.png';
    else if (cat === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) url = 'https://img.icons8.com/fluency/96/zip.png';
    else if (cat === 'code' || ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext)) url = 'https://img.icons8.com/fluency/96/code-file.png';

    return (
      <img
        src={url}
        alt="file icon"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))'
        }}
      />
    );
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'docx': return 'Dokumen (Typernova)';
      case 'excel': return 'Spreadsheet (Sheets)';
      case 'pptx': return 'Presentasi (Slide)';
      case 'pdf': return 'PDF Vault';
      case 'image': return 'Gambar & Art AI';
      case 'video': return 'Video & Media';
      case 'audio': return 'Suara & Audio';
      case 'archive': return 'Arsip & Zip';
      case 'code': return 'Kode & Teks';
      default: return 'Semua Berkas';
    }
  };

  return (
    <div className="os-desktop-container" style={{ backgroundImage: `url(${wallpapers[wallpaperIndex]})` }}>
      {/* Hidden File Input for ALL file types */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        multiple
      />

      {/* Windows 11 Desktop Shortcuts Grid */}
      <div className="win11-desktop-grid" onClick={() => setShowStartMenu(false)}>
        <div className="win11-desktop-icon" onClick={() => { setIsWindowOpen(true); setIsMinimized(false); }}>
          <img src="https://img.icons8.com/color/96/folder-invoices.png" alt="Cloud Explorer" />
          <span>Cloud Explorer</span>
        </div>

        <div className="win11-desktop-icon" onClick={() => onNavigate?.('documents', 'word')}>
          <img src="https://img.icons8.com/color/96/microsoft-word-2019.png" alt="Typernova" />
          <span>Typernova Word</span>
        </div>

        <div className="win11-desktop-icon" onClick={() => onNavigate?.('documents', 'excel')}>
          <img src="https://img.icons8.com/color/96/microsoft-excel-2019.png" alt="Sheets" />
          <span>Sheets Excel</span>
        </div>

        <div className="win11-desktop-icon" onClick={() => onNavigate?.('documents', 'ppt')}>
          <img src="https://img.icons8.com/color/96/microsoft-powerpoint-2019.png" alt="Presentation" />
          <span>Slide Deck</span>
        </div>

        <div className="win11-desktop-icon" onClick={() => onNavigate?.('chat')}>
          <img src="https://img.icons8.com/color/96/chat.png" alt="AI Chat" />
          <span>AI Assistant</span>
        </div>

        <div className="win11-desktop-icon" onClick={cycleWallpaper} title="Klik untuk berganti wallpaper HD gratis dari Unsplash">
          <img src="https://img.icons8.com/color/96/picture.png" alt="Wallpaper" />
          <span>Ganti Wallpaper</span>
        </div>
      </div>

      {/* WINDOWS OS STYLE WINDOW FRAME */}
      <div 
        className={`os-window-frame ${isMaximized ? 'maximized' : ''}`} 
        style={!isWindowOpen || isMinimized ? { display: 'none' } : {}}
        onClick={() => setShowStartMenu(false)}
      >
        {/* Windows OS Window Titlebar */}
        <div className="os-window-titlebar">
          <div className="window-title-group">
            <img src="https://img.icons8.com/color/96/cloud-storage.png" alt="OS Logo" className="window-app-icon" style={{ width: 22, height: 22 }} />
            <span className="window-title-text">Deepernova Cloud Explorer v3.0 — Server Connected [{userName}]</span>
          </div>

          <div className="window-controls-group" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button 
              className="win-btn" 
              onClick={() => setIsMinimized(true)} 
              title="Minimize Window"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect y="5" width="12" height="2" rx="1" fill="#475569"/>
              </svg>
            </button>

            <button 
              className="win-btn" 
              onClick={() => setIsMaximized(!isMaximized)} 
              title={isMaximized ? "Restore Down" : "Maximize Window"}
            >
              {isMaximized ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3 1H11V9H9V11H1V3H3V1ZM9 3H3V9H9V3ZM2 4V10H8V9H3C2.44772 9 2 8.55228 2 8V4Z" fill="#475569"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="#475569" strokeWidth="1.8" fill="none"/>
                </svg>
              )}
            </button>

            <button 
              className="win-btn close-btn" 
              onClick={() => setIsWindowOpen(false)} 
              title="Tutup Jendela Explorer"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Explorer Address Bar & Action Bar */}
        <div className="explorer-toolbar">
          <div className="nav-history-btns" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              className="nav-circle-btn"
              onClick={handleNavBack}
              disabled={navIndex === 0}
              style={{
                opacity: navIndex === 0 ? 0.4 : 1,
                cursor: navIndex === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px'
              }}
              title="Kembali (Back)"
            >
              <img src="https://img.icons8.com/fluency/48/back.png" alt="Back" style={{ width: 16, height: 16 }} />
            </button>

            <button
              className="nav-circle-btn"
              onClick={handleNavForward}
              disabled={navIndex >= navHistory.length - 1}
              style={{
                opacity: navIndex >= navHistory.length - 1 ? 0.4 : 1,
                cursor: navIndex >= navHistory.length - 1 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px'
              }}
              title="Maju (Forward)"
            >
              <img src="https://img.icons8.com/fluency/48/forward.png" alt="Forward" style={{ width: 16, height: 16 }} />
            </button>

            <button 
              className="nav-circle-btn" 
              title="Refresh Cloud Storage" 
              onClick={fetchCloudStorageData}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
            >
              <img src="https://img.icons8.com/fluency/48/refresh.png" alt="Refresh" style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Breadcrumb Address Bar */}
          <div className="address-breadcrumb-bar">
            <span 
              className="bc-item" 
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setCurrentFolderId(null);
                setFolderPath([{ id: null, name: 'Server Cloud Drive' }]);
              }}
            >
              <img src="https://img.icons8.com/fluency/48/universe.png" alt="Deepernova OS" style={{ width: 18, height: 18 }} />
              <span>Deepernova OS</span>
            </span>
            <span className="bc-sep">›</span>
            {folderPath.map((folder, idx) => (
              <React.Fragment key={idx}>
                <span 
                  className="bc-item"
                  style={{ cursor: 'pointer', fontWeight: idx === folderPath.length - 1 ? 700 : 400, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setCurrentFolderId(folder.id);
                    setFolderPath(folderPath.slice(0, idx + 1));
                  }}
                >
                  {folder.id === null ? (
                    <>
                      <img src="https://img.icons8.com/fluency/48/cloud-storage.png" alt="Cloud" style={{ width: 18, height: 18 }} />
                      <span>Server Cloud Drive</span>
                    </>
                  ) : (
                    <>
                      <img src="https://img.icons8.com/fluency/48/folder-invoices.png" alt="Folder" style={{ width: 18, height: 18 }} />
                      <span>{folder.name}</span>
                    </>
                  )}
                </span>
                {idx < folderPath.length - 1 && <span className="bc-sep">›</span>}
              </React.Fragment>
            ))}

            {(() => {
              const currentFolder = currentFolderId ? files.find(f => f.id === currentFolderId) : null;
              if (currentFolder) {
                const info = getFolderCreatorInfo(currentFolder);
                return (
                  <div style={{
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontWeight: 500
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <img src="https://img.icons8.com/fluency/48/user-shield.png" alt="Creator" style={{ width: 16, height: 16 }} />
                      Pembuat Folder: <strong style={{ color: '#facc15' }}>{info.name}</strong>
                    </span>
                    <span style={{ opacity: 0.4 }}>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <img src="https://img.icons8.com/fluency/48/manager.png" alt="Role" style={{ width: 16, height: 16 }} />
                      Jabatan: <strong style={{ color: '#38bdf8' }}>{info.role}</strong>
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="explorer-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="text"
                className="explorer-search-input"
                placeholder="Cari berkas apapun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <img 
                src="https://img.icons8.com/fluency/48/search.png" 
                alt="Search" 
                style={{ position: 'absolute', left: '10px', width: 16, height: 16, pointerEvents: 'none' }} 
              />
            </div>

            <button
              className="create-upload-btn"
              style={{ background: '#059669', borderColor: '#047857', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={openNewFolderModal}
              title="Buat Folder Baru (Private / Company)"
            >
              <img src="https://img.icons8.com/fluency/48/add-folder.png" alt="New Folder" style={{ width: 18, height: 18 }} />
              <span>+ Folder Baru</span>
            </button>

            <button
              className="view-mode-toggle-btn"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              title="Ganti Tampilan Grid / List"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <img 
                src={viewMode === 'grid' ? "https://img.icons8.com/fluency/48/list.png" : "https://img.icons8.com/fluency/48/grid.png"} 
                alt={viewMode === 'grid' ? 'List' : 'Grid'} 
                style={{ width: 18, height: 18 }} 
              />
              <span>{viewMode === 'grid' ? 'List' : 'Grid'}</span>
            </button>

            <button 
              className="create-upload-btn" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <img src="https://img.icons8.com/fluency/48/upload-to-cloud.png" alt="Upload" style={{ width: 18, height: 18 }} />
              <span>{isLoading ? 'Mengunggah...' : 'Upload Berkas'}</span>
            </button>
          </div>
        </div>

        {/* Explorer Main Content */}
        <div className="explorer-main-body">
          {/* Windows Left Navigation Sidebar */}
          <aside className="explorer-sidebar">
            <div>
              <div className="sidebar-group">
                <div className="sidebar-title">Penyimpanan Cloud (1 GB Free)</div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('all')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/cloud-storage.png" alt="Cloud" style={{ width: 20, height: 20 }} />
                    <span>My Cloud Drive</span>
                  </div>
                  <span className="item-count-badge">{files.length}</span>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'docx' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('docx')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/microsoft-word-2019.png" alt="Word" style={{ width: 20, height: 20 }} />
                    <span>Typernova (Word)</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'excel' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('excel')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/microsoft-excel-2019.png" alt="Excel" style={{ width: 20, height: 20 }} />
                    <span>Sheets (Excel)</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'pptx' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('pptx')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/microsoft-powerpoint-2019.png" alt="PPT" style={{ width: 20, height: 20 }} />
                    <span>Presentasi Deck</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'pdf' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('pdf')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/pdf-2.png" alt="PDF" style={{ width: 20, height: 20 }} />
                    <span>PDF Vault</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'image' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('image')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/image.png" alt="Image" style={{ width: 20, height: 20 }} />
                    <span>Gambar & Art AI</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'video' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('video')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/video-file.png" alt="Video" style={{ width: 20, height: 20 }} />
                    <span>Video & Media</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'audio' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('audio')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/color/48/music.png" alt="Audio" style={{ width: 20, height: 20 }} />
                    <span>Suara & Audio</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'code' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('code')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/code-file.png" alt="Code" style={{ width: 20, height: 20 }} />
                    <span>Kode & Teks</span>
                  </div>
                </div>
                <div
                  className={`sidebar-nav-item ${activeCategory === 'archive' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('archive')}
                >
                  <div className="nav-item-left">
                    <img src="https://img.icons8.com/fluency/48/zip.png" alt="Archive" style={{ width: 20, height: 20 }} />
                    <span>Arsip & Zip</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-group">
                <div className="sidebar-title">Akses Cepat</div>
                <div className="sidebar-nav-item">
                  <div className="nav-item-left">
                    <span>⭐</span>
                    <span>Berkas Favorit</span>
                  </div>
                </div>
                <div className="sidebar-nav-item">
                  <div className="nav-item-left">
                    <span>🗑️</span>
                    <span>Tempat Sampah</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Meter Widget (Real 1 GB Quota) */}
            <div className="sidebar-storage-widget">
              <h5>☁️ Real Cloud Storage (1 GB)</h5>
              <p>{storageInfo.usedMB} MB / {storageInfo.totalMB} MB (Free Tier)</p>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(2, storageInfo.percent)}%`, height: '100%', background: storageInfo.percent > 90 ? '#ef4444' : '#2563eb' }}></div>
              </div>
            </div>
          </aside>

          {/* Files Grid / List Workspace */}
          <main className="explorer-content-area">
            {filteredFiles.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="os-files-grid">
                  {filteredFiles.map(file => {
                    const cat = (file?.category || file?.type || '').toLowerCase();
                    const ext = file?.name ? file.name.split('.').pop().toLowerCase() : '';
                    const isImg = cat === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext);
                    const storedSessionData = file?.id && typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`cloud_file_data_${file.id}`) : null;
                    const storedMemoryData = file?.id && typeof window !== 'undefined' && window.deepernova_file_cache ? window.deepernova_file_cache.get(file.id)?.dataUrl : null;
                    let imgSrc = file?.thumbnail || file?.dataUrl || storedSessionData || storedMemoryData || file?.url || file?.filePath || file?.path;
                    if (imgSrc === '[[stored]]') imgSrc = storedSessionData || storedMemoryData || null;

                    const hasVisualPreview = isImg && imgSrc;

                    return (
                      <div
                        key={file.id}
                        className={`os-file-item-card ${hasVisualPreview ? 'image-card' : ''}`}
                        onClick={() => handleOpenFile(file)}
                        onContextMenu={(e) => handleItemContextMenu(e, file)}
                        onTouchStart={(e) => handleTouchStart(e, file)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                      >
                        <div className="file-hover-overlay">
                          {(file.category === 'folder' || file.type === 'folder') && (
                            <button className="overlay-btn edit-btn" onClick={(e) => handleEditFolder(file, e)} title="Edit Folder & Struktur Organisasi">✏️</button>
                          )}
                          <button className="overlay-btn del-btn" onClick={(e) => handleDeleteFile(file.id, e)} title="Hapus Berkas">🗑️</button>
                        </div>

                        {hasVisualPreview ? (
                          <div className="file-image-preview-container">
                            <img
                              src={imgSrc}
                              alt={file.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://img.icons8.com/fluency/96/image.png';
                                e.target.style.objectFit = 'contain';
                                e.target.style.padding = '12px';
                              }}
                            />
                            <span className="image-badge-tag">🖼️ {(ext || 'IMG').toUpperCase()}</span>
                          </div>
                        ) : (
                          <div className="file-icon-box">{getFileIcon(file, 56)}</div>
                        )}

                        <h4 className="file-name-text" title={file.name}>{file.name}</h4>
                        {(file.category === 'folder' || file.type === 'folder') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                            {file.folderType === 'private' ? (
                              <span className="folder-type-badge private">🔒 Private</span>
                            ) : (
                              <span className="folder-type-badge company">🏢 Company • 👑 {file.founder || 'Ferry'}</span>
                            )}
                            <p className="file-meta-sub">{file.date || 'Today'}</p>
                          </div>
                        ) : (
                          <p className="file-meta-sub">{file.size} • {file.date || 'Today'}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <table className="os-files-list-table">
                  <thead>
                    <tr>
                      <th>Nama Berkas</th>
                      <th>Kategori / Tipe</th>
                      <th>Ukuran</th>
                      <th>Tanggal Modified</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map(file => (
                      <tr
                        key={file.id}
                        onClick={() => handleOpenFile(file)}
                        onContextMenu={(e) => handleItemContextMenu(e, file)}
                        onTouchStart={(e) => handleTouchStart(e, file)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline-block' }}>{getFileIcon(file, 28)}</span>
                          <strong>{file.name}</strong>
                          {(file.category === 'folder' || file.type === 'folder') && (
                            <span style={{ marginLeft: '8px' }}>
                              {file.folderType === 'private' ? (
                                <span className="folder-type-badge private">🔒 Private</span>
                              ) : (
                                <span className="folder-type-badge company">🏢 Company (Founder: {file.founder || 'Ferry'})</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td>{(file.category || 'FILE').toUpperCase()}</td>
                        <td>{file.size}</td>
                        <td>{file.date || 'Today'}</td>
                        <td>
                          {(file.category === 'folder' || file.type === 'folder') && (
                            <button className="overlay-btn edit-btn" onClick={(e) => handleEditFolder(file, e)} title="Edit Folder & Struktur" style={{ marginRight: '6px', display: 'inline-flex' }}>✏️</button>
                          )}
                          <button className="overlay-btn del-btn" onClick={(e) => handleDeleteFile(file.id, e)} title="Hapus" style={{ display: 'inline-flex' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>☁️</span>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Cloud Storage Masih Kosong</p>
                <p style={{ fontSize: '13px', marginBottom: '20px' }}>Klik tombol "Upload Berkas" di atas untuk mengunggah file apapun (Word, Excel, PDF, Gambar, Video, Audio, ZIP, Kode, dll.)</p>
                <button 
                  className="create-upload-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ margin: '0 auto' }}
                >
                  <span>+</span> Upload Berkas Pertama Anda
                </button>
              </div>
            )}
          </main>
        </div>

        {/* OS Window Statusbar */}
        <footer className="os-statusbar">
          <span>{filteredFiles.length} item ditampilkan (Total {files.length} berkas)</span>
          <span>☁️ Connected to Deepernova Server ({userEmail})</span>
        </footer>
      </div>

      {/* ANDROID FILES OS MOBILE STYLE VIEW */}
      <div className="android-files-app">
        <header className="android-top-appbar">
          <div className="android-title-group">
            <button className="android-back-btn" onClick={() => onNavigate?.('universe')}>‹</button>
            <h2>Cloud Files (1 GB)</h2>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb' }}>☁️ {storageInfo.usedMB} MB / 1 GB</span>
        </header>

        <div className="android-search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Cari berkas cloud..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="android-chips-scroll">
          <button className={`android-chip ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>Semua</button>
          <button className={`android-chip ${activeCategory === 'docx' ? 'active' : ''}`} onClick={() => setActiveCategory('docx')}>Word</button>
          <button className={`android-chip ${activeCategory === 'excel' ? 'active' : ''}`} onClick={() => setActiveCategory('excel')}>Excel</button>
          <button className={`android-chip ${activeCategory === 'pptx' ? 'active' : ''}`} onClick={() => setActiveCategory('pptx')}>PPT</button>
          <button className={`android-chip ${activeCategory === 'pdf' ? 'active' : ''}`} onClick={() => setActiveCategory('pdf')}>PDF</button>
          <button className={`android-chip ${activeCategory === 'image' ? 'active' : ''}`} onClick={() => setActiveCategory('image')}>Gambar</button>
          <button className={`android-chip ${activeCategory === 'video' ? 'active' : ''}`} onClick={() => setActiveCategory('video')}>Video</button>
          <button className={`android-chip ${activeCategory === 'audio' ? 'active' : ''}`} onClick={() => setActiveCategory('audio')}>Audio</button>
          <button className={`android-chip ${activeCategory === 'code' ? 'active' : ''}`} onClick={() => setActiveCategory('code')}>Kode</button>
        </div>

        <div className="android-file-list">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className="android-file-item"
              onClick={() => handleOpenFile(file)}
              onContextMenu={(e) => handleItemContextMenu(e, file)}
              onTouchStart={(e) => handleTouchStart(e, file)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
            >
              <div className="android-file-left">
                <div className="android-file-icon">{getFileIcon(file, 38)}</div>
                <div className="android-file-info">
                  <h4>{file.name}</h4>
                  {(file.category === 'folder' || file.type === 'folder') ? (
                    <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {file.folderType === 'private' ? '🔒 Private' : `🏢 Company (Founder: ${file.founder || 'Ferry'})`}
                    </p>
                  ) : (
                    <p>{file.size} • {file.date || 'Today'}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(file.category === 'folder' || file.type === 'folder') && (
                  <button className="overlay-btn edit-btn" onClick={(e) => handleEditFolder(file, e)} title="Edit Folder">✏️</button>
                )}
                <button className="overlay-btn del-btn" onClick={(e) => handleDeleteFile(file.id, e)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>

        <button className="android-fab" onClick={() => fileInputRef.current?.click()} title="Upload Berkas Semua Jenis">
          +
        </button>

        <nav className="android-bottom-nav">
          <div className="bottom-nav-item active" onClick={() => setActiveCategory('all')}>
            <span className="icon">☁️</span>
            <span>Drive (1GB)</span>
          </div>
          <div className="bottom-nav-item" onClick={() => onNavigate?.('universe')}>
            <span className="icon">🌌</span>
            <span>Universe</span>
          </div>
          <div className="bottom-nav-item" onClick={() => onNavigate?.('chat')}>
            <span className="icon">💬</span>
            <span>Chat AI</span>
          </div>
        </nav>
      </div>

      {/* Built-in Multi-Media & Document Viewer Modal */}
      {selectedMediaFile && (() => {
        const ext = selectedMediaFile.name ? selectedMediaFile.name.split('.').pop()?.toLowerCase() : '';
        const isVideo = ['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext) || selectedMediaFile.category === 'video';
        const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'tiff', 'heic'].includes(ext) || selectedMediaFile.category === 'image';
        const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext) || selectedMediaFile.category === 'audio';
        const isCodeText = selectedMediaFile.text || ['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'cpp', 'c', 'cs', 'java', 'php', 'rb', 'sql', 'sh', 'xml', 'yaml', 'yml'].includes(ext) || selectedMediaFile.category === 'code';

        const mediaUrl = selectedMediaFile.dataUrl || selectedMediaFile.url || selectedMediaFile.filePath || (isVideo ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' : 'https://img.icons8.com/fluency/512/landscape.png');

        return (
          <div className="media-viewer-backdrop" onClick={() => setSelectedMediaFile(null)}>
            <div className="media-viewer-content" onClick={(e) => e.stopPropagation()}>
              <div className="media-viewer-header">
                <div className="media-title-group">
                  <span className="media-type-badge">
                    {isVideo ? '🎥 VIDEO' : isImage ? '🖼️ GAMBAR' : isAudio ? '🎵 AUDIO' : isCodeText ? '💻 TEKS/KODE' : '📄 BERKAS CLOUD'}
                  </span>
                  <h3>{selectedMediaFile.name}</h3>
                </div>
                <div className="media-header-actions">
                  <button className="media-close-btn" onClick={() => setSelectedMediaFile(null)} title="Tutup Viewer">✕</button>
                </div>
              </div>

              <div className="media-viewer-body">
                {isVideo ? (
                  <video src={mediaUrl} controls autoPlay className="preview-video-element">
                    Browser Anda tidak mendukung pemutar video.
                  </video>
                ) : isImage ? (
                  <img src={mediaUrl} alt={selectedMediaFile.name} className="preview-image-element" />
                ) : isAudio ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <span style={{ fontSize: '72px', display: 'block', marginBottom: '20px' }}>🎵</span>
                    <audio src={mediaUrl} controls autoPlay style={{ width: '100%', maxWidth: '500px' }} />
                  </div>
                ) : isCodeText ? (
                  <div style={{ width: '100%', maxHeight: '55vh', overflow: 'auto', background: '#090d16', padding: '16px', borderRadius: '8px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                    {selectedMediaFile.text || (typeof selectedMediaFile.content === 'string' ? selectedMediaFile.content : JSON.stringify(selectedMediaFile.content, null, 2)) || 'Menampilkan isi berkas teks...'}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1' }}>
                    <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>{getFileIcon(selectedMediaFile)}</span>
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>{selectedMediaFile.name}</p>
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>Ukuran: {selectedMediaFile.size} • Format Cloud Vault</p>
                  </div>
                )}
              </div>

              <div className="media-viewer-footer">
                <span>{selectedMediaFile.size || 'Format Media'} • {selectedMediaFile.date || 'Cloud Storage'}</span>
                <a
                  href={mediaUrl}
                  download={selectedMediaFile.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="media-download-btn"
                >
                  📥 Unduh Berkas
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create / Edit Folder Modal Dialog */}
      {showNewFolderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(6px)', padding: '16px' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {editingFolder ? '✏️ Edit Metadata Folder' : '📁 Buat Folder Baru'}
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#64748b' }}>
              Tentukan tipe folder (Pribadi / Perusahaan) dan kelola struktur organisasi:
            </p>

            {/* Folder Type Selector Tile */}
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
              1. Tipe Folder:
            </label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div
                onClick={() => setFolderType('private')}
                style={{
                  flex: 1,
                  padding: '14px 12px',
                  borderRadius: '12px',
                  border: folderType === 'private' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  background: folderType === 'private' ? '#fffbeb' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>🔒</span>
                <strong style={{ fontSize: '14px', color: folderType === 'private' ? '#b45309' : '#334155', display: 'block' }}>Folder Private</strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Berkas pribadi & rahasia</span>
              </div>

              <div
                onClick={() => setFolderType('company')}
                style={{
                  flex: 1,
                  padding: '14px 12px',
                  borderRadius: '12px',
                  border: folderType === 'company' ? '2px solid #10b981' : '1px solid #cbd5e1',
                  background: folderType === 'company' ? '#ecfdf5' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>🏢</span>
                <strong style={{ fontSize: '14px', color: folderType === 'company' ? '#047857' : '#334155', display: 'block' }}>Folder Company</strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Struktur perusahaan & tim</span>
              </div>
            </div>

            {/* Folder Name Input */}
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              2. Nama Folder:
            </label>
            <input
              type="text"
              placeholder="Nama Folder (misal: Riset AI, Laporan Keuangan, Operasional HQ)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFolder(); }}
              autoFocus
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }}
            />

            {/* Company Org Structure Form (Only if folderType === 'company') */}
            {folderType === 'company' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏢 Struktur Organisasi & Akses Karyawan
                </h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  ℹ️ Karyawan yang didaftarkan dengan akun <strong>@deepmail.com</strong> di sini akan otomatis terhubung & melihat folder ini saat mereka login.
                </p>

                {/* Founder (Wajib / Utama) */}
                <div style={{ marginBottom: '12px', background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#047857', display: 'block', marginBottom: '6px' }}>
                    👑 Founder / Pendiri (Wajib Utama):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Nama Founder (contoh: Ferry)"
                      value={founderName}
                      onChange={(e) => setFounderName(e.target.value)}
                      style={{ flex: 1, minWidth: '140px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
                    />
                    <input
                      type="email"
                      placeholder="Email Akun @deepmail.com (contoh: ferry@deepmail.com)"
                      value={founderEmail}
                      onChange={(e) => setFounderEmail(e.target.value)}
                      style={{ flex: 1.2, minWidth: '180px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* CEO / Direktur Utama (Opsional) */}
                <div style={{ marginBottom: '12px', background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    👔 CEO / Direktur Utama (Opsional):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Nama CEO (contoh: Anju)"
                      value={ceoName}
                      onChange={(e) => setCeoName(e.target.value)}
                      style={{ flex: 1, minWidth: '140px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <input
                      type="email"
                      placeholder="Email Akun @deepmail.com (contoh: anju@deepmail.com)"
                      value={ceoEmail}
                      onChange={(e) => setCeoEmail(e.target.value)}
                      style={{ flex: 1.2, minWidth: '180px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Custom Additional Roles / Employee Structure */}
                <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      👥 Karyawan & Tim Terhubung (@deepmail.com):
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCustomRole}
                      style={{ background: '#e0e7ff', border: 'none', color: '#4338ca', fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      + Tambah Karyawan
                    </button>
                  </div>

                  {customRoles.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Jabatan (CTO, CFO, Ops)"
                        value={item.role}
                        onChange={(e) => handleUpdateCustomRole(idx, 'role', e.target.value)}
                        style={{ flex: 1, minWidth: '100px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#ffffff' }}
                      />
                      <input
                        type="text"
                        placeholder="Nama Karyawan"
                        value={item.name}
                        onChange={(e) => handleUpdateCustomRole(idx, 'name', e.target.value)}
                        style={{ flex: 1, minWidth: '110px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#ffffff' }}
                      />
                      <input
                        type="email"
                        placeholder="email@deepmail.com"
                        value={item.email || ''}
                        onChange={(e) => handleUpdateCustomRole(idx, 'email', e.target.value)}
                        style={{ flex: 1.3, minWidth: '140px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#ffffff' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomRole(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                        title="Hapus Karyawan Ini"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => { setShowNewFolderModal(false); setEditingFolder(null); setNewFolderName(''); }}
                style={{ padding: '9px 18px', background: '#f1f5f9', border: 'none', borderRadius: '10px', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Batal
              </button>
              <button
                onClick={handleSaveFolder}
                disabled={!newFolderName.trim()}
                style={{ padding: '9px 20px', background: newFolderName.trim() ? (folderType === 'company' ? '#059669' : '#d97706') : '#94a3b8', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: 700, cursor: newFolderName.trim() ? 'pointer' : 'not-allowed', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                {editingFolder ? 'Simpan Perubahan' : (folderType === 'company' ? '🏢 Buat Company Folder' : '🔒 Buat Private Folder')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Windows 11 Taskbar at Bottom */}
      <div className="win11-taskbar">
        {/* Left Side: Live Clock, Date, and System Tray */}
        <div className="taskbar-left-group" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="taskbar-clock" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
            <span className="time-text" style={{ fontWeight: 700, color: '#ffffff', fontSize: '12px' }}>{timeString}</span>
            <span className="date-text" style={{ color: '#94a3b8', fontSize: '10px' }}>{dateString}</span>
          </div>
          <div className="taskbar-system-tray" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#e2e8f0' }}>
            <span title="Koneksi Cloud Online">📶</span>
            <span title="Suara System 100%">🔊</span>
            <span title="Baterai 100%">🔋</span>
          </div>
        </div>

        {/* Center Side: Start Button, Search Box, App Icons */}
        <div className="taskbar-center-group">
          {/* Start Menu Button */}
          <button 
            className={`taskbar-btn start-btn ${showStartMenu ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowStartMenu(!showStartMenu); }}
            title="Start Menu"
          >
            <img src="https://img.icons8.com/color/48/windows-11.png" alt="Start Menu" />
          </button>

          {/* Taskbar Search Input */}
          <div className="taskbar-search-box">
            <img src="https://img.icons8.com/material-outlined/24/94a3b8/search.png" alt="Search" />
            <input 
              type="text" 
              placeholder="Search files or apps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={() => { setIsWindowOpen(true); setIsMinimized(false); }}
            />
          </div>

          {/* App Icons */}
          <button 
            className={`taskbar-btn ${isWindowOpen && !isMinimized ? 'active' : ''}`}
            onClick={() => { setIsWindowOpen(true); setIsMinimized(false); }}
            title="Deepernova Cloud Explorer"
          >
            <img src="https://img.icons8.com/color/48/folder-invoices.png" alt="Explorer" />
            {isWindowOpen && <span className="active-dot"></span>}
          </button>

          <button className="taskbar-btn" onClick={() => onNavigate?.('documents', 'word')} title="Typernova Word">
            <img src="https://img.icons8.com/color/48/microsoft-word-2019.png" alt="Word" />
          </button>

          <button className="taskbar-btn" onClick={() => onNavigate?.('documents', 'excel')} title="Sheets Excel">
            <img src="https://img.icons8.com/color/48/microsoft-excel-2019.png" alt="Excel" />
          </button>

          <button className="taskbar-btn" onClick={() => onNavigate?.('chat')} title="AI Assistant">
            <img src="https://img.icons8.com/color/48/chat.png" alt="Chat" />
          </button>
        </div>

        {/* Right Side: Desktop Quick Switch */}
        <div className="taskbar-right-group" style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            className="taskbar-btn" 
            onClick={() => setIsWindowOpen(!isWindowOpen)} 
            title="Tampilkan Desktop"
            style={{ width: '12px', borderLeft: '1px solid rgba(255,255,255,0.2)', height: '48px', borderRadius: 0 }}
          />
        </div>
      </div>

      {/* Windows 11 Start Menu Popup */}
      {showStartMenu && (
        <div className="win11-start-menu-popup" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-header">
            <div className="user-profile-info">
              <img src="https://img.icons8.com/fluency/96/user-male-circle.png" alt="User Avatar" />
              <div>
                <h4>{userName}</h4>
                <p>{userEmail}</p>
              </div>
            </div>
          </div>

          <div className="start-menu-section-title">Pinned Apps</div>
          <div className="start-menu-grid">
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); setIsWindowOpen(true); setIsMinimized(false); }}>
              <img src="https://img.icons8.com/color/96/folder-invoices.png" alt="Explorer" />
              <span>Cloud Explorer</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); onNavigate?.('documents', 'word'); }}>
              <img src="https://img.icons8.com/color/96/microsoft-word-2019.png" alt="Word" />
              <span>Typernova Word</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); onNavigate?.('documents', 'excel'); }}>
              <img src="https://img.icons8.com/color/96/microsoft-excel-2019.png" alt="Excel" />
              <span>Sheets Excel</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); onNavigate?.('documents', 'ppt'); }}>
              <img src="https://img.icons8.com/color/96/microsoft-powerpoint-2019.png" alt="PPT" />
              <span>Slide Deck</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); onNavigate?.('chat'); }}>
              <img src="https://img.icons8.com/color/96/chat.png" alt="Chat" />
              <span>AI Assistant</span>
            </div>
            <div className="start-app-item" onClick={() => { setShowStartMenu(false); cycleWallpaper(); }}>
              <img src="https://img.icons8.com/color/96/picture.png" alt="Wallpaper" />
              <span>Ganti Background</span>
            </div>
          </div>

          <div className="start-menu-footer">
            <button className="power-btn" onClick={() => { setShowStartMenu(false); onNavigate?.('universe'); }}>
              <span>⏻</span> Exit OS / Universe
            </button>
          </div>
        </div>
      )}

      {/* FLOATING CONTEXT MENU (RIGHT-CLICK & LONG-PRESS) */}
      {contextMenu.visible && contextMenu.file && (
        <div
          className="os-context-menu"
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="menu-header">
            <span className="menu-file-icon">{getFileIcon(contextMenu.file, 20)}</span>
            <span className="menu-file-name">{contextMenu.file.name}</span>
          </div>

          {(() => {
            const info = getFileUploaderAndFolderInfo(contextMenu.file);
            if (!info) return null;
            return (
              <div style={{
                padding: '8px 12px',
                background: 'rgba(15, 23, 42, 0.75)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '11px',
                lineHeight: '1.5'
              }}>
                <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <img src="https://img.icons8.com/fluency/48/user-shield.png" alt="User" style={{ width: 14, height: 14 }} />
                  <span>{info.isFolder ? 'Pembuat Folder' : 'Diunggah oleh'}: <strong style={{ color: '#facc15' }}>{info.uploaderName}</strong></span>
                </div>
                <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <img src="https://img.icons8.com/fluency/48/manager.png" alt="Role" style={{ width: 14, height: 14 }} />
                  <span>Jabatan: <strong style={{ color: '#38bdf8' }}>{info.uploaderRole}</strong></span>
                </div>
                {!info.isFolder && (
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <img src="https://img.icons8.com/fluency/48/folder-invoices.png" alt="Location" style={{ width: 13, height: 13 }} />
                    <span>Lokasi Folder: <span style={{ color: '#e2e8f0' }}>{info.folderName}</span></span>
                  </div>
                )}
              </div>
            );
          })()}
          <div className="menu-divider" />
          <button className="menu-item" onClick={() => { handleOpenFile(contextMenu.file); setContextMenu({ visible: false, x: 0, y: 0, file: null }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="https://img.icons8.com/fluency/48/opened-folder.png" alt="Open" style={{ width: 16, height: 16 }} />
            <span>Buka Berkas</span>
          </button>
          {(contextMenu.file.category === 'folder' || contextMenu.file.type === 'folder') && (
            <button className="menu-item" onClick={(e) => { handleEditFolder(contextMenu.file, e); setContextMenu({ visible: false, x: 0, y: 0, file: null }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="https://img.icons8.com/fluency/48/edit.png" alt="Edit" style={{ width: 16, height: 16 }} />
              <span>Edit Folder & Struktur</span>
            </button>
          )}
          {contextMenu.file.category !== 'folder' && contextMenu.file.type !== 'folder' && (
            <a
              className="menu-item"
              href={contextMenu.file.dataUrl || contextMenu.file.url || '#'}
              download={contextMenu.file.name}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setContextMenu({ visible: false, x: 0, y: 0, file: null })}
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <img src="https://img.icons8.com/fluency/48/download.png" alt="Download" style={{ width: 16, height: 16 }} />
              <span>Unduh Berkas</span>
            </a>
          )}
          <div className="menu-divider" />
          <button className="menu-item danger" onClick={(e) => { handleDeleteFile(contextMenu.file.id, e); setContextMenu({ visible: false, x: 0, y: 0, file: null }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="https://img.icons8.com/fluency/48/trash.png" alt="Delete" style={{ width: 16, height: 16 }} />
            <span>Hapus Berkas</span>
          </button>
        </div>
      )}

      {/* FLOATING UPLOAD NOTIFICATION TOAST */}
      {uploadNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          maxWidth: '420px'
        }}>
          <div style={{ fontSize: '28px', display: 'flex', alignItems: 'center' }}>
            <img src="https://img.icons8.com/fluency/48/checked.png" alt="Success" style={{ width: 32, height: 32 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#38bdf8', marginBottom: '2px' }}>
              Berhasil Mengunggah {uploadNotification.count} Berkas!
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src="https://img.icons8.com/fluency/48/folder-invoices.png" alt="Folder" style={{ width: 14, height: 14 }} />
              <span>Folder: <strong style={{ color: '#fff' }}>{uploadNotification.folderName}</strong></span>
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src="https://img.icons8.com/fluency/48/user-shield.png" alt="Creator" style={{ width: 14, height: 14 }} />
              <span>Pembuat Folder: <strong style={{ color: '#facc15' }}>{uploadNotification.creatorName}</strong></span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img src="https://img.icons8.com/fluency/48/manager.png" alt="Role" style={{ width: 14, height: 14 }} />
              <span>Jabatan: <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{uploadNotification.creatorRole}</span></span>
            </div>
          </div>
          <button 
            onClick={() => setUploadNotification(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default AIManagerOffice;
