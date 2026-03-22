"use client"
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ userId, children }) {
    const [chats, setChats] = useState([]);

    const loadChats = useCallback(async () => {
        if (!userId || typeof window === "undefined" || !window.electronAPI) return;
        const result = await window.electronAPI.getChats(userId);
        setChats(result || []);
    }, [userId]);

    useEffect(() => {
        if (!userId || typeof window === "undefined" || !window.electronAPI) return;
        // Load local immediately, then sync from Atlas in background
        loadChats();
        window.electronAPI.pullChats(userId).then(() => loadChats());
    }, [userId, loadChats]);

    // Called by ChatMain after saveChat — immediately reflects new/updated chat in sidebar
    const addOrUpdateChat = useCallback((chatData) => {
        setChats((prev) => {
            const idx = prev.findIndex((c) => c.chatId === chatData.chatId);
            if (idx === -1) return [chatData, ...prev];
            const updated = [...prev];
            updated[idx] = chatData;
            return updated;
        });
    }, []);

    const removeChat = useCallback((chatId) => {
        setChats((prev) => prev.filter((c) => c.chatId !== chatId));
    }, []);

    return (
        <ChatContext.Provider value={{ chats, addOrUpdateChat, removeChat, loadChats }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error("useChatContext must be used inside ChatProvider");
    return ctx;
}
