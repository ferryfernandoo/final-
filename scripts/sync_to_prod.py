import shutil
import os

worktree = r'C:\Users\ferry fernando\.gemini\antigravity\worktrees\deepernova ai\ai_agent_capability'
prod = r'F:\a final deepernova ai\deepernova ai'

files_to_sync = [
    'src/components/LandingPage.jsx',
    'src/components/LandingPage.css',
    'src/components/ChatBot.jsx',
    'src/components/chatbot/ChatMessageFormatter.jsx',
    'src/components/chatbot/chatConstants.js',
    'src/components/chatbot/chatTextUtils.jsx',
    'src/locales/landingTranslations.js',
    'src/apiConfig.js',
    'server/server.js',
    'package.json',
    'vercel.json',
    '.gitignore',
    'scripts/copy_dte_dist.mjs',
    'scripts/auto_start_all.mjs',
    'public/order-dte.apk',
    'dist/order-dte.apk',
    'order-dte.apk',
    'dist/index.html',
    'search-engine/vercel.json',
    'scripts/resilient_tunnel.mjs'
]

for rel_path in files_to_sync:
    src = os.path.join(worktree, rel_path.replace('/', os.sep))
    dest = os.path.join(prod, rel_path.replace('/', os.sep))
    if os.path.exists(src):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(src, dest)
        print(f"Synced file: {rel_path}")
    else:
        print(f"Warning: {src} does not exist!")

# Sync dist/dte, public/dte, and dist/assets directories
for dir_name in ['dist/dte', 'public/dte', 'dist/assets']:
    src_dir = os.path.join(worktree, dir_name.replace('/', os.sep))
    dest_dir = os.path.join(prod, dir_name.replace('/', os.sep))
    if os.path.exists(src_dir):
        if os.path.exists(dest_dir):
            shutil.rmtree(dest_dir)
        shutil.copytree(src_dir, dest_dir)
        print(f"Synced directory: {dir_name}")

print("Sync to production repository finished successfully!")

