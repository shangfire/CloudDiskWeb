<!--
 * @Author: shanghanjin
 * @Date: 2024-09-18 10:11:05
 * @LastEditTime: 2024-12-22 17:59:35
 * @FilePath: \CloudDiskWeb\src\App.vue
 * @Description: 
-->
<template>
  <div id="app">
    <nav class="navbar">
      <button @click="goToParent" class="nav-button">返回</button>
      <input type="text" disabled :value="currentPath" class="path-input" />
      <div class="nav-right">
        <button @click="newFolder" class="nav-button">新建文件夹</button>
        <button @click="uploadFile" class="nav-button">上传文件</button>
      </div>
    </nav>
    <file-list 
      :folders="folders" 
      :files="files" 
      :currentPath="currentPath" 
      :currentFolderID="currentFolderID"
      :parentFolderID="parentFolderID"
      @delete-file="handleDeleteFile"
      @enter-folder="handleEnterFolder"
      @update-name="updateName"
      @add-temp-folder="handleAddTempFolder"
      @remove-temp-folder="handleRemoveTempFolder"
      @create-folder="handleCreateFolder"
      ref="fileList"
    ></file-list>
  </div>
</template>

<script>
import FileList from './components/FileList.vue';
import axio from 'axios';

export default {
  name: 'App',
  components: {
    FileList
  },
  data() {
    return {
      currentPath: '/',
      currentFolderID: 1,
      parentFolderID: 0,
      folders: [],
      files: []
    };
  },
  methods: {
    async queryFolder() {
      try {
        const url = `${process.env.VUE_APP_API_BASE_URL}/api/queryFolder`;
        // 确保currentFolderId有效，如果无效undefined时，axio会自动消除该字段
        const response = await axio.post(url, { folderID: this.currentFolderID });
        const { folders, files } = response.data;
        
        this.folders = folders;
        this.files = files;
      } catch (error) {
        console.error(error);
      }
    },
    async updateName(item, newName, isFolder) {
      // 实现更新文件或文件夹名称的逻辑
      try {
        const url = isFolder ? `${process.env.VUE_APP_API_BASE_URL}/api/renameFolder` : `${process.env.VUE_APP_API_BASE_URL}/api/renameFile`;
        const postData = isFolder ? { folderID: item.id, folderName: newName } : { fileID: item.id, fileName: newName };
        // 确保currentFolderId有效，如果无效undefined时，axio会自动消除该字段
        await axio.post(url, postData);

        item.name = newName;
      } catch (error) {
        console.error(error);
      }
    },
    goToParent() {
      // 实现返回上一级目录的逻辑
    },
    newFolder() {
      // 实现新建文件夹的逻辑
      this.$refs.fileList.createFolder();
    },
    uploadFile() {
      // 实现上传文件的逻辑
    },
    async handleCreateFolder(tempFolder, name) {
      // 处理创建文件夹的逻辑
      try {
        // 发送创建文件夹的 API 请求
        const url = `${process.env.VUE_APP_API_BASE_URL}/api/createFolder`;
        const postData = { folderName: name, parentFolderID: tempFolder.parentFolderId };
        const response = await axio.post(url, postData);

        // 替换临时文件夹为实际创建的文件夹
        this.folders = this.folders.map(folder => {
          if (folder === tempFolder) {
            return response;
          }
          return folder;
        });

        // 清除编辑状态
        this.$refs.fileList.cancelEdit();
      } catch (error) {
        this.showToast('创建文件夹失败，请重试');
        this.$refs.fileList.cancelEdit(); // 取消编辑并移除临时文件夹
      }
    },
    handleAddTempFolder(tempFolder){
      // 处理添加临时文件夹的逻辑
      this.folders.push(tempFolder)
    },
    handleRemoveTempFolder(tempFolder){
      // 处理移除临时文件夹的逻辑
      this.folders = this.folders.filter(folder => folder !== tempFolder)
    },
    handleDeleteFile() {
      // 处理删除文件的逻辑
    },
    handleEnterFolder(folder) {
      // 处理进入文件夹的逻辑
      this.currentPath = folder.path;
      this.currentFolderID = folder.id;
      this.parentFolderID = folder.parentFolderId;
      // 更新文件列表
    }
  },
  created() {
    // 页面加载时查询根目录的文件列表
    this.queryFolder();
  }
};
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  width: 100%; /* 确保navbar占据整个宽度 */
}

.nav-button {
  margin: 0 5px; /* 给按钮添加一些间距 */
}

.path-input {
  flex-grow: 1; /* 输入框将填充所有剩余空间 */
  margin: 0 10px; /* 可选：给输入框添加一些间距 */
  min-width: 0; /* 防止输入框在极小屏幕下出现溢出问题 */
}

.nav-right {
  display: flex;
  align-items: center;
}
</style>