<!--
 * @Author: shanghanjin
 * @Date: 2024-12-24 10:19:51
 * @LastEditTime: 2026-05-30 20:02:27
 * @FilePath: \CloudDiskWeb\src\components\FileList.vue
 * @Description:
-->
<template>
  <div @click="hideContextMenu" :class="{ 'list-disabled': disabled }">
    <ul class="items-list">
      <!-- 文件夹列表 -->
      <li
        v-for="folder in folders"
        :key="folder.path"
        class="item folder-item"
        :class="{ selected: selectedItems.has(folder) }"
        @click="selectItem(folder, $event)"
        @dblclick="enterFolder(folder)"
        @contextmenu.prevent="showContextMenu(folder, true, $event)"
      >
        <span>
          <img src="@/assets/folder.png" alt="Folder Icon" class="icon" />
          <!-- ref是动态绑定的，只有条件成立时，ref才会被绑定，所以ref永远对应着那个正在被编辑的编辑框 -->
          <template v-if="!isEditing(folder)">{{ folder.name }}</template>
          <input
            v-else
            type="text"
            v-model="newName"
            ref="editInput"
            @blur="cancelEdit(folder)"
            @keyup.enter="finishEdit(folder)"
            @keyup.esc="cancelEdit(folder)"
          />
        </span>
        <div class="actions" @dblclick.stop>
          <button @click.stop="enterFolder(folder)" class="action-button">进入</button>
          <button @click.stop="downloadFolder(folder)" class="action-button">下载</button>
          <button @click.stop="deleteFolder(folder)" class="action-button">删除</button>
        </div>
      </li>
      <!-- 文件列表 -->
      <li
        v-for="file in files"
        :key="file.path"
        class="item file-item"
        :class="{ selected: selectedItems.has(file) }"
        @click="selectItem(file, $event)"
        @contextmenu.prevent="showContextMenu(file, false, $event)"
      >
        <span>
          <img src="@/assets/file.png" alt="File Icon" class="icon" />
          <template v-if="!isEditing(file)">
            <span class="file-name">{{ file.name }}</span>
          </template>
          <input
            v-else
            type="text"
            v-model="newName"
            ref="editInput"
            @blur="cancelEdit(file)"
            @keyup.enter="finishEdit(file)"
            @keyup.esc="cancelEdit(file)"
          />
        </span>
        <span class="file-size" v-if="!isEditing(file)">({{ formatFileSize(file.size) }})</span>
        <div class="actions">
          <button @click.stop="downloadFile(file)" class="action-button">下载</button>
          <button @click.stop="deleteFile(file)" class="action-button">删除</button>
        </div>
      </li>
    </ul>

    <!-- 右键菜单 -->
    <ul
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <template v-if="selectedItems.size > 1">
        <li class="danger" @click="ctxDeleteSelected">删除 ({{ selectedItems.size }})</li>
      </template>
      <template v-else-if="contextMenu.isFolder">
        <li @click="ctxEnterFolder">进入</li>
        <li @click="ctxDownloadFolder">下载</li>
        <li @click="ctxRename">重命名</li>
        <li class="danger" @click="ctxDeleteFolder">删除</li>
      </template>
      <template v-else>
        <li @click="ctxDownload">下载</li>
        <li @click="ctxRename">重命名</li>
        <li class="danger" @click="ctxDeleteFile">删除</li>
      </template>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'FileList',
  props: ['folders', 'files', 'currentPath', 'currentFolderID', 'disabled'],
  data() {
    return {
      editingItem: null,
      newName: '',
      isEditingFolder: false,
      selectedItems: new Set(),
      lastSelected: null,
      contextMenu: {
        visible: false,
        x: 0,
        y: 0,
        item: null,
        isFolder: false,
      },
    };
  },
  watch: {
    folders() { this.selectedItems = new Set(); this.lastSelected = null; },
  },
  mounted() {
    document.addEventListener('keydown', this.onKeyDown);
  },
  unmounted() {
    document.removeEventListener('keydown', this.onKeyDown);
  },
  methods: {
    // 选中逻辑
    selectItem(item, event) {
      const allItems = [...this.folders, ...this.files];
      if (event.shiftKey && this.lastSelected) {
        const a = allItems.indexOf(this.lastSelected);
        const b = allItems.indexOf(item);
        const [start, end] = a < b ? [a, b] : [b, a];
        this.selectedItems = new Set(allItems.slice(start, end + 1));
      } else if (event.ctrlKey || event.metaKey) {
        const next = new Set(this.selectedItems);
        next.has(item) ? next.delete(item) : next.add(item);
        this.selectedItems = next;
        this.lastSelected = item;
      } else {
        this.selectedItems = this.selectedItems.size === 1 && this.selectedItems.has(item)
          ? new Set()
          : new Set([item]);
        this.lastSelected = item;
      }
    },

    // 右键菜单
    showContextMenu(item, isFolder, event) {
      // 右键时若当前项未被选中，则单独选中它
      if (!this.selectedItems.has(item)) {
        this.selectedItems = new Set([item]);
        this.lastSelected = item;
      }
      this.contextMenu = { visible: true, x: event.clientX, y: event.clientY, item, isFolder };
    },
    hideContextMenu() {
      this.contextMenu.visible = false;
    },
    onKeyDown(e) {
      if (e.key === 'Escape') this.hideContextMenu();
    },

    // 右键菜单操作
    ctxEnterFolder() {
      this.enterFolder(this.contextMenu.item);
      this.hideContextMenu();
    },
    ctxRename() {
      this.editItem(this.contextMenu.item, this.contextMenu.isFolder);
      this.hideContextMenu();
    },
    ctxDeleteSelected() {
      this.selectedItems.forEach(item => {
        if (this.folders.includes(item)) {
          this.$emit('delete-folder', item);
        } else {
          this.$emit('delete-file', item);
        }
      });
      this.selectedItems = new Set();
      this.hideContextMenu();
    },
    ctxDeleteFile() {
      this.deleteFile(this.contextMenu.item);
      this.hideContextMenu();
    },
    ctxDeleteFolder() {
      this.deleteFolder(this.contextMenu.item);
      this.hideContextMenu();
    },
    ctxDownload() {
      this.downloadFile(this.contextMenu.item);
      this.hideContextMenu();
    },
    ctxDownloadFolder() {
      this.downloadFolder(this.contextMenu.item);
      this.hideContextMenu();
    },

    // 编辑逻辑
    editItem(item, isFolder) {
      if (this.editingItem) return;

      this.editingItem = item;
      this.newName = item.name;
      this.isEditingFolder = isFolder;

      this.$nextTick(() => {
        if (this.$refs.editInput && this.$refs.editInput.length > 0) {
          this.$refs.editInput[0].focus();
        }
      });
    },
    isEditing(item) {
      return this.editingItem === item;
    },
    finishEdit(item) {
      if (!this.isEditing(item)) return;

      const originalName = item.name;
      const newName = this.newName.trim();

      if (!newName || this.folders.some(folder => folder !== item && folder.name === newName)) {
        this.cancelEdit(item);
        return;
      }

      if (item.id === -1) {
        this.createFolderRequest(item, newName);
      } else {
        if (newName !== originalName) {
          this.updateItemName(item, newName, this.isEditingFolder);
        }
        this.cancelEdit(item);
      }
    },
    cancelEdit(item) {
      if (this.isEditing(item)) {
        if (this.editingItem.id === -1) {
          this.$emit('remove-temp-folder', this.editingItem);
        }
        this.editingItem = null;
        this.newName = '';
        this.isEditingFolder = false;
      }
    },
    updateItemName(item, newName, isFolder) {
      this.$emit('update-name', item, newName, isFolder);
    },
    createFolderRequest(item, newName) {
      this.$emit('create-folder', item, newName);
    },
    createFolder() {
      const newFolderName = 'New Folder';
      const newFolder = {
        path: `${this.currentPath}/${newFolderName}`,
        name: newFolderName,
        id: -1,
        parentFolderId: this.currentFolderID,
      };

      this.$emit('add-temp-folder', newFolder);

      this.editingItem = newFolder;
      this.newName = newFolder.name;
      this.isEditingFolder = true;

      this.$nextTick(() => {
        const inputElement = this.$refs.editInput[0];
        if (inputElement) {
          inputElement.focus();
        }
      });
    },
    enterFolder(folder) {
      this.$emit('enter-folder', folder);
    },
    deleteFile(file) {
      this.$emit('delete-file', file);
    },
    deleteFolder(folder) {
      this.$emit('delete-folder', folder);
    },
    downloadFile(file) {
      this.$emit('download-file', file);
    },
    downloadFolder(folder) {
      this.$emit('download-folder', folder);
    },
    formatFileSize(size) {
      if (size === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(size) / Math.log(k));
      return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
  },
};
</script>

<style scoped>
.items-list {
  list-style-type: none;
  padding-left: 0;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: default;
}

.item:hover {
  background-color: #f0f0f0;
}

.item.selected {
  background-color: #d0e8ff;
}

.icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.action-button {
  margin-left: auto;
}

.file-name {
  font-size: 0.9em;
  color: #333;
}

.file-size {
  font-size: 0.9em;
  color: #777;
  margin-left: auto;
}

.list-disabled {
  pointer-events: none;
  opacity: 0.5;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 1000;
  list-style: none;
  margin: 0;
  padding: 4px 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  user-select: none;
}

.context-menu li {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.9em;
}

.context-menu li:hover {
  background-color: #f0f0f0;
}

.context-menu li.danger {
  color: #d9534f;
}

.context-menu li.danger:hover {
  background-color: #fdf0f0;
}
</style>
