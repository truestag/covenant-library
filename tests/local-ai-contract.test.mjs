import { readFile } from "node:fs/promises";
const windows = await readFile(new URL("../adapters/windows/main.go", import.meta.url), "utf8");
for (const required of [
  'COVENANT_OLLAMA_URL', '127.0.0.1:11434/api', '+"/tags"', '+"/generate"',
  '/__covenant/ai/status', '/__covenant/ai/ask', 'llama3.2:3b', 'CovenantLocalAI',
  'listModels', 'selectedModel', '"ready"', '"response": answer',
  'Answer only from the supplied local Covenant Library context'
]) if (!windows.includes(required)) throw new Error(`Windows local AI contract missing ${required}`);
const app = await readFile(new URL("../app/app.js", import.meta.url), "utf8");
for (const required of ['Study + Local AI', 'Optional local AI · Ollama', 'askLocalStudyAssistant', 'state.selectedModel', 'result?.response'])
  if (!app.includes(required)) throw new Error(`Study local AI UI missing ${required}`);
const helper = await readFile(new URL("../app/ai.js", import.meta.url), "utf8");
if (!helper.includes('covenant-library-local-ai-request/v2') || !helper.includes('model: String(model')) throw new Error('Local AI helper contract missing v2 schema');
console.log('PASS: Windows local Ollama contract matches the original v1.0.1 Study Assistant contract');
