<!--
 * @Author: shanghanjin
 * @Date: 2024-09-18 10:11:05
 * @LastEditTime: 2024-11-15 15:54:44
 * @FilePath: \CloudDiskWeb\src\App.vue
 * @Description: 
-->
<template>
  <div id="app">
    <nav>
      <button @click="goToParent">返回</button>
      <input type="text" disabled :value="currentPath" />
      <button @click="newFolder">新建文件夹</button>
      <button @click="uploadFile">上传文件</button>
    </nav>
    <file-list :files="files" :current-path="currentPath" @delete-file="handleDeleteFile" @enter-folder="handleEnterFolder"></file-list>
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
        const response = await axio.post(url, { folderID: this.currentFolderId });
        const { folders, files } = response.data;
        
        this.folders = folders;
        this.files = files;
      } catch (error) {
        console.error(error);
      }
    },
    goToParent() {
      // 实现返回上一级目录的逻辑
    },
    newFolder() {
      // 实现新建文件夹的逻辑
    },
    uploadFile() {
      // 实现上传文件的逻辑
    },
    handleDeleteFile() {
      // 处理删除文件的逻辑
    },
    handleEnterFolder(newPath) {
      // 处理进入文件夹的逻辑
      this.currentPath = newPath;
      // 更新文件列表
    }
  },
  created() {
    // 页面加载时查询根目录的文件列表
    this.queryFolder();
  }
};
</script>