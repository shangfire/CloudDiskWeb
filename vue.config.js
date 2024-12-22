/*
 * @Author: shanghanjin
 * @Date: 2024-09-18 10:11:05
 * @LastEditTime: 2024-11-15 16:17:43
 * @FilePath: \CloudDiskWeb\vue.config.js
 * @Description: 
 */
const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  configureWebpack: {
    devtool: 'source-map'
  },
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: { '^/api': '' }
      }
    }
  }
})
