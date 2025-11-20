const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const axios = require("axios");
const config = require("./config");

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
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("获取产品Bug列表失败:", error.message);
    throw error;
  }
}

// 定义MCP工具，不使用Zod验证以避免版本兼容问题
server.registerTool(
  "get_bugs_by_product_id",
  {
    title: "根据产品ID获取Bug列表",
    description: "根据产品ID获取该产品下的所有Bug列表",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "number", description: "产品ID" },
        page: { type: "number", description: "页码" },
        limit: { type: "number", description: "每页数量" }
      },
      required: ["productId"]
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

// 启动MCP服务
async function main() {
  console.log("[DEBUG] 开始启动ZenTao MCP服务");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("ZenTao MCP服务已启动");
  console.log("支持的工具:");
  console.log("- get_bugs_by_product_id: 根据产品ID获取Bug列表");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("MCP服务器错误:", error);
    process.exit(1);
  });
}