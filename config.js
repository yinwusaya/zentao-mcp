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
  
  // 缓存时间（毫秒）
  cacheDuration: process.env.CACHE_DURATION || 5 * 60 * 1000, // 默认5分钟
};