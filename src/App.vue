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
        <button @click="triggerFileInput" class="nav-button">上传文件</button>
        <!-- 隐藏的文件输入控件 -->
        <input 
          type="file" 
          ref="fileInput" 
          multiple 
          @change="uploadFiles"
          style="display: none;"
        />
      </div>
    </nav>
    <!-- 进度条 -->
    <progress v-if="uploading" :value="uploadProgress" max="100" class="upload-progress">{{ uploadProgress }}%</progress>
    <file-list
      :folders="folders"
      :files="files"
      :currentPath="currentPath"
      :currentFolderID="currentFolderID"
      :parentFolderID="parentFolderID"
      @delete-file="handleDeleteFile"
      @delete-folder="handleDeleteFolder"
      @enter-folder="handleEnterFolder"
      @update-name="updateName"
      @add-temp-folder="handleAddTempFolder"
      @remove-temp-folder="handleRemoveTempFolder"
      @create-folder="handleCreateFolder"
      @download-file="handleDownloadFile"
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
    // 组件名是PascalCase，在template中建议使用kebab-case，能对得上
    FileList
  },
  data() {
    return {
      currentPath: '/',
      currentFolderID: 1,
      parentFolderID: 0,
      folders: [],
      files: [],
      uploading: false,
      uploadProgress: 0
    };
  },
  methods: {
    async queryFolder(folderID) {
      try {
        const url = `${process.env.VUE_APP_API_BASE_URL}/api/queryFolder`;
        // 确保currentFolderId有效，如果无效undefined时，axio会自动消除该字段
        const response = await axio.post(url, { folderID: folderID });
        const { folders, files } = response.data;
        
        this.currentPath = response.data.self.path;
        this.parentFolderID = response.data.self.parentFolderId;
        this.currentFolderID = response.data.self.id;
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
      if (this.parentFolderID === 0) {
        return;
      }

      this.queryFolder(this.parentFolderID);
    },
    newFolder() {
      // 实现新建文件夹的逻辑
      this.$refs.fileList.createFolder();
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    async uploadFiles(event) {
      const files = event.target.files;

      for (let file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('parentFolderID', this.currentFolderID);
          formData.append('fileSize', file.size);

          // 开始上传时设置标志和进度
          this.uploading = true;
          this.uploadProgress = 0;

          // 发送上传文件的 API 请求
          const response = await this.uploadFileAPI(formData);

          this.files.push(response.data);
        } catch (error) {
          console.error('上传文件失败:', error);
        } finally {
          // 上传完成后重置标志和进度
          this.uploading = false;
          this.uploadProgress = 0;
        }
      }

      // 清空文件输入框
      event.target.value = '';
    },
    async uploadFileAPI(formData) {
      try {
        const url = `${process.env.VUE_APP_API_BASE_URL}/api/uploadFile`;
        const config = {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: progressEvent => {
            // 计算上传进度
            this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          },
        };

        const response = await axio.post(url, formData, config);

        return response;
      } catch (error) {
        console.error('上传文件失败:', error);
      }
    },
    async handleCreateFolder(tempFolder, name) {
      // 处理创建文件夹的逻辑
      try {
        // 发送创建文件夹的 API 请求
        const url = `${process.env.VUE_APP_API_BASE_URL}/api/createFolder`;
        const postData = { folderName: name, parentFolderID: tempFolder.parentFolderId };
        const response = await axio.post(url, postData);

        // 清除编辑状态
        this.$refs.fileList.cancelEdit(tempFolder);
        
        // 更新文件夹列表
        this.folders.push(response.data);
      } catch (error) {
        console.log('创建文件夹失败，请重试');
        this.$refs.fileList.cancelEdit(tempFolder); // 取消编辑并移除临时文件夹
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
    async handleDeleteFile(file) {
      // 处理删除文件的逻辑
      try {
        const url = `${process.env.VUE_APP_API_BASE_URL}/api/deleteFile`;
        const postData = { fileID: file.id };
        await axio.post(url, postData);

        this.files = this.files.filter(item => item !== file);
      }
      catch (error) {
        console.error(error);
      }
    },
    async handleDeleteFolder(folder) {
      // 处理删除文件夹的逻辑
      try {
        const url = `${process.env.VUE_APP_API_BASE_URL}/api/deleteFolder`;
        const postData = { folderID: folder.id };
        await axio.post(url, postData);

        this.folders = this.folders.filter(item => item !== folder);
      }
      catch (error) {
        console.error(error);
      }
    },
    handleEnterFolder(folder) {
      // 处理进入文件夹的逻辑
      this.queryFolder(folder.id);
    },
    async handleDownloadFile(file) {
      try {
        const response = await axio({
          url: `${process.env.VUE_APP_API_BASE_URL}/api/downloadFile`,
          method: 'POST', // 使用 POST 方法
          data: { fileId: file.id }, // 发送文件 ID 作为请求体数据
          responseType: 'blob', // 指定响应类型为 blob
          headers: {
            'Content-Type': 'application/json' // 设置请求头
          }
        });

        // 从响应头部获取文件名
        const contentDisposition = response.headers['Content-Disposition'];
        let filename = 'download';
        if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
          filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }

        // 创建一个隐藏的 <a> 元素用于触发下载
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename); // 设置下载文件名

        // 将 <a> 元素添加到 DOM 中
        document.body.appendChild(link);
        link.click();

        // 下载完成后移除 <a> 元素
        link.remove();
        window.URL.revokeObjectURL(url); // 释放对象 URL
      } catch (error) {
        console.error('下载文件失败:', error);
      }
    }
  },
  created() {
    // 页面加载时查询根目录的文件列表
    this.queryFolder(this.currentFolderID);
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

.file-input {
  /* 根据需要调整样式 */
  margin-left: 8px;
}

.upload-progress {
  width: 100%;
  margin-top: 8px; /* 与导航栏之间留出一点空间 */
  height: 5px; /* 设置高度 */
  background-color: #f3f3f3; /* 设置背景颜色 */
}
</style>