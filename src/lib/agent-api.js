export async function callAgentAPI({ prompt, history = [], userId, chatId, onTextChunk, onToolCall, onComplete, onError }) {
    const agentUrl = typeof window !== "undefined" && window.electronAPI
        ? "http://127.0.0.1:11435/v1/chat/completions"
        : "/api/agent";

    const messages = [...history, { role: "user", content: prompt }];

    try {
        const response = await fetch(agentUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                agentUrl.includes("11435")
                    ? { model: "airi", stream: true, messages, user_id: userId ?? "default_user", session_id: chatId ?? "default_session" }
                    : { messages, userId, chatId }
            ),
        });

        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        if (!response.body) throw new Error("No response body returned from the API.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            let currentEvent = "message";
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) { currentEvent = "message"; continue; }

                // Track SSE event type
                if (trimmed.startsWith("event: ")) {
                    currentEvent = trimmed.slice(7).trim();
                    continue;
                }

                if (!trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);

                // tool_call event from agent.py
                if (currentEvent === "tool_call") {
                    try {
                        const parsed = JSON.parse(data);
                        if (onToolCall) onToolCall(parsed);
                    } catch { /* ignore */ }
                    currentEvent = "message";
                    continue;
                }

                if (data === "[DONE]") { onComplete(); return; }

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed?.choices?.[0]?.delta?.content;
                    if (content) onTextChunk(content);
                } catch {
                    // incomplete chunk
                }
            }
        }
        onComplete();
    } catch (error) {
        console.error("Stream reading error:", error);
        onError(error);
    }
}
