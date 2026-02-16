import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("thread edit wiring is scoped to thread composer", () => {
  const source = readFileSync(resolve(process.cwd(), "components/chat/ChatView.tsx"), "utf8");

  assert.match(source, /const \[threadEditingMessage, setThreadEditingMessage\] = useState<ChatMessage \| null>\(null\)/);
  assert.match(source, /onEdit=\{\(message\) => \{\s*if \(message\.deletedAt\) return;\s*setEditingMessage\(null\);\s*setThreadEditingMessage\(message\);\s*\}\}/s);
  assert.match(source, /<Composer\s+disabled=\{!canPost \|\| Boolean\(lockedAt\)\}\s+onSend=\{handleSendThread\}[\s\S]*editingMessage=\{/);
  assert.match(source, /onCancelEdit=\{\(\) => setThreadEditingMessage\(null\)\}/);

  const mainComposerMatch = source.match(/<Composer\s+disabled=\{!canPost \|\| Boolean\(lockedAt\)\}\s+onSend=\{handleSend\}[\s\S]*?onCreatePoll=\{canPost && !lockedAt \? handleCreatePoll : undefined\}/);
  assert.ok(mainComposerMatch, "expected to find main chat composer block");
  assert.match(mainComposerMatch[0], /editingMessage=\{/);
  assert.doesNotMatch(mainComposerMatch[0], /threadEditingMessage/);
});
