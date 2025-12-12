import dotenv from 'dotenv';

dotenv.config();

// 配置文件
export default {
  // 禅道系统配置
  zentao: {
    // 禅道系统URL
    url: process.env.ZENTAO_URL || 'http://localhost/zentao',

    // 默认用户名和密码
    username: process.env.ZENTAO_USERNAME || 'admin',
    password: process.env.ZENTAO_PASSWORD || 'admin',

    // API版本
    apiVersion: process.env.ZENTAO_API_VERSION || 'v1'
  },

  // 图床配置（可选，用于图片上传功能）
  imageHost: {
    // 图床基础URL（用于拼接返回的图片地址）
    url: process.env.IMAGE_BED_URL || 'https://xxx.com',

    // 上传路径和参数
    uploadPath: '/upload',
    uploadParams: {
      authCode: process.env.IMAGE_BED_AUTH || 'your-auth-code-here',
      uploadFolder: 'zentao_bug'
    }
  },

  // 缓存时间（毫秒）
  cacheDuration: process.env.CACHE_DURATION || 5 * 60 * 1000, // 默认5分钟
};