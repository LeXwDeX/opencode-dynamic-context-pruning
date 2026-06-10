import type { ExternalModelConfig, PluginConfig } from "./config"

export function applyExternalModelEnvOverride(config: PluginConfig): void {
    const envUrl = process.env.OPENCODE_DCP_EXTERNAL_COMPRESS_URL
    const envApiKey = process.env.OPENCODE_DCP_EXTERNAL_COMPRESS_KEY
    const envModel = process.env.OPENCODE_DCP_EXTERNAL_COMPRESS_MODEL
    const envTimeout = process.env.OPENCODE_DCP_EXTERNAL_COMPRESS_TIMEOUT
    const envRetries = process.env.OPENCODE_DCP_EXTERNAL_COMPRESS_RETRIES

    if (envUrl && envModel) {
        const externalModel: ExternalModelConfig = {
            url: envUrl,
            model: envModel,
        }
        if (envApiKey) {
            externalModel.apiKey = envApiKey
        }
        if (envTimeout) {
            const parsed = parseInt(envTimeout, 10)
            if (parsed > 0) {
                externalModel.timeout = parsed
            }
        }
        if (envRetries) {
            const parsed = parseInt(envRetries, 10)
            if (parsed >= 0) {
                externalModel.retries = parsed
            }
        }
        config.compress.externalModel = externalModel
    }
}
