/**
 * 禅道API核心模块
 * 封装所有禅道相关的API调用和通用逻辑
 */

import axios from "axios";
import config from "../config.js";

/**
 * Token缓存管理
 */
class TokenCache {
  constructor() {
    this.cachedToken = null;
    this.lastFetchTime = 0;
    this.cacheDuration = config.cacheDuration;
  }

  isValid() {
    return this.cachedToken &&
           Date.now() - this.lastFetchTime < this.cacheDuration;
  }

  get() {
    return this.cachedToken;
  }

  set(token) {
    this.cachedToken = token;
    this.lastFetchTime = Date.now();
  }

  clear() {
    this.cachedToken = null;
    this.lastFetchTime = 0;
  }
}

const tokenCache = new TokenCache();

/**
 * 创建带重试机制的API请求包装器
 */
async function createApiRequest(method, url, options = {}) {
  const makeRequest = async () => {
    const token = await getZentaoToken();
    const requestOptions = {
      method,
      url,
      headers: {
        Token: token,
        Accept: "application/json",
        ...options.headers,
      },
      ...options,
    };

    return axios(requestOptions);
  };

  try {
    return await makeRequest();
  } catch (error) {
    // 如果是token过期相关的错误，清除缓存并重试
    if (error.response &&
        (error.response.status === 401 || error.response.status === 403)) {
      tokenCache.clear();

      try {
        return await makeRequest();
      } catch (retryError) {
        console.error(`重新获取数据失败:`, retryError.message);
        throw retryError;
      }
    }
    console.error(`API请求失败 [${method} ${url}]:`, error.message);
    throw error;
  }
}

/**
 * 获取禅道认证token
 */
async function getZentaoToken() {
  // 如果有缓存且未过期，则直接返回缓存内容
  if (tokenCache.isValid()) {
    return tokenCache.get();
  }

  try {
    const authUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/tokens`;
    const response = await axios.post(
      authUrl,
      {
        account: config.zentao.username,
        password: config.zentao.password,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (response.data && response.data.token) {
      tokenCache.set(response.data.token);
      return response.data.token;
    } else {
      throw new Error("无法获取认证token: 响应数据为空或不包含token字段");
    }
  } catch (error) {
    console.error("获取禅道认证token失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * 获取用户个人信息
 */
async function getZentaoUserProfile() {
  const userUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/user`;
  const response = await createApiRequest("GET", userUrl);
  return response.data;
}

/**
 * 获取产品列表
 */
async function getZentaoProducts() {
  const productsUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/products`;
  const response = await createApiRequest("GET", productsUrl);
  return response.data;
}

/**
 * 根据产品ID获取产品Bug列表
 */
async function getBugsByProductId(productId, queryParams = {}) {
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

  const response = await createApiRequest("GET", bugsUrl);
  return response.data;
}

/**
 * 获取Bug详情
 */
async function getBugDetails(bugId) {
  const bugUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/bugs/${bugId}`;
  const response = await createApiRequest("GET", bugUrl);
  return response.data;
}

/**
 * 获取禅道Bug列表
 */
async function getZentaoBugs(queryParams = {}) {
  let bugsUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/bugs`;

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

  const response = await createApiRequest("GET", bugsUrl);
  return response.data;
}

/**
 * 解决Bug
 */
async function resolveBug(bugId, resolutionData) {
  const resolveUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/bugs/${bugId}/resolve`;

  const response = await createApiRequest("POST", resolveUrl, {
    data: resolutionData,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

export {
  getZentaoToken,
  getZentaoUserProfile,
  getZentaoProducts,
  getBugsByProductId,
  getBugDetails,
  getZentaoBugs,
  resolveBug,
};
