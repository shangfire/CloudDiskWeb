<!--
 * @Author: shanghanjin
 * @Date: 2024-09-18 10:11:05
 * @LastEditTime: 2025-01-06 17:09:35
 * @FilePath: \CloudDiskWeb\src\App.vue
 * @Description:
-->
<template>
  <div id="app">
    <nav class="navbar">
      <button @click="goToParent" class="nav-button" :disabled="uploading">返回</button>
      <input type="text" disabled :value="currentPath" class="path-input" />
      <div class="nav-right">
        <button @click="newFolder" class="nav-button" :disabled="uploading">新建文件夹</button>
        <div class="upload-dropdown" ref="uploadDropdown">
          <button class="nav-button" :disabled="uploading" @click="toggleUploadMenu">上传 ▾</button>
          <div v-if="uploadMenuOpen" class="upload-menu">
            <button @click="triggerFileInputAndClose">上传文件</button>
            <button @click="triggerFolderInputAndClose">上传文件夹</button>
          </div>
        </div>
        <button class="nav-button" :disabled="uploading" @click="handlePasteButton">粘贴文本</button>
        <input type="file" ref="fileInput" multiple @change="handleFileSelect" style="display:none;" />
        <input type="file" ref="folderInput" webkitdirectory multiple @change="handleFolderSelect" style="display:none;" />
      </div>
    </nav>

    <!-- 上传面板 -->
    <div v-if="uploading" class="upload-panel">
      <div class="upload-info">
        <span class="upload-label">{{ uploadLabel }}</span>
        <span class="upload-filename">{{ uploadingFileName }}</span>
      </div>
      <div class="upload-progress-wrap">
        <div class="upload-progress-bar" :style="{ width: uploadProgress + '%' }"></div>
      </div>
      <span class="upload-percent">{{ uploadProgress }}%</span>
      <button @click="cancelUpload" class="cancel-upload-btn">取消</button>
    </div>

    <p class="paste-hint">复制<strong>文件</strong>后按 Ctrl+V 可直接上传，复制<strong>文本</strong>后按 Ctrl+V 或点击"粘贴文本"可创建 .txt 文件上传；上传文件夹请使用"上传 ▾"菜单</p>

    <!-- Modal -->
    <div v-if="modal.visible" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box" :class="{ large: modal.type === 'upload-preview' }">

        <!-- 纯文本粘贴 -->
        <template v-if="modal.type === 'text'">
          <div class="modal-field">
            <label class="modal-label">文件名</label>
            <input v-model="modal.filename" class="modal-title-input" />
          </div>
          <div class="modal-field">
            <label class="modal-label">内容预览</label>
            <pre class="modal-preview">{{ modal.preview }}</pre>
          </div>
          <div class="modal-actions">
            <button @click="closeModal" class="modal-btn">取消</button>
            <button @click="confirmTextUpload" class="modal-btn primary">确定上传</button>
          </div>
        </template>

        <!-- 上传预览 -->
        <template v-else-if="modal.type === 'upload-preview'">
          <div class="preview-header">
            <span class="modal-msg">准备上传</span>
            <span class="preview-stats">{{ modal.stats.folders }} 个文件夹，{{ modal.stats.files }} 个文件</span>
          </div>
          <div v-if="modal.conflicts.length > 0" class="conflict-warning">
            ⚠ 以下名称与当前目录冲突，请先删除或重命名后再上传：
            <ul class="conflict-list">
              <li v-for="c in modal.conflicts" :key="c">{{ c }}</li>
            </ul>
          </div>
          <div class="tree-container">
            <div
              v-for="item in modal.flatList"
              :key="item.path"
              class="tree-item"
              :style="{ paddingLeft: (item.depth * 16 + 8) + 'px' }"
            >
              <span class="tree-icon">{{ item.isFolder ? '📁' : '📄' }}</span>
              <span class="tree-name" :class="{ 'conflict-name': item.depth === 0 && modal.conflicts.includes(item.name) }">{{ item.name }}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="closeModal" class="modal-btn">取消</button>
            <button @click="confirmUpload" class="modal-btn primary" :disabled="modal.conflicts.length > 0">确认上传</button>
          </div>
        </template>

        <!-- 文件夹粘贴警告 -->
        <template v-else-if="modal.type === 'folder-paste-warning'">
          <p class="modal-msg">粘贴内容包含文件夹，浏览器不支持通过粘贴上传文件夹。</p>
          <p class="modal-msg" style="color:#666;font-size:0.88em;">请使用"上传 ▾"→"上传文件夹"按钮选择文件夹上传。</p>
          <div class="modal-actions">
            <button @click="closeModal" class="modal-btn">关闭</button>
          </div>
        </template>

        <!-- 错误 -->
        <template v-else-if="modal.type === 'error'">
          <p class="modal-msg">剪贴板中没有可上传的内容。</p>
          <div class="modal-actions">
            <button @click="closeModal" class="modal-btn">关闭</button>
          </div>
        </template>

      </div>
    </div>

    <file-list
      :folders="folders"
      :files="files"
      :currentPath="currentPath"
      :currentFolderID="currentFolderID"
      :parentFolderID="parentFolderID"
      :disabled="uploading"
      @delete-file="handleDeleteFile"
      @delete-folder="handleDeleteFolder"
      @enter-folder="handleEnterFolder"
      @update-name="updateName"
      @add-temp-folder="handleAddTempFolder"
      @remove-temp-folder="handleRemoveTempFolder"
      @create-folder="handleCreateFolder"
      @download-file="handleDownloadFile"
      @download-folder="handleDownloadFolder"
      ref="fileList"
    ></file-list>
  </div>
</template>

<script>
import FileList from './components/FileList.vue';
import axio from 'axios';

export default {
  name: 'App',
  components: { FileList },
  data() {
    return {
      currentPath: '/',
      currentFolderID: 1,
      parentFolderID: 0,
      folders: [],
      files: [],
      uploading: false,
      uploadProgress: 0,
      uploadLabel: '正在上传',
      uploadingFileName: '',
      uploadController: null,
      uploadTotal: 0,
      uploadCurrent: 0,
      uploadCancelled: false,
      uploadMenuOpen: false,
      modal: {
        visible: false,
        type: null,
        filename: '',
        content: '',
        preview: '',
        uploadTree: null,
        flatList: [],
        stats: { folders: 0, files: 0 },
        conflicts: [],
      },
    };
  },
  methods: {
    // ── 目录操作 ─────────────────────────────────────────
    sortFoldersAndFiles(folders = this.folders, files = this.files) {
      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));
    },
    async queryFolder(folderID) {
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL}/api/queryFolder`;
        const response = await axio.post(url, { folderID });
        const { folders, files } = response.data;
        this.sortFoldersAndFiles(folders, files);
        this.currentPath = response.data.self.path;
        this.parentFolderID = response.data.self.parentFolderId;
        this.currentFolderID = response.data.self.id;
        this.folders = folders;
        this.files = files;
      } catch (error) {
        console.error(error);
      }
    },
    goToParent() {
      if (this.parentFolderID !== 0) this.queryFolder(this.parentFolderID);
    },
    newFolder() {
      this.$refs.fileList.createFolder();
    },
    handleEnterFolder(folder) {
      this.queryFolder(folder.id);
    },

    // ── 上传入口 ─────────────────────────────────────────
    triggerFileInput() { this.$refs.fileInput.click(); },
    triggerFolderInput() { this.$refs.folderInput.click(); },
    toggleUploadMenu() { this.uploadMenuOpen = !this.uploadMenuOpen; },
    triggerFileInputAndClose() { this.uploadMenuOpen = false; this.$refs.fileInput.click(); },
    triggerFolderInputAndClose() { this.uploadMenuOpen = false; this.$refs.folderInput.click(); },
    handleClickOutsideUploadMenu(e) {
      if (this.$refs.uploadDropdown && !this.$refs.uploadDropdown.contains(e.target)) {
        this.uploadMenuOpen = false;
      }
    },

    handleFileSelect(event) {
      const files = Array.from(event.target.files);
      event.target.value = '';
      if (files.length) this.prepareUploadPreview(files);
    },
    handleFolderSelect(event) {
      const files = Array.from(event.target.files);
      event.target.value = '';
      if (files.length) this.prepareUploadPreview(files);
    },

    // ── 上传预览构建 ──────────────────────────────────────
    prepareUploadPreview(fileList) {
      const tree = this.buildUploadTree(fileList);
      const flatList = this.flattenTree(tree);
      const stats = this.countStats(tree);
      const conflicts = this.checkDuplicates(tree);
      this.modal = {
        visible: true,
        type: 'upload-preview',
        filename: '',
        content: '',
        preview: '',
        uploadTree: tree,
        flatList,
        stats,
        conflicts,
      };
    },

    buildUploadTree(fileList) {
      const root = { children: {} };
      for (const file of fileList) {
        const path = file.webkitRelativePath || file.name;
        const parts = path.split('/').filter(Boolean);
        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!node.children[parts[i]]) {
            node.children[parts[i]] = { name: parts[i], isFolder: true, children: {} };
          }
          node = node.children[parts[i]];
        }
        const fileName = parts[parts.length - 1];
        node.children[fileName] = { name: fileName, isFolder: false, file, children: {} };
      }
      return root;
    },

    flattenTree(node, depth = 0, prefix = '') {
      const result = [];
      const sorted = Object.values(node.children).sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const child of sorted) {
        const path = prefix ? `${prefix}/${child.name}` : child.name;
        result.push({ name: child.name, isFolder: child.isFolder, depth, path });
        if (child.isFolder) {
          result.push(...this.flattenTree(child, depth + 1, path));
        }
      }
      return result;
    },

    countStats(node) {
      let folders = 0, files = 0;
      for (const child of Object.values(node.children)) {
        if (child.isFolder) {
          folders++;
          const sub = this.countStats(child);
          folders += sub.folders;
          files += sub.files;
        } else {
          files++;
        }
      }
      return { folders, files };
    },

    checkDuplicates(tree) {
      const existing = new Set([
        ...this.folders.map(f => f.name),
        ...this.files.map(f => f.name),
      ]);
      return Object.keys(tree.children).filter(name => existing.has(name));
    },

    // ── 上传执行 ─────────────────────────────────────────
    async confirmUpload() {
      const tree = this.modal.uploadTree;
      const stats = this.modal.stats;
      this.closeModal();
      this.uploading = true;
      this.uploadCancelled = false;
      this.uploadTotal = stats.files;
      this.uploadCurrent = 0;
      this.uploadLabel = stats.folders > 0 ? '正在创建目录' : '正在上传文件';
      this.uploadingFileName = '';
      this.uploadProgress = 0;
      try {
        await this.executeUploadTree(tree, this.currentFolderID);
      } finally {
        this.uploading = false;
        this.uploadLabel = '正在上传';
        this.uploadingFileName = '';
        this.uploadProgress = 0;
        this.uploadController = null;
        this.uploadCancelled = false;
        this.uploadTotal = 0;
        this.uploadCurrent = 0;
        await this.queryFolder(this.currentFolderID);
      }
    },

    async executeUploadTree(node, parentFolderID) {
      const sorted = Object.values(node.children).sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const child of sorted) {
        if (this.uploadCancelled) return;
        if (child.isFolder) {
          try {
            this.uploadingFileName = child.name;
            const url = `${import.meta.env.VITE_API_BASE_URL}/api/createFolder`;
            const response = await axio.post(url, { folderName: child.name, parentFolderID });
            await this.executeUploadTree(child, response.data.id);
          } catch (error) {
            console.error('创建文件夹失败:', error);
          }
        } else {
          this.uploadLabel = '正在上传文件';
          this.uploadCurrent++;
          this.uploadingFileName = `${child.name} (${this.uploadCurrent}/${this.uploadTotal})`;
          this.uploadProgress = 0;
          this.uploadController = new AbortController();
          try {
            const formData = new FormData();
            formData.append('file', child.file);
            formData.append('parentFolderID', parentFolderID);
            formData.append('fileSize', child.file.size);
            await this.uploadFileAPI(formData, this.uploadController.signal);
          } catch (error) {
            if (axio.isCancel(error) || error.code === 'ERR_CANCELED') {
              this.uploadCancelled = true;
              return;
            }
            console.error('上传文件失败:', error);
          } finally {
            this.uploadController = null;
          }
        }
      }
    },

    // 单文件独立上传（Ctrl+V 文本、历史代码路径）
    async uploadSingleFile(file, parentFolderID = this.currentFolderID) {
      this.uploading = true;
      this.uploadProgress = 0;
      this.uploadLabel = '正在上传';
      this.uploadingFileName = file.name;
      this.uploadController = new AbortController();
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentFolderID', parentFolderID);
        formData.append('fileSize', file.size);
        const response = await this.uploadFileAPI(formData, this.uploadController.signal);
        if (parentFolderID === this.currentFolderID) {
          this.files.push(response.data);
          this.sortFoldersAndFiles();
        }
        return false;
      } catch (error) {
        if (axio.isCancel(error) || error.code === 'ERR_CANCELED') return true;
        console.error('上传文件失败:', error);
        return false;
      } finally {
        this.uploading = false;
        this.uploadProgress = 0;
        this.uploadingFileName = '';
        this.uploadController = null;
      }
    },

    async uploadFileAPI(formData, signal) {
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/uploadFile`;
      const response = await axio.post(url, formData, {
        signal,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: progressEvent => {
          this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        },
      });
      return response;
    },

    cancelUpload() {
      this.uploadController?.abort();
      this.uploadCancelled = true;
    },

    // ── 粘贴公共逻辑 ─────────────────────────────────────
    hasFolder(dataTransferItems) {
      for (const item of dataTransferItems) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry?.isDirectory) return true;
        }
      }
      return false;
    },

    // ── 粘贴文本按钮（移动端无法触发 Ctrl+V 的替代入口，仅支持文本）──
    async handlePasteButton() {
      if (!navigator.clipboard?.readText) {
        this.modal = { ...this.modal, visible: true, type: 'error' };
        return;
      }
      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          this.processPasteText(text);
        } else {
          this.modal = { ...this.modal, visible: true, type: 'error' };
        }
      } catch (e) {
        this.modal = { ...this.modal, visible: true, type: 'error' };
      }
    },

    // ── Ctrl+V 粘贴 ───────────────────────────────────────
    async handlePasteEvent(event) {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const items = event.clipboardData?.items;
      if (items && this.hasFolder(items)) {
        event.preventDefault();
        this.modal = { ...this.modal, visible: true, type: 'folder-paste-warning' };
        return;
      }

      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        event.preventDefault();
        this.prepareUploadPreview(Array.from(files));
        return;
      }
      const text = (event.clipboardData?.getData('text/plain') || '').trim();
      if (text) {
        event.preventDefault();
        this.processPasteText(text);
        return;
      }
      this.modal = { ...this.modal, visible: true, type: 'error' };
    },

    processPasteText(trimmed) {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const lines = trimmed.split('\n');
      const preview = lines.length > 8 ? lines.slice(0, 8).join('\n') + '\n...' : trimmed;
      this.modal = {
        visible: true, type: 'text',
        filename: `${ts}.txt`, content: trimmed, preview,
        uploadTree: null, flatList: [], stats: { folders: 0, files: 0 }, conflicts: [],
      };
    },

    async confirmTextUpload() {
      const filename = this.modal.filename.trim() || 'paste.txt';
      const blob = new Blob([this.modal.content], { type: 'text/plain' });
      const file = new File([blob], filename, { type: 'text/plain' });
      this.closeModal();
      await this.uploadSingleFile(file);
    },

    closeModal() {
      this.modal.visible = false;
    },

    // ── 命名操作 ──────────────────────────────────────────
    async updateName(item, newName, isFolder) {
      try {
        const url = isFolder
          ? `${import.meta.env.VITE_API_BASE_URL}/api/renameFolder`
          : `${import.meta.env.VITE_API_BASE_URL}/api/renameFile`;
        const postData = isFolder
          ? { folderID: item.id, folderName: newName }
          : { fileID: item.id, fileName: newName };
        await axio.post(url, postData);
        item.name = newName;
        this.sortFoldersAndFiles();
      } catch (error) {
        console.error(error);
      }
    },

    async handleCreateFolder(tempFolder, name) {
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL}/api/createFolder`;
        const response = await axio.post(url, { folderName: name, parentFolderID: tempFolder.parentFolderId });
        this.$refs.fileList.cancelEdit(tempFolder);
        this.folders.push(response.data);
        this.sortFoldersAndFiles();
      } catch (error) {
        console.log('创建文件夹失败，请重试');
        this.$refs.fileList.cancelEdit(tempFolder);
      }
    },

    handleAddTempFolder(tempFolder) { this.folders.push(tempFolder); },
    handleRemoveTempFolder(tempFolder) {
      this.folders = this.folders.filter(f => f !== tempFolder);
    },

    async handleDeleteFile(file) {
      try {
        await axio.post(`${import.meta.env.VITE_API_BASE_URL}/api/deleteFile`, { fileID: file.id });
        this.files = this.files.filter(f => f !== file);
      } catch (error) {
        console.error(error);
      }
    },

    async handleDeleteFolder(folder) {
      try {
        await axio.post(`${import.meta.env.VITE_API_BASE_URL}/api/deleteFolder`, { folderID: folder.id });
        this.folders = this.folders.filter(f => f !== folder);
      } catch (error) {
        console.error(error);
      }
    },

    handleDownloadFolder(folder) {
      const link = document.createElement('a');
      link.href = `${import.meta.env.VITE_API_BASE_URL}/api/downloadFolder?folderID=${folder.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    },

    handleDownloadFile(file) {
      const link = document.createElement('a');
      link.href = `${import.meta.env.VITE_API_BASE_URL}/api/downloadFile?fileID=${file.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
  },
  mounted() {
    document.addEventListener('paste', this.handlePasteEvent);
    document.addEventListener('click', this.handleClickOutsideUploadMenu);
  },
  unmounted() {
    document.removeEventListener('paste', this.handlePasteEvent);
    document.removeEventListener('click', this.handleClickOutsideUploadMenu);
  },
  created() {
    this.queryFolder(this.currentFolderID);
  },
};
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  width: 100%;
}

.nav-button {
  margin: 0 5px;
}

.path-input {
  flex-grow: 1;
  margin: 0 10px;
  min-width: 0;
}

.nav-right {
  display: flex;
  align-items: center;
}

.upload-dropdown {
  position: relative;
  display: inline-block;
  margin: 0 5px;
}

.upload-dropdown .nav-button {
  margin: 0;
}

.upload-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 110px;
  overflow: hidden;
}

.upload-menu button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.9em;
  white-space: nowrap;
}

.upload-menu button:hover {
  background: #f0f7ff;
}

.paste-hint {
  margin: 6px 0 0;
  font-size: 0.78em;
  color: #aaa;
}

/* 上传面板 */
.upload-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-top: 6px;
  background: #f0f7ff;
  border: 1px solid #b3d4f5;
  border-radius: 6px;
}

.upload-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex-shrink: 1;
}

.upload-label {
  font-size: 0.75em;
  color: #666;
}

.upload-filename {
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.upload-progress-wrap {
  flex: 1;
  height: 6px;
  background: #d0e6f7;
  border-radius: 3px;
  overflow: hidden;
}

.upload-progress-bar {
  height: 100%;
  background: #3a9bd5;
  border-radius: 3px;
  transition: width 0.2s;
}

.upload-percent {
  font-size: 0.85em;
  color: #333;
  min-width: 36px;
  text-align: right;
}

.cancel-upload-btn {
  padding: 2px 10px;
  font-size: 0.85em;
  color: #d9534f;
  border: 1px solid #d9534f;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.cancel-upload-btn:hover { background: #fdf0f0; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-box {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-box.large {
  width: 560px;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-label {
  font-size: 0.78em;
  color: #666;
}

.modal-title-input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 0.95em;
}

.modal-title-input:focus {
  outline: none;
  border-color: #3a9bd5;
}

.modal-preview {
  margin: 0;
  padding: 8px 10px;
  background: #f7f7f7;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.85em;
  line-height: 1.5;
  max-height: 180px;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-all;
}

.modal-msg {
  margin: 0;
  font-size: 0.95em;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-btn {
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
  font-size: 0.9em;
}

.modal-btn.primary {
  background: #3a9bd5;
  border-color: #3a9bd5;
  color: #fff;
}

.modal-btn.primary:hover { background: #2f87bf; }
.modal-btn.primary:disabled {
  background: #a0c8e8;
  border-color: #a0c8e8;
  cursor: not-allowed;
}

/* 上传预览 */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.preview-stats {
  font-size: 0.82em;
  color: #666;
}

.conflict-warning {
  padding: 8px 12px;
  background: #fff8e1;
  border: 1px solid #f5c842;
  border-radius: 4px;
  font-size: 0.85em;
  color: #7a5a00;
}

.conflict-list {
  margin: 4px 0 0;
  padding-left: 18px;
}

.conflict-list li { padding: 1px 0; }

.tree-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  max-height: 280px;
  overflow-y: auto;
  background: #fafafa;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 3px;
  padding-bottom: 3px;
  padding-right: 8px;
  font-size: 0.88em;
  line-height: 1.4;
}

.tree-item:not(:last-child) {
  border-bottom: 1px solid #f0f0f0;
}

.tree-icon { flex-shrink: 0; font-size: 0.9em; }

.tree-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.conflict-name { color: #c0392b; font-weight: 500; }
</style>
