"use client"
import ChatInput from "@/component/chatInput/chatInput";
import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { callAgentAPI } from "@/lib/agent-api";
import { useChatContext } from "@/context/ChatContext";
import { ArrowCircleUpRight24Regular } from "@fluentui/react-icons";

function historyToMessages(chatHistory = []) {
    return chatHistory.map((m, i) => ({
        from: m.role === "user" ? "user" : "assistant",
        key: `history-${i}`,
        versions: [{ content: m.content, id: `history-id-${i}` }],
    }));
}

function messagesToHistory(messages) {
    return messages.map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.versions[0].content,
    }));
}

const ChatMain = ({ userId, chatId: initialChatId, user_name }) => {
    const [messages, setMessages] = useState([]);
    const [streamingMessageId, setStreamingMessageId] = useState(null);
    const [message, setMessage] = useState({ text: "" });

    const chatIdRef = useRef(initialChatId || null);
    const accumulatorRef = useRef("");
    const messagesRef = useRef([]);
    const { addOrUpdateChat } = useChatContext();

    // Keep messagesRef in sync so we can read latest messages outside of state
    const setMessagesAndRef = useCallback((updater) => {
        setMessages((prev) => {
            const next = typeof updater === "function" ? updater(prev) : updater;
            messagesRef.current = next;
            return next;
        });
    }, []);

    // Load history when opening an existing chat
    useEffect(() => {
        if (!initialChatId || typeof window === "undefined" || !window.electronAPI) return;
        window.electronAPI.getChats(userId).then((chats) => {
            const found = chats?.find((c) => c.chatId === initialChatId);
            if (found?.chatHistory?.length) {
                const msgs = historyToMessages(found.chatHistory);
                messagesRef.current = msgs;
                setMessages(msgs);
            }
        });
    }, [initialChatId, userId]);

    const chatTitleRef = useRef("New Chat");
    const titleSetRef = useRef(!!initialChatId);

    const saveChat = useCallback(async (updatedMessages) => {
        const cid = chatIdRef.current;
        if (!cid || !userId) return;

        const chatData = {
            chatId: cid,
            userId,
            chatTitle: chatTitleRef.current,
            chatHistory: messagesToHistory(updatedMessages),
            updatedAt: Date.now(),
        };

        addOrUpdateChat(chatData);

        if (typeof window !== "undefined" && window.electronAPI) {
            await window.electronAPI.saveChat(chatData);
        }
    }, [userId, addOrUpdateChat]);

    const streamResponse = useCallback(async (messageId, userPrompt) => {
        setStreamingMessageId(messageId);
        accumulatorRef.current = "";

        try {
            await callAgentAPI({
                prompt: userPrompt,
                userId,
                chatId: chatIdRef.current,
                onTextChunk: (chunk) => {
                    accumulatorRef.current += chunk;
                    const snapshot = accumulatorRef.current;
                    setMessagesAndRef((prev) =>
                        prev.map((msg) =>
                            msg.versions[0].id === messageId
                                ? { ...msg, versions: [{ ...msg.versions[0], content: snapshot }] }
                                : msg
                        )
                    );
                },
                onComplete: () => {
                    setStreamingMessageId(null);
                    saveChat(messagesRef.current);
                },
                onError: (error) => {
                    console.error("API Error:", error);
                    setStreamingMessageId(null);
                },
            });
        } catch {
            setStreamingMessageId(null);
        }
    }, [userId, saveChat]);

    const handleOnSubmit = useCallback((inputData) => {
        const content = inputData.text?.trim();
        if (!content && (!inputData.files || inputData.files.length === 0)) return;

        // Generate chatId on first message from / and update URL without remounting
        if (!chatIdRef.current) {
            const newId = nanoid();
            chatIdRef.current = newId;
            window.history.pushState(null, "", `/app/${newId}`);
        }

        const cid = chatIdRef.current;

        const userMessage = {
            from: "user",
            key: `user-${Date.now()}`,
            versions: [{ content: content || "Sent attachments", id: `user-idx-${Date.now()}` }],
        };
        const assistantMessageId = `assistant-${Date.now()}`;
        const assistantMessage = {
            from: "assistant",
            key: `assistant-key-${Date.now()}`,
            versions: [{ content: "", id: assistantMessageId }],
        };
        setMessagesAndRef((prev) => [...prev, userMessage, assistantMessage]);

        // Set title once on first submit only
        if (!titleSetRef.current) {
            titleSetRef.current = true;
            const title = content.length < 3 ? "New Chat" : content.length > 60 ? content.slice(0, 57) + "..." : content;
            chatTitleRef.current = title;
            const initialChatData = {
                chatId: cid,
                userId,
                chatTitle: title,
                chatHistory: [{ role: "user", content }],
                updatedAt: Date.now(),
            };
            addOrUpdateChat(initialChatData);
            // Persist immediately so the new ChatProvider (after pushState navigation) loads it from electron-store
            if (typeof window !== "undefined" && window.electronAPI) {
                window.electronAPI.saveChat(initialChatData);
            }
        }

        streamResponse(assistantMessageId, content);
    }, [streamResponse, addOrUpdateChat, userId]);

    const handleOpenOverlay = () => {
        if (typeof window !== "undefined" && window.electronAPI) {
            window.electronAPI.openOverlay();
        }
    };

    return (
        <main className="flex-1 h-screen overflow-hidden relative py-1.5 px-1.5">
            <div className="bg-bg-modal h-[98vh] rounded-md border border-border-default flex flex-col relative">
                <div className="absolute top-2.5 left-2.5 z-30 flex gap-2 items-center">
                    <div
                        onClick={() => { const s = document.getElementById("sidebar"); s.setAttribute('data-state', s.getAttribute('data-state') === 'open' ? 'close' : 'open'); }}
                        className="md:hidden text-sm flex items-center justify-center hover:bg-bg-hover transition-all duration-100 cursor-pointer text-text-muted w-9 h-9 rounded-lg"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-5"><path d="M3.75 8.5C3.75 8.08579 4.08579 7.75 4.5 7.75H5.75C6.16421 7.75 6.5 8.08579 6.5 8.5C6.5 8.91421 6.16421 9.25 5.75 9.25H4.5C4.08579 9.25 3.75 8.91421 3.75 8.5ZM3.75 12C3.75 11.5858 4.08579 11.25 4.5 11.25H5.75C6.16421 11.25 6.5 11.5858 6.5 12C6.5 12.4142 6.16421 12.75 5.75 12.75H4.5C4.08579 12.75 3.75 12.4142 3.75 12ZM3.75 15.5C3.75 15.0858 4.08579 14.75 4.5 14.75H5.75C6.16421 14.75 6.5 15.0858 6.5 15.5C6.5 15.9142 6.16421 16.25 5.75 16.25H4.5C4.08579 16.25 3.75 15.9142 3.75 15.5ZM4.25 3C2.45507 3 1 4.45507 1 6.25V17.75C1 19.5449 2.45508 21 4.25 21H19.75C21.5449 21 23 19.5449 23 17.75V6.25C23 4.45507 21.5449 3 19.75 3H4.25ZM19.75 19.5H9V4.5H19.75C20.7165 4.5 21.5 5.2835 21.5 6.25V17.75C21.5 18.7165 20.7165 19.5 19.75 19.5ZM4.25 4.5H7.5V19.5H4.25C3.2835 19.5 2.5 18.7165 2.5 17.75V6.25C2.5 5.2835 3.2835 4.5 4.25 4.5Z"></path></svg>
                    </div>
                    <div onClick={handleOpenOverlay} className="text-sm flex items-center justify-center hover:bg-bg-hover transition-all duration-100 cursor-pointer text-text-muted w-9 h-9 rounded-lg">
                        <ArrowCircleUpRight24Regular />
                    </div>
                </div>

                <div data-showgreet={messages.length === 0} className="group data-[showgreet=true]:flex-[0.5] flex-1 overflow-y-auto">
                    <div className="group-data-[showgreet=true]:hidden max-w-3xl mx-auto w-full py-10 px-4 space-y-8">
                        {messages.map((msg) => (
                            <div key={msg.key}>
                                {msg.from === "user" && (
                                    <div className="flex flex-col items-end group">
                                        <div className="bg-bg-hover text-text-primary px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] text-base">
                                            {msg.versions[0].content}
                                        </div>
                                        <span className="text-[10px] text-text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Just now</span>
                                    </div>
                                )}
                                {msg.from === "assistant" && (
                                    <div className="flex flex-col items-start group">
                                        <div className="flex items-start gap-3 max-w-[90%]">
                                            <div className="space-y-4 pt-1">
                                                <div className="text-text-primary leading-relaxed space-y-3">
                                                    {msg.versions[0].content.split("\n").map((line, i) => (
                                                        <p key={i}>{line}</p>
                                                    ))}
                                                </div>
                                                {streamingMessageId !== msg.versions[0].id && msg.versions[0].content && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1.5 cursor-pointer hover:bg-bg-hover rounded-lg text-text-muted transition-colors">
                                                            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5"><path fillRule="evenodd" clipRule="evenodd" d="M10.7002 2.01074C11.0952 2.06005 11.4528 2.2785 11.6768 2.61426C12.2133 3.41901 12.5 4.36484 12.5 5.33203V5.95312C12.5 6.64737 12.3947 7.33709 12.1904 8H15.6914C16.9663 8 18 9.03369 18 10.3086C18 10.471 17.9832 10.6331 17.9492 10.792L16.7432 16.4189C16.5456 17.3411 15.7302 18 14.7871 18H9.11816C8.40698 18 7.70431 17.8549 7.05273 17.5752L7.04688 17.5723C6.7765 17.8363 6.40775 18 6 18H3.5C2.67157 18 2 17.3284 2 16.5V10.5C2 9.67157 2.67157 9 3.5 9H6C6.34648 9 6.665 9.11814 6.91895 9.31543L7.72559 8.34863C8.54907 7.36035 8.9999 6.11453 9 4.82812V3.47754C9 2.66177 9.66177 2 10.4775 2H10.5293L10.7002 2.01074Z"></path></svg>
                                                        </button>
                                                        <button className="p-1.5 cursor-pointer hover:bg-bg-hover rounded-lg text-text-muted transition-colors">
                                                            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5"><path d="M8 2C6.89543 2 6 2.89543 6 4V14C6 15.1046 6.89543 16 8 16H14C15.1046 16 16 15.1046 16 14V4C16 2.89543 15.1046 2 14 2H8ZM7 4C7 3.44772 7.44772 3 8 3H14C14.5523 3 15 3.44772 15 4V14C15 14.5523 14.5523 15 14 15H8C7.44772 15 7 14.5523 7 14V4ZM4 6.00001C4 5.25973 4.4022 4.61339 5 4.26758V14.5C5 15.8807 6.11929 17 7.5 17H13.7324C13.3866 17.5978 12.7403 18 12 18H7.5C5.567 18 4 16.433 4 14.5V6.00001Z"></path></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full pb-6 pt-2">
                    <ChatInput
                        user_name={user_name}
                        showgreet={messages.length === 0}
                        message={message}
                        setMessage={setMessage}
                        handleOnSubmit={handleOnSubmit}
                    />
                </div>
            </div>
        </main>
    );
}

export default ChatMain;
