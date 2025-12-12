import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";

// 导入模块化的功能
import {
  getZentaoUserProfile,
  getZentaoProducts,
  getBugsByProductId,
  getBugDetails,
  getZentaoBugs,
  resolveBug,
} from "./src/zentao-api.js";

import {
  processStepsContent,
} from "./src/image-processor.js";

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

/**
 * 通用错误处理工具函数
 */
function handleError(error, operation) {
  console.error(`${operation}时出错:`, error.message);
  return {
    content: [
      {
        type: "text",
        text: `${operation}时出错: ${error.message}`,
      },
    ],
    isError: true,
  };
}

// 注册工具: 获取禅道用户个人信息
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
      return handleError(error, "获取用户个人信息");
    }
  }
);

// 注册工具: 获取禅道产品列表
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
      return handleError(error, "获取产品列表");
    }
  }
);

// 注册工具: 根据产品ID获取Bug列表
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
      return handleError(error, "获取产品Bug列表");
    }
  }
);

// 注册工具: 获取Bug详情
server.registerTool(
  "get_bug_details",
  {
    title: "获取Bug详情",
    description: "根据Bug ID获取Bug的详细信息，支持三种图片模式",
    inputSchema: {
      bugId: z.number().describe("Bug ID"),
      imageMode: z.enum(["none", "url", "base64"]).optional().describe("图片模式: none-不获取(默认), url-获取但不含base64, base64-获取并转换base64")
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

      // 处理steps内容，支持三种模式
      const processedSteps = await processStepsContent(bugDetails.steps, input.imageMode);

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
        steps: processedSteps.content,
        images: processedSteps.images || undefined,
        imageData: processedSteps.imageData || undefined,
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

      // 准备返回内容
      const returnContent = [
        {
          type: "text",
          text: JSON.stringify(simplifiedBugDetails, null, 2),
        }
      ];

      // 如果有图片，额外添加图片内容
      if (processedSteps.images && processedSteps.images.trim() !== '') {
        returnContent.push({
          type: "text",
          text: "\n" + processedSteps.images
        });
      }

      return {
        content: returnContent,
      };
    } catch (error) {
      return handleError(error, "获取Bug详情");
    }
  }
);

// 注册工具: 查看禅道Bug
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
      return handleError(error, "查看禅道Bug");
    }
  }
);

// 注册工具: 标记禅道Bug已解决
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
      return handleError(error, "解决禅道Bug");
    }
  }
);

// 启动MCP服务
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP服务器错误:", error);
  process.exit(1);
});

export { server };
