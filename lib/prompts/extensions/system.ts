export const MANUAL_MODE_SYSTEM_EXTENSION = `
手动模式已启用。压缩操作需要用户明确触发。
`

export const SUBAGENT_SYSTEM_EXTENSION = `
子代理模式：压缩功能已禁用。
`

export function buildProtectedToolsExtension(protectedTools: string[]): string {
    if (protectedTools.length === 0) {
        return ""
    }

    const toolList = protectedTools.map((t) => `\`${t}\``).join(", ")
    return `以下工具的输出受保护，压缩时不要包含其完整内容：${toolList}`
}
