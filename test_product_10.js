const axios = require('axios');
const config = require('./config');

// 获取禅道认证token
async function getZentaoToken() {
  try {
    const authUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/tokens`;
    const response = await axios.post(authUrl, {
      account: config.zentao.username,
      password: config.zentao.password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
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

// 根据产品ID获取产品Bug列表
async function getBugsByProductId(token, productId, queryParams = {}) {
  try {
    let bugsUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/products/${productId}/bugs`;

    // 添加查询参数
    const params = new URLSearchParams();
    Object.keys(queryParams).forEach((key) => {
      if (queryParams[key] !== undefined) {
        params.append(key, queryParams[key]);
      }
    });

    if (params.toString()) {
      bugsUrl += `?${params.toString()}`;
    }

    const response = await axios.get(bugsUrl, {
      headers: {
        Token: token,
        Accept: 'application/json'
      },
    });

    return response.data;
  } catch (error) {
    console.error("获取产品Bug列表失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 测试函数
async function testGetBugsByProductId() {
  console.log('测试获取产品Bug列表...');
  
  try {
    // 获取token
    console.log('正在获取认证token...');
    const token = await getZentaoToken();
    console.log('成功获取token');

    // 调用获取bug函数，产品ID为10
    console.log('正在获取产品ID为10的Bug列表...');
    const result = await getBugsByProductId(token, 10);
    
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
testGetBugsByProductId().catch(console.error);