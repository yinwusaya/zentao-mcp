const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const axios = require('axios');
const config = require('./config');

// 创建一个模拟的MCP服务器实例来测试工具
const server = new McpServer(
  {
    name: "ZenTao Bug Resolver Test",
    version: "1.0.0",
  }
);

// 从mcp-server.js复制相关函数
async function getZentaoToken() {
  try {
    const authUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/tokens`;
    const response = await axios.post(authUrl, {
      account: config.zentao.username,
      password: config.zentao.password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.token) {
      return response.data.token;
    } else {
      throw new Error('无法获取认证token');
    }
  } catch (error) {
    console.error('获取禅道认证token失败:', error.message);
    throw error;
  }
}

async function resolveBug(token, bugId, resolutionData) {
  try {
    const resolveUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/bugs/${bugId}/resolve`;

    const response = await axios.put(
      resolveUrl,
      resolutionData,
      {
        headers: {
          "Content-Type": "application/json",
          Token: token,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("解决Bug失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 测试函数
async function testResolveBug() {
  console.log('测试解决Bug功能...');
  
  try {
    // 获取token
    console.log('正在获取认证token...');
    const token = await getZentaoToken();
    console.log('成功获取token');
    
    // 调用解决bug函数，这里使用示例数据
    console.log('正在解决Bug ID为1的Bug...');
    const resolutionData = {
      "resolution": "fixed",
      "comment": "通过测试解决Bug"
    };
    
    const result = await resolveBug(token, 1116, resolutionData);
    
    console.log('调用成功，结果:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('调用出错:', error.message);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
  }
}

// 执行测试
testResolveBug().catch(console.error);