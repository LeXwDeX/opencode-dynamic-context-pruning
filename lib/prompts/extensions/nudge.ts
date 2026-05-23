import type { SessionState } from "../../state"

export function buildCompressedBlockGuidance(state: SessionState): string {
    const refs = Array.from(state.prune.messages.activeBlockIds)
        .filter((id) => Number.isInteger(id) && id > 0)
        .sort((a, b) => a - b)
        .map((id) => `b${id}`)
    const blockCount = refs.length
    const blockList = blockCount > 0 ? refs.join(", ") : "无"

    return [
        "压缩块上下文：",
        `- 此会话中的活跃压缩块：${blockCount} 个（${blockList}）`,
        "- 如果你选择的压缩范围包含任何列出的块，在摘要中使用 `(bN)` 恰好包含每个必需的占位符一次。",
    ].join("\n")
}

export function renderMessagePriorityGuidance(priorityLabel: string, refs: string[]): string {
    const refList = refs.length > 0 ? refs.join(", ") : "无"

    const priorityLabelZh = priorityLabel === "high" ? "高" : priorityLabel === "medium" ? "中" : "低"

    return [
        "消息优先级上下文：",
        "- 高优先级的旧消息消耗更多上下文，如果安全的话应立即压缩。",
        `- 此点之前的${priorityLabelZh}优先级消息 ID：${refList}`,
    ].join("\n")
}

export function appendGuidanceToDcpTag(nudgeText: string, guidance: string): string {
    if (!guidance.trim()) {
        return nudgeText
    }

    const closeTag = ""
    const closeTagIndex = nudgeText.lastIndexOf(closeTag)

    if (closeTagIndex === -1) {
        return nudgeText
    }

    const beforeClose = nudgeText.slice(0, closeTagIndex).trimEnd()
    const afterClose = nudgeText.slice(closeTagIndex)
    return `${beforeClose}\n\n${guidance}\n${afterClose}`
}
