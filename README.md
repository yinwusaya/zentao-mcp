# ZenTao MCP Service

一个用于查看和管理禅道系统Bug的MCP服务，能用但不好用。

纯AI生成的代码，请根据实际需求进行调整和优化。


## 功能特性

- 查看禅道系统中的Bug列表
- 支持根据产品、项目、用户等条件筛选Bug
- 解决禅道系统中的Bug
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
        "c:...\zentao-mcp\mcp-server.js"
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

### 支持的 MCP 工具

1. `get_zentao_user_profile` - 获取禅道用户个人信息
2. `get_zentao_products` - 获取禅道产品列表
3. `get_bugs_by_product_id` - 根据产品ID获取Bug列表
4. `get_bug_details` - 获取Bug详情
5. `view_zentao_bugs` - 查看禅道Bug
6. `resolve_zentao_bug` - 解决禅道Bug

#### resolve_zentao_bug 工具参数

- `bugId` (number, 必填): Bug ID
- `resolution` (string, 必填): 解决方案，可选值包括:
  - `bydesign` - 设计如此
  - `duplicate` - 重复bug
  - `external` - 外部原因
  - `fixed` - 已解决
  - `notrepro` - 无法重现
  - `postponed` - 延期处理
  - `willnotfix` - 不予解决
  - `tostory` - 转需求
- `duplicateBug` (number, 可选): 重复Bug ID，当 resolution 选择 duplicate 时使用
- `resolvedBuild` (number/string, 可选): 解决版本，传入版本的ID，或者传入 "trunk"（主干）
- `resolvedDate` (string, 可选): 解决时间
- `assignedTo` (string, 可选): 指派给
- `comment` (string, 可选): 备注

示例请求:
```json
{
  "bugId": 1,
  "resolution": "fixed",
  "comment": "问题已修复"
}
```