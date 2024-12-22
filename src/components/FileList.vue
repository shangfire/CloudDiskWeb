<template>
  <ul class="items-list">
    <!-- 文件夹列表 -->
    <li v-for="folder in folders" :key="folder.path" class="item folder-item">
      <span @dblclick="editItem(folder, true)">
        <img 
          src="@/assets/folder.png" 
          alt="Folder Icon" 
          class="icon"
        />
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
      <div class="actions">
        <button @click="enterFolder(folder)" class="action-button">进入</button>
        <button @click="deleteFolder(folder)" class="action-button">删除</button>
      </div>
    </li>
    <!-- 文件列表 -->
    <li v-for="file in files" :key="file.path" class="item file-item">
      <span @dblclick="editItem(file, false)">
        <img 
          src="@/assets/file.png" 
          alt="File Icon" 
          class="icon"
        />
        <template v-if="!isEditing(file)">{{ file.name }}</template>
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
      <div class="actions">
        <button @click="downloadFile(file)" class="action-button">下载</button>
        <button @click="deleteFile(file)" class="action-button">删除</button>
      </div>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'FileList',
  props: ['folders', 'files', 'currentPath', 'currentFolderID'],
  data() {
    return {
      editingItem: null,
      newName: '', // 当前编辑项的新名称
      isEditingFolder: false, // 是否正在编辑文件夹
    };
  },
  methods: {
    editItem(item, isFolder) {
      if (this.editingItem) return; // 如果已经在编辑其他项，则不执行

      this.editingItem = item;
      this.newName = item.name; // 开始编辑时保存原始值到newName
      this.isEditingFolder = isFolder;

      this.$nextTick(() => {
        if (this.$refs.editInput && this.$refs.editInput.length > 0) {
          this.$refs.editInput[0].focus();
        }
      });
    },
    isEditing(item) {
      return this.editingItem === item; // ===比较的是引用而不是数据，确保是同一个对象
    },
    finishEdit(item) {
      if (!this.isEditing(item)) return;

      const originalName = item.name;
      const newName = this.newName.trim();

      // 检查名称是否为空或重复
      if (!newName || this.folders.some(folder => folder !== item && folder.name === newName)) {
        console.log('文件夹名称无效或已存在');
        this.cancelEdit(item);
        return;
      }

      // 如果是新文件夹，则发送创建请求
      if (item.id === -1) { // 检查是否为临时 ID
        this.createFolderRequest(item, newName);
      } else {
        // 否则更新现有文件夹名称
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
        this.newName = ''; // 清除临时状态
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
      const newFolderName = 'New Folder'; // 默认名称

      // 创建临时新文件夹对象
      const newFolder = {
        path: `${this.currentPath}/${newFolderName}`,
        name: newFolderName,
        id: -1,
        parentFolderId: this.currentFolderID,
      };

      // prop中的属性是只读的，不能直接修改，需要通知父组件进行修改
      this.$emit('add-temp-folder', newFolder); // 通知父组件添加新文件夹

      // 设置当前编辑项和编辑模式
      this.editingItem = newFolder;
      this.newName = newFolder.name;
      this.isEditingFolder = true;

      // 立即聚焦输入框
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
    }
  }
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
}

.icon {
  width: 16px; /* 设置适当的宽度 */
  height: 16px; /* 设置适当的高度 */
  margin-right: 8px; /* 图标与文本之间的间距 */
}

.action-button {
  margin-left: auto;
}
</style>