import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import config from "./config.js";
import * as z from "zod";
// 创建 MCP 服务器
const server = new McpServer(
  {
    name: "ZenTao Bug Viewer",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        list: true,
      },
    },
  }
);

// 缓存禅道认证token
let cachedToken = null;
let lastFetchTime = 0;
const CACHE_DURATION = config.cacheDuration;

// 获取禅道认证token
async function getZentaoToken() {
  const now = Date.now();
  // 如果有缓存且未过期，则直接返回缓存内容
  if (cachedToken && now - lastFetchTime < CACHE_DURATION) {
    return cachedToken;
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
      cachedToken = response.data.token;
      lastFetchTime = now;
      console.log("成功获取禅道认证token");
      return cachedToken;
    } else {
      throw new Error("无法获取认证token: 响应数据为空或不包含token字段");
    }
  } catch (error) {
    console.error("获取禅道认证token失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", JSON.stringify(error.response.data, null, 2));
      console.error("响应头:", JSON.stringify(error.response.headers, null, 2));
    }
    throw error;
  }
}

// 获取用户个人信息
async function getZentaoUserProfile() {
  try {
    const token = await getZentaoToken();
    const userUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/user`;

    const response = await axios.get(userUrl, {
      headers: {
        Token: token,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("获取用户个人信息失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", JSON.stringify(error.response.data, null, 2));
      console.error("响应头:", JSON.stringify(error.response.headers, null, 2));
    }

    // 如果是token过期相关的错误，清除缓存的token
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      cachedToken = null;
      // 重新尝试获取token并再次请求
      try {
        const token = await getZentaoToken();
        const userUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/user`;
        const response = await axios.get(userUrl, {
          headers: {
            Token: token,
            Accept: "application/json",
          },
        });
        return response.data;
      } catch (retryError) {
        console.error("重新获取用户信息失败:", retryError.message);
        if (retryError.response) {
          console.error("重试时响应状态:", retryError.response.status);
          console.error(
            "重试时响应数据:",
            JSON.stringify(retryError.response.data, null, 2)
          );
          console.error(
            "重试时响应头:",
            JSON.stringify(retryError.response.headers, null, 2)
          );
        }
        throw retryError;
      }
    }
    throw error;
  }
}

// 获取产品列表
async function getZentaoProducts() {
  try {
    const token = await getZentaoToken();
    const productsUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/products`;

    const response = await axios.get(productsUrl, {
      headers: {
        Token: token,
      },
    });

    return response.data;
  } catch (error) {
    // 如果是token过期相关的错误，清除缓存的token
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      cachedToken = null;
      // 重新尝试获取token并再次请求
      try {
        const token = await getZentaoToken();
        const productsUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/products`;
        const response = await axios.get(productsUrl, {
          headers: {
            Token: token,
          },
        });
        return response.data;
      } catch (retryError) {
        console.error("重新获取产品列表失败:", retryError.message);
        throw retryError;
      }
    }
    console.error("获取产品列表失败:", error.message);
    throw error;
  }
}

// 根据产品ID获取产品Bug列表
async function getBugsByProductId(productId, queryParams = {}) {
  try {
    const token = await getZentaoToken();
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
      },
    });

    return response.data;
  } catch (error) {
    // 如果是token过期相关的错误，清除缓存的token
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      cachedToken = null;
      // 重新尝试获取token并再次请求
      try {
        const token = await getZentaoToken();
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
          },
        });

        return response.data;
      } catch (retryError) {
        console.error("重新获取产品Bug列表失败:", retryError.message);
        throw retryError;
      }
    }
    console.error("获取产品Bug列表失败:", error.message);
    throw error;
  }
}

// 获取Bug详情
async function getBugDetails(bugId) {
  try {
    const token = await getZentaoToken();
    const bugUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/bugs/${bugId}`;

    const response = await axios.get(bugUrl, {
      headers: {
        Token: token,
      },
    });

    return response.data;
  } catch (error) {
    // 如果是token过期相关的错误，清除缓存的token
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      cachedToken = null;
      // 重新尝试获取token并再次请求
      try {
        const token = await getZentaoToken();
        const bugUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/bugs/${bugId}`;
        const response = await axios.get(bugUrl, {
          headers: {
            Token: token,
          },
        });
        return response.data;
      } catch (retryError) {
        console.error("重新获取Bug详情失败:", retryError.message);
        throw retryError;
      }
    }
    console.error("获取Bug详情失败:", error.message);
    throw error;
  }
}

// 获取禅道Bug列表
async function getZentaoBugs(queryParams = {}) {
  try {
    const token = await getZentaoToken();
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

    const response = await axios.get(bugsUrl, {
      headers: {
        Token: token,
      },
    });

    return response.data;
  } catch (error) {
    // 如果是token过期相关的错误，清除缓存的token
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      cachedToken = null;
      // 重新尝试获取token并再次请求
      try {
        const token = await getZentaoToken();
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

        const response = await axios.get(bugsUrl, {
          headers: {
            Token: token,
          },
        });

        return response.data;
      } catch (retryError) {
        console.error("重新获取Bug列表失败:", retryError.message);
        throw retryError;
      }
    }
    console.error("获取禅道Bug列表失败:", error.message);
    throw error;
  }
}

// 解决Bug
async function resolveBug(bugId, resolutionData) {
  try {
    const token = await getZentaoToken();
    const resolveUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/bugs/${bugId}/resolve`;

    const response = await axios.post(
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
    // 如果是token过期相关的错误，清除缓存的token
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      cachedToken = null;
      // 重新尝试获取token并再次请求
      try {
        const token = await getZentaoToken();
        const resolveUrl = `${config.zentao.url}/api.php/${config.zentao.apiVersion}/bugs/${bugId}/resolve`;

        const response = await axios.post(
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
      } catch (retryError) {
        console.error("重新解决Bug失败:", retryError.message);
        throw retryError;
      }
    }
    console.error("解决Bug失败:", error.message);
    throw error;
  }
}

// 定义MCP工具
server.registerTool(
  "get_zentao_user_profile",
  {
    title: "获取禅道用户个人信息",
    description: "获取当前登录用户的个人信息",
    inputSchema: {},
  },
  async (input) => {
    try {
      const userProfile = await getZentaoUserProfile();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                profile: userProfile.profile,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error("获取用户个人信息时出错:", JSON.stringify(config));
      return {
        content: [
          {
            type: "text",
            text: `获取用户个人信息时出错: ${JSON.stringify(config)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_zentao_products",
  {
    title: "获取禅道产品列表",
    description: "获取禅道系统中的所有产品列表",
    inputSchema: {},
  },
  async (input) => {
    try {
      const productsData = await getZentaoProducts();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: productsData.total,
                products: productsData.products.map((product) => ({
                  id: product.id,
                  name: product.name,
                  code: product.code,
                  type: product.type,
                  desc: product.desc,
                  acl: product.acl,
                  createdBy: product.createdBy,
                  createdDate: product.createdDate,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error("获取产品列表时出错:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `获取产品列表时出错: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_bugs_by_product_id",
  {
    title: "根据产品ID获取Bug列表",
    description: "根据产品ID获取该产品下的所有Bug列表",
    inputSchema: {
      productId: z.number().describe("产品ID"),
      page: z.number().optional().describe("页码"),
      limit: z.number().optional().describe("每页数量"),
    },
  },
  async (input) => {
    try {
      if (!input.productId) {
        return {
          content: [
            {
              type: "text",
              text: "错误: 必须提供产品ID",
            },
          ],
          isError: true,
        };
      }

      const bugsData = await getBugsByProductId(input.productId, {
        page: input.page,
        limit: input.limit,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                productId: input.productId,
                page: bugsData.page,
                total: bugsData.total,
                limit: bugsData.limit,
                bugs: bugsData.bugs.map((bug) => ({
                  id: bug.id,
                  title: bug.title,
                  severity: bug.severity,
                  pri: bug.pri,
                  status: bug.status,
                  openedBy: bug.openedBy,
                  openedDate: bug.openedDate,
                  assignedTo: bug.assignedTo,
                  resolvedBy: bug.resolvedBy,
                  resolvedDate: bug.resolvedDate,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error("获取产品Bug列表时出错:", error);
      return {
        content: [
          {
            type: "text",
            text: `获取产品Bug列表时出错: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get_bug_details",
  {
    title: "获取Bug详情",
    description: "根据Bug ID获取Bug的详细信息",
    inputSchema: {
      bugId: z.number().describe("Bug ID"),
    },
  },
  async (input) => {
    try {
      if (!input.bugId) {
        return {
          content: [
            {
              type: "text",
              text: "错误: 必须提供Bug ID",
            },
          ],
          isError: true,
        };
      }

      const bugDetails = await getBugDetails(input.bugId);

      // 提取关键信息
      const simplifiedBugDetails = {
        id: bugDetails.id,
        title: bugDetails.title,
        product: bugDetails.product,
        project: bugDetails.project,
        severity: bugDetails.severity,
        pri: bugDetails.pri,
        type: bugDetails.type,
        status: bugDetails.status,
        steps: bugDetails.steps,
        openedBy: bugDetails.openedBy,
        openedDate: bugDetails.openedDate,
        assignedTo: bugDetails.assignedTo,
        assignedDate: bugDetails.assignedDate,
        resolvedBy: bugDetails.resolvedBy,
        resolvedDate: bugDetails.resolvedDate,
        resolvedBuild: bugDetails.resolvedBuild,
        closedBy: bugDetails.closedBy,
        closedDate: bugDetails.closedDate,
        deadline: bugDetails.deadline,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(simplifiedBugDetails, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("获取Bug详情时出错:", error);
      return {
        content: [
          {
            type: "text",
            text: `获取Bug详情时出错: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "view_zentao_bugs",
  {
    title: "查看禅道Bug",
    description: "获取并显示禅道系统中的Bug列表",
    inputSchema: {
      productId: z.number().optional().describe("产品ID"),
      projectId: z.number().optional().describe("项目ID"),
      userId: z.number().optional().describe("用户ID"),
      status: z.string().optional().describe("Bug状态"),
      limit: z.number().optional().describe("返回数量限制"),
    },
  },
  async (input) => {
    try {
      const bugs = await getZentaoBugs(input);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query: input,
                count: bugs.data ? bugs.data.length : 0,
                bugs: bugs,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      console.error("查看禅道Bug时出错:", error);
      return {
        content: [
          {
            type: "text",
            text: `查看禅道Bug时出错: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "resolve_zentao_bug",
  {
    title: "标记禅道Bug已解决",
    description: "标记指定的禅道Bug为已解决(不是实际解决bug，只是修改禅道状态)",
    inputSchema: {
      bugId: z.number().describe("Bug ID"),
      resolution: z.string().describe("解决方案(bydesign 设计如此 | duplicate 重复bug | external 外部原因 | fixed 已解决 | notrepro 无法重现 | postponed 延期处理 | willnotfix 不予解决 | tostory 转需求)"),
      duplicateBug: z.number().optional().describe("重复Bug ID，当 resolution 选择 duplicate 时，应传入此参数"),
      resolvedBuild: z.union([z.number(), z.string()]).optional().describe("解决版本，传入版本的ID，或者传入 trunk（主干）"),
      resolvedDate: z.string().optional().describe("解决时间"),
      assignedTo: z.string().optional().describe("指派给"),
      comment: z.string().optional().describe("备注"),
    },
  },
  async (input) => {
    try {
      if (!input.bugId) {
        return {
          content: [
            {
              type: "text",
              text: "错误: 必须提供Bug ID",
            },
          ],
          isError: true,
        };
      }

      if (!input.resolution) {
        return {
          content: [
            {
              type: "text",
              text: "错误: 必须提供解决方案(resolution)",
            },
          ],
          isError: true,
        };
      }

      // 构造解决Bug的数据
      const resolutionData = {
        resolution: input.resolution,
      };

      // 可选参数
      if (input.duplicateBug !== undefined) {
        resolutionData.duplicateBug = input.duplicateBug;
      }
      // 如果未提供解决版本，则默认为主干版本
      if (input.resolvedBuild !== undefined) {
        resolutionData.resolvedBuild = input.resolvedBuild;
      } else {
        resolutionData.resolvedBuild = "trunk";
      }
      // 如果未提供解决时间，则使用当前时间
      if (input.resolvedDate !== undefined) {
        resolutionData.resolvedDate = input.resolvedDate;
      } else {
        resolutionData.resolvedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      if (input.assignedTo !== undefined) {
        resolutionData.assignedTo = input.assignedTo;
      }
      if (input.comment !== undefined) {
        resolutionData.comment = input.comment;
      }

      const result = await resolveBug(input.bugId, resolutionData);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              bugId: input.bugId,
              result: result,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("解决禅道Bug时出错:", error);
      return {
        content: [
          {
            type: "text",
            text: `解决禅道Bug时出错: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 启动MCP服务
async function main() {
  console.log("[DEBUG] 开始启动ZenTao MCP服务");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("ZenTao MCP服务已启动");
  console.log("支持的工具:");
  console.log("- get_zentao_user_profile: 获取禅道用户个人信息");
  console.log("- get_zentao_products: 获取禅道产品列表");
  console.log("- get_bugs_by_product_id: 根据产品ID获取Bug列表");
  console.log("- get_bug_details: 获取Bug详情");
  console.log("- view_zentao_bugs: 查看禅道Bug");
  console.log("- resolve_zentao_bug: 解决禅道Bug");
}
// console.log('SOLA',import.meta.url)

// if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("MCP服务器错误:", error);
    process.exit(1);
  });
// }

export { server };
