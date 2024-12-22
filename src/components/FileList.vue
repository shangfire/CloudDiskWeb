<template>  
  <ul>
    <li v-for="folder in folders" :key="folder.path">
      {{ folder.name }}
      <button @click="enterFolder(folder.path)">进入</button>
    </li>
  </ul>
  <ul>  
    <li v-for="file in files" :key="file.path">  
      {{ file.name }}  
      <button v-if="file.type === 'folder'" @click="enterFolder(file.path)">进入</button>  
      <button v-else @click="deleteFile(file.path)">删除</button>  
    </li>  
  </ul>  
</template>  
  
<script>  
export default {  
  name: 'FileList',  
  props: ['folders', 'files', 'currentPath'],  
  methods: {  
    enterFolder(path) {  
      this.$emit('enter-folder', path);  
    },  
    deleteFile(filePath) {  
      this.$emit('delete-file', filePath);  
    }  
  }  
};  
</script>