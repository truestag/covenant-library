export const LOCAL_AI_BRIDGE_VERSION = 2;
export const DEFAULT_LOCAL_AI_MODEL = "llama3.2:3b";

const bridge = () => globalThis.CovenantLocalAI;

export function localAiAvailable() {
  const provider = bridge();
  return Boolean(provider && typeof provider.ask === "function" && typeof provider.status === "function");
}

export async function localAiStatus() {
  const provider = bridge();
  if (!provider || typeof provider.status !== "function") {
    return { available: false, provider: "ollama", models: [], defaultModel: DEFAULT_LOCAL_AI_MODEL, message: "Local AI is available only in the Covenant Library desktop app." };
  }
  return provider.status();
}

export async function listLocalAiModels() {
  const provider = bridge();
  if (!provider || typeof provider.listModels !== "function") return [];
  const result = await provider.listModels();
  return Array.isArray(result?.models) ? result.models : [];
}

export async function askLocalStudyAssistant({ question, context = [], sources = [], model = "" }) {
  const provider = bridge();
  if (!provider || typeof provider.ask !== "function") throw new Error("The Covenant Library local AI bridge is unavailable on this platform.");
  const payload = {
    schema: "covenant-library-local-ai-request/v2",
    instruction: "Answer only from the supplied Covenant Library passages and Study material. Cite evidence using the exact bracketed source identifiers supplied in the context, for example [kjv/Gen|1|1]. Distinguish scripture text from commentary or reference material. If the supplied material does not support an answer, say that plainly rather than inventing one.",
    question: String(question || "").trim(),
    model: String(model || "").trim(),
    context: Array.isArray(context) ? context : [],
    sources: Array.isArray(sources) ? sources : []
  };
  if (!payload.question) throw new Error("A question is required.");
  return provider.ask(payload);
}
