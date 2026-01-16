import os

# ==========================================
# 1. 設定區域 (Configuration)
# ==========================================

# 輸出檔名
OUTPUT_FILE = 'project_context_all.txt'

# 絕對要忽略的目錄 (黑名單)
# 包含前後端的依賴包、編譯產出、快取、資料庫目錄
IGNORE_DIRS = {
    # 通用 / 系統
    '.git', '.idea', '.vscode', '.DS_Store',
    
    # Backend (Python)
    '.venv', 'venv', 'env', '__pycache__', 
    'dist', 'build', 'egg-info',
    
    # Frontend (Node/React)
    'node_modules',  # <--- 最重要，務必忽略
    'coverage', '.next', '.nuxt', 'out', # Build artifacts
    
    # Data / Logs
    'logs', 'tmp', 'temp',
    '__data__', 'data', 'memory_db', 'snapshots', 'chroma_db'
}

# 要忽略的檔案副檔名 (黑名單)
IGNORE_EXTS = {
    # Binary / Executables
    '.pyc', '.pyd', '.exe', '.dll', '.so', '.bin',
    
    # Database / Lock files
    '.sqlite', '.db', '.db-journal', '.parquet',
    '.lock',  # 忽略 poetry.lock, yarn.lock, Cargo.lock (太長且對理解邏輯無用)
    
    # Media / Assets (通常不需要讀取二進位內容)
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', 
    '.mp4', '.mp3', '.pdf', '.zip', '.gz', '.tar', '.rar',
    
    # Fonts
    '.ttf', '.woff', '.woff2', '.eot'
}

# 允許讀取的程式碼副檔名 (白名單)
ALLOWED_EXTS = {
    # Backend
    '.py',
    
    # Frontend (React/Vite/TS)
    '.js', '.jsx', '.ts', '.tsx', 
    '.css', '.scss', '.html', 
    
    # Config & Documentation
    '.json', '.yaml', '.yml', '.toml', '.ini',
    '.md', '.txt', '.env.example' # 只讀範例環境檔，不讀真實 .env
}

# 強制包含的特定檔案 (即使副檔名不在上面，或沒有副檔名)
FORCE_INCLUDE = {
    'Dockerfile', 'docker-compose.yml', 'Makefile', 
    'requirements.txt', 'package.json', 'vite.config.ts',
    'tsconfig.json'
}

# 強制排除的特定檔案
IGNORE_FILES = {
    OUTPUT_FILE,        # 排除輸出檔自己
    'merge_project.py', # 排除腳本自己
    '.env',             # 排除真實密鑰
    'package-lock.json' # 太長，通常看 package.json 就夠了
}

# ==========================================
# 2. 核心邏輯 (Core Logic)
# ==========================================

def is_target_file(filename):
    """判斷檔案是否應該被讀取"""
    if filename in IGNORE_FILES:
        return False
    
    if filename in FORCE_INCLUDE:
        return True
        
    # 檢查副檔名
    _, ext = os.path.splitext(filename)
    if ext in IGNORE_EXTS:
        return False
        
    return ext in ALLOWED_EXTS

def merge_files():
    """執行專案掃描與合併"""
    print(f"🚀 Starting to merge project files into '{OUTPUT_FILE}'...")
    print(f"📂 Ignoring directories: {', '.join(list(IGNORE_DIRS)[:5])}...")
    
    file_count = 0
    total_size = 0
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        
        # --- PART 1: 寫入目錄結構樹 (Tree View) ---
        outfile.write("=== PROJECT DIRECTORY STRUCTURE ===\n")
        for root, dirs, files in os.walk('.'):
            # 在遍歷時直接修改 dirs 列表，防止進入忽略的資料夾
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            level = root.replace('.', '').count(os.sep)
            indent = ' ' * 4 * level
            outfile.write(f"{indent}{os.path.basename(root)}/\n")
            
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if is_target_file(f):
                    outfile.write(f"{subindent}{f}\n")
        outfile.write("\n=======================================\n\n")

        # --- PART 2: 寫入檔案內容 (File Contents) ---
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if not is_target_file(file):
                    continue

                file_path = os.path.join(root, file)
                # 轉成標準路徑格式顯示
                display_path = file_path.replace('\\', '/')
                if display_path.startswith('./'):
                    display_path = display_path[2:]
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                        content = infile.read()
                        
                        outfile.write(f"--- START OF FILE: {display_path} ---\n")
                        outfile.write(content)
                        # 確保文件結尾有換行
                        if not content.endswith('\n'):
                            outfile.write('\n')
                        outfile.write(f"--- END OF FILE: {display_path} ---\n\n")
                        
                        print(f"  + Merged: {display_path}")
                        file_count += 1
                        total_size += len(content)
                        
                except Exception as e:
                    print(f"  ! Error reading {display_path}: {e}")

    # 結束報告
    size_kb = total_size / 1024
    print(f"\n✅ Done!")
    print(f"📊 Processed {file_count} files.")
    print(f"💾 Total size: {size_kb:.2f} KB")
    print(f"📄 Output file: {os.path.abspath(OUTPUT_FILE)}")

if __name__ == '__main__':
    merge_files()