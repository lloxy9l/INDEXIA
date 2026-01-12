export const LLM_CATALOG = ["llama3.2", "qwen3:4b"]

export const normalizeModelName = (value: string) =>
  value.split(":")[0].toLowerCase()

export const modelKeyFromName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
