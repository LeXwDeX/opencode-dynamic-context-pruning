// 这些格式模式与可编辑的压缩提示分开保存
// 因此不能通过自定义提示覆盖来修改。这些模式必须
// 与工具的输入验证匹配，且不能独立更改。

export const RANGE_FORMAT_EXTENSION = `
压缩格式

\`\`\`
{
  topic: string,           // 短标签（3-5 个词）- 例如，"认证系统探索"
  content: [               // 一个或多个要压缩的范围
    {
      startId: string,     // 范围开始的边界 ID：mNNNN 或 bN
      endId: string,       // 范围结束的边界 ID：mNNNN 或 bN
      summary: string      // 替换范围内所有内容的完整技术摘要
    }
  ]
}
\`\`\``

export const MESSAGE_FORMAT_EXTENSION = `
压缩格式

\`\`\`
{
  topic: string,           // 整个批次的短标签（3-5 个词）
  content: [               // 一个或多个要独立压缩的消息
    {
      messageId: string,   // 仅原始消息 ID：mNNNN（忽略 priority 等元数据属性）
      topic: string,       // 此单条消息摘要的短标签（3-5 个词）
      summary: string      // 替换该条消息的完整技术摘要
    }
  ]
}
\`\`\``
