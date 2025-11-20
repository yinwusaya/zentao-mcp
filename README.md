# ZenTao MCP Service

一个用于查看和管理禅道系统Bug的MCP服务，能用但不好用。

纯AI生成的代码，请根据实际需求进行调整和优化。


## 功能特性

- 查看禅道系统中的Bug列表
- 支持根据产品、项目、用户等条件筛选Bug
- 提供标准 MCP 工具接口

## 安装

```bash
npm install
```

## 配置

创建 `.env` 文件或设置环境变量：

```env
# 禅道系统地址
ZENTAO_URL=http://localhost/zentao

# 登录凭据
ZENTAO_USERNAME=admin
ZENTAO_PASSWORD=admin

# API版本
ZENTAO_API_VERSION=v1

# 缓存时间（毫秒）
CACHE_DURATION=300000
```

## 使用方式

### MCP 配置
根据实际情况修改
```json
    "local-zentao": {
      "command": "node",
      "args": [
        "c:...\\zentao-mcp\\mcp-server.js"
      ],
      "env": {
        "CACHE_DURATION": "300000",
        "ZENTAO_API_VERSION": "v1",
        "ZENTAO_PASSWORD": "admin",
        "ZENTAO_URL": "https://xxx/zentao",
        "ZENTAO_USERNAME": "admin"
      }
    }
```