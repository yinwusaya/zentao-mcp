// 简单测试脚本，用于测试resolve_zentao_bug工具
const { spawn } = require('child_process');
const path = require('path');

// 启动MCP服务器
const mcpServer = spawn('node', [path.join(__dirname, 'mcp-server.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverOutput = '';

// 监听服务器输出
mcpServer.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log(`[SERVER OUTPUT] ${output}`);
  
  // 当服务器启动完成并显示支持的工具时，发送测试请求
  if (output.includes('支持的工具:')) {
    console.log('MCP服务器已启动，准备发送测试请求...');
    
    // 这里可以添加发送测试请求的代码
    // 但由于这是stdio通信，我们需要使用MCP客户端来测试
    console.log('请使用MCP客户端连接到此服务器并测试resolve_zentao_bug工具');
    console.log('支持的工具包括:');
    console.log('- resolve_zentao_bug: 解决禅道Bug');
  }
});

mcpServer.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data}`);
});

mcpServer.on('close', (code) => {
  console.log(`[SERVER CLOSED] 退出码: ${code}`);
});

// 监听进程退出事件，确保清理子进程
process.on('exit', () => {
  if (mcpServer.pid) {
    process.kill(mcpServer.pid);
  }
});

console.log('正在启动ZenTao MCP服务器...');