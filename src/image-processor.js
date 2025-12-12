/**
 * 图片处理模块
 * 负责处理图片获取、转换和上传逻辑
 */

import axios from "axios";
import FormData from "form-data";
import config from "../config.js";

/**
 * 通过Cookie认证获取图片并转换为base64
 */
async function fetchImageAsBase64(imageUrl) {
  try {
    // 获取token用于认证
    const { getZentaoToken } = await import("./zentao-api.js");
    const token = await getZentaoToken();

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Cookie': `zentaosid=${token}`,
      },
      timeout: 10000, // 10秒超时
    });

    // 获取MIME类型
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const base64 = Buffer.from(response.data, 'binary').toString('base64');

    return {
      success: true,
      base64: `data:${contentType};base64,${base64}`,
      url: imageUrl,
      size: response.data.length,
      contentType: contentType
    };
  } catch (error) {
    console.error(`获取图片失败 [${imageUrl}]:`, error.message);
    return {
      success: false,
      error: error.message,
      url: imageUrl
    };
  }
}

/**
 * 上传图片到图床
 */
async function uploadImageToImageHost(base64Data, imageName = 'zentao-bug-image') {
  try {
    // 从base64数据中提取MIME类型和数据
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('无效的base64图片数据');
    }

    const imageType = matches[1];
    const imageData = matches[2];

    // 获取图床配置
    const IMAGE_BED_URL = process.env.IMAGE_BED_URL || config.imageHost?.url;
    const uploadParams = config.imageHost?.uploadParams || {
      authCode: process.env.IMAGE_BED_AUTH || 'your-auth-code-here',
      uploadFolder: 'zentao_bug'
    };

    if (!IMAGE_BED_URL) {
      return {
        success: false,
        error: '未配置图床URL，请设置环境变量 IMAGE_BED_URL',
        url: null
      };
    }

    // 构建上传URL（基础URL + 上传路径 + uploadFolder参数）
    const uploadUrl = `${IMAGE_BED_URL}/upload?uploadFolder=${uploadParams.uploadFolder}`;

    // 转换base64为Buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    const fileName = `${imageName}.${imageType}`;

    // 准备FormData
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: fileName,
      contentType: `image/${imageType}`
    });

    // 发送请求到自定义图床（authCode放在Authorization header中）
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
        'Authorization': uploadParams.authCode
      },
      timeout: 30000,
    });

    // 解析响应数据
    // 响应格式: [{"src": "/file/abc123_image.jpg"}]
    if (response.data && Array.isArray(response.data) && response.data.length > 0 && response.data[0].src) {
      const imagePath = response.data[0].src;

      // 构建完整URL（基础URL + 返回的路径）
      let fullUrl;
      if (imagePath.startsWith('http')) {
        fullUrl = imagePath;
      } else {
        // 拼接到基础URL
        fullUrl = `${IMAGE_BED_URL}${imagePath}`;
      }

      return {
        success: true,
        url: fullUrl,
        path: imagePath,
        displayUrl: fullUrl
      };
    } else {
      throw new Error('图床返回数据格式错误');
    }
  } catch (error) {
    console.error('上传图片到图床失败:', error.message);
    return {
      success: false,
      error: error.message,
      url: null
    };
  }
}

/**
 * 并发获取图片列表
 */
async function fetchImagesInBatches(imageUrls, batchSize = 3) {
  const results = [];

  // 限制并发数，分批处理
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(url => fetchImageAsBase64(url))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * 处理steps内容 - 模式1: 不获取图片
 */
function processStepsNoneMode(steps) {
  if (steps && typeof steps === 'string') {
    const imgRegex = /<img[^>]*src=["\']([^"\']*)["\'][^>]*>/gi;
    const images = [];
    let match;

    while ((match = imgRegex.exec(steps)) !== null) {
      images.push(match[1]);
    }

    if (images.length > 0) {
      const imageMarkdown = images.map((url, index) => {
        return `![图片${index + 1}](${url})`;
      }).join('\n');

      return {
        content: steps,
        images: imageMarkdown,
        imageData: undefined
      };
    }
  }

  return { content: steps, images: '', imageData: undefined };
}

/**
 * 处理steps内容 - 模式2: URL模式
 */
async function processStepsUrlMode(steps) {
  const imgRegex = /<img[^>]*src=["\']([^"\']*)["\'][^>]*>/gi;
  const images = [];
  let match;

  while ((match = imgRegex.exec(steps)) !== null) {
    images.push(match[1]);
  }

  if (images.length > 0) {
    // 获取图片并上传到图床
    const imageResults = await fetchImagesInBatches(images);

    const uploadResults = await Promise.all(
      imageResults.map(async (result, index) => {
        if (result.success && result.base64) {
          const imageName = `bug-image-${images[index].split('/').pop() || index}`;
          const uploadResult = await uploadImageToImageHost(result.base64, imageName);
          return {
            url: uploadResult.url || result.url,
            originalUrl: result.url,
            success: result.success,
            base64: null,
            size: null,
            contentType: null,
            imageBedUrl: uploadResult.url || null,
            uploadSuccess: uploadResult.success
          };
        }
        return {
          url: result.url,
          originalUrl: result.url,
          success: result.success,
          base64: null,
          size: null,
          contentType: null,
          imageBedUrl: null,
          uploadSuccess: false
        };
      })
    );

    const imageMarkdownWithUrls = uploadResults.map((result, index) => {
      return `![图片${index + 1}](${result.url})`;
    }).join('\n');

    return {
      content: steps,
      images: imageMarkdownWithUrls,
      imageData: uploadResults
    };
  }

  return { content: steps, images: '', imageData: undefined };
}

/**
 * 处理steps内容 - 模式3: Base64模式
 */
async function processStepsBase64Mode(steps) {
  const imgRegex = /<img[^>]*src=["\']([^"\']*)["\'][^>]*>/gi;
  const images = [];
  let match;

  while ((match = imgRegex.exec(steps)) !== null) {
    images.push(match[1]);
  }

  if (images.length > 0) {
    // 获取图片并转换为base64，同时上传到图床
    const imageResults = await fetchImagesInBatches(images);

    const uploadResults = await Promise.all(
      imageResults.map(async (result, index) => {
        if (result.success && result.base64) {
          const imageName = `bug-image-${images[index].split('/').pop() || index}`;
          const uploadResult = await uploadImageToImageHost(result.base64, imageName);
          return {
            ...result,
            url: uploadResult.url || result.url,
            originalUrl: result.url,
            imageBedUrl: uploadResult.url || null,
            uploadSuccess: uploadResult.success
          };
        }
        return {
          ...result,
          url: result.url,
          originalUrl: result.url,
          imageBedUrl: null,
          uploadSuccess: false
        };
      })
    );

    const imageMarkdownWithUrls = uploadResults.map((result, index) => {
      if (result.success && result.imageBedUrl) {
        return `![图片${index + 1}](${result.imageBedUrl})`;
      } else {
        return `![图片${index + 1}](${result.url}) // 获取失败: ${result.error}`;
      }
    }).join('\n');

    return {
      content: steps,
      images: imageMarkdownWithUrls,
      imageData: uploadResults
    };
  }

  return { content: steps, images: '', imageData: undefined };
}

/**
 * 处理steps内容，支持三种图片模式
 */
async function processStepsContent(steps, imageMode = 'none') {
  switch (imageMode) {
    case 'base64':
      return await processStepsBase64Mode(steps);
    case 'url':
      return await processStepsUrlMode(steps);
    case 'none':
    default:
      return processStepsNoneMode(steps);
  }
}

export {
  processStepsContent,
  fetchImageAsBase64,
  uploadImageToImageHost,
};
