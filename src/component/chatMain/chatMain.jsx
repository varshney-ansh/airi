"use client"
import ChatInput from "@/component/chatInput/chatInput";
import { useCallback, useState } from "react";
import { callAgentAPI } from "@/lib/agent-api"; 

const ChatMain = ({ userId, chatId='test', user_name }) => {
    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState("ready");
    const [streamingMessageId, setStreamingMessageId] = useState(null);
    const [text, setText] = useState(""); // State for the input text
    const [message, setMessage] = useState({ text: "" });

    // Helper to update a specific message version's content
    const updateMessageContent = useCallback((messageId, newContent) => {
        setMessages((prev) =>
            prev.map((msg) => {
                if (msg.versions[0].id === messageId) {
                    return {
                        ...msg,
                        versions: [{ ...msg.versions[0], content: newContent }],
                    };
                }
                return msg;
            })
        );
    }, []);

    const streamResponse = useCallback(
        async (messageId, userPrompt) => {
            setStatus("streaming");
            setStreamingMessageId(messageId);

            let displayContent = "";
            let isStreamComplete = false;
            let tokenQueue = [];

            const renderQueue = () => {
                if (tokenQueue.length > 0) {
                    const nextToken = tokenQueue.shift();
                    displayContent += nextToken;
                    updateMessageContent(messageId, displayContent);
                }

                if (!isStreamComplete || tokenQueue.length > 0) {
                    setTimeout(renderQueue, 30);
                } else {
                    setStatus("ready");
                    setStreamingMessageId(null);
                }
            };

            renderQueue();

            try {
                await callAgentAPI({
                    prompt: userPrompt,
                    userId,
                    chatId,
                    onTextChunk: (chunk) => {
                        tokenQueue.push(chunk);
                    },
                    onComplete: () => {
                        isStreamComplete = true;
                    },
                    onError: (error) => {
                        console.error("API Error:", error);
                        isStreamComplete = true;
                        setStatus("ready");
                    },
                });
            } catch (error) {
                isStreamComplete = true;
                setStatus("ready");
            }
        },
        [userId, chatId, updateMessageContent]
    );

    const handleOnSubmit = useCallback((inputData) => {
        const content = inputData.text?.trim();
        if (!content && (!inputData.files || inputData.files.length === 0)) return;

        // 1. Add User Message
        const userMessage = {
            from: "user",
            key: `user-${Date.now()}`,
            versions: [{ content: content || "Sent attachments", id: `user-idx-${Date.now()}` }],
        };

        // 2. Add Assistant Placeholder
        const assistantMessageId = `assistant-${Date.now()}`;
        const assistantMessage = {
            from: "assistant",
            key: `assistant-key-${Date.now()}`,
            versions: [{ content: "", id: assistantMessageId }],
        };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);

        // 3. Start Streaming
        streamResponse(assistantMessageId, content);
    }, [streamResponse]);

    return (
        <main className="flex-1 h-screen overflow-hidden relative py-1.5 px-1.5">
            <div className="bg-[#151a28] h-[98vh] rounded-md border border-[#ffffff14] flex flex-col relative">
                {/* Mobile Sidebar Toggle - Positioned Absolute */}
                <div onClick={() => { const sidebar = document.getElementById("sidebar"); const newState = sidebar.getAttribute('data-state') === 'open' ? 'close' : 'open'; sidebar.setAttribute('data-state', newState); }} className="absolute top-2.5 left-2.5 md:hidden z-30 text-sm outline-offset-1 flex items-center justify-center hover:bg-[#ffffff14] transition-all duration-100 cursor-pointer bg-transparent text-[#c2cadf] font-semibold w-9 h-9 rounded-lg">
                    <svg viewBox="0 0 24 24" fill="#e5ebfa" xmlns="http://www.w3.org/2000/svg" className="size-5"><path d="M3.75 8.5C3.75 8.08579 4.08579 7.75 4.5 7.75H5.75C6.16421 7.75 6.5 8.08579 6.5 8.5C6.5 8.91421 6.16421 9.25 5.75 9.25H4.5C4.08579 9.25 3.75 8.91421 3.75 8.5ZM3.75 12C3.75 11.5858 4.08579 11.25 4.5 11.25H5.75C6.16421 11.25 6.5 11.5858 6.5 12C6.5 12.4142 6.16421 12.75 5.75 12.75H4.5C4.08579 12.75 3.75 12.4142 3.75 12ZM3.75 15.5C3.75 15.0858 4.08579 14.75 4.5 14.75H5.75C6.16421 14.75 6.5 15.0858 6.5 15.5C6.5 15.9142 6.16421 16.25 5.75 16.25H4.5C4.08579 16.25 3.75 15.9142 3.75 15.5ZM4.25 3C2.45507 3 1 4.45507 1 6.25V17.75C1 19.5449 2.45508 21 4.25 21H19.75C21.5449 21 23 19.5449 23 17.75V6.25C23 4.45507 21.5449 3 19.75 3H4.25ZM19.75 19.5H9V4.5H19.75C20.7165 4.5 21.5 5.2835 21.5 6.25V17.75C21.5 18.7165 20.7165 19.5 19.75 19.5ZM4.25 4.5H7.5V19.5H4.25C3.2835 19.5 2.5 18.7165 2.5 17.75V6.25C2.5 5.2835 3.2835 4.5 4.25 4.5Z"></path></svg>
                </div>

                {/* 1. MESSAGES CONTAINER */}
                <div data-showgreet={messages.length === 0} className="group data-[showgreet=true]:flex-[0.5] flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#ffffff14] scrollbar-track-transparent">
                    <div className="group-data-[showgreet=true]:hidden max-w-3xl mx-auto w-full py-10 px-4 space-y-8">

                        {messages.map((message) => {
                            return (
                                <>
                                    {/* Example User Message */}
                                    {message.from == "user" && (
                                        <div className="flex flex-col items-end group">
                                            <div className="bg-[#2a2f3e] text-[#e5ebfa] px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] text-base shadow-sm">
                                                {message.versions[0].content}
                                            </div>
                                            <span className="text-[10px] text-[#c2cadf] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Just now
                                            </span>
                                        </div>
                                    )}

                                    {/* Example AI Message */}
                                    {message.from == "assistant" && (
                                        <div className="flex flex-col items-start group">
                                            <div className="flex items-start gap-3 max-w-[90%]">
                                                <div className="space-y-4 pt-1">
                                                    <div className="text-[#e5ebfa] leading-relaxed space-y-3">
                                                        {message.versions[0].content.split("\n").map((line, i) => (
                                                            <p key={i}>{line}</p>
                                                        ))}
                                                    </div>

                                                    {/* References Section */}


                                                    {/* Message Actions */}
                                                    {streamingMessageId !== message.versions[0].id && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button className="p-1.5 cursor-pointer hover:bg-[#ffffff0a] rounded-lg text-[#c2cadf] transition-colors">
                                                                <svg viewBox="0 0 20 20" fill="#c2cadf" xmlns="http://www.w3.org/2000/svg" className="size-5"><path fillRule="evenodd" clipRule="evenodd" d="M10.7002 2.01074C11.0952 2.06005 11.4528 2.2785 11.6768 2.61426C12.2133 3.41901 12.5 4.36484 12.5 5.33203V5.95312C12.5 6.64737 12.3947 7.33709 12.1904 8H15.6914C16.9663 8 18 9.03369 18 10.3086C18 10.471 17.9832 10.6331 17.9492 10.792L16.7432 16.4189C16.5456 17.3411 15.7302 18 14.7871 18H9.11816C8.40698 18 7.70431 17.8549 7.05273 17.5752L7.04688 17.5723C6.7765 17.8363 6.40775 18 6 18H3.5C2.67157 18 2 17.3284 2 16.5V10.5C2 9.67157 2.67157 9 3.5 9H6C6.34648 9 6.665 9.11814 6.91895 9.31543L7.72559 8.34863C8.54907 7.36035 8.9999 6.11453 9 4.82812V3.47754C9 2.66177 9.66177 2 10.4775 2H10.5293L10.7002 2.01074ZM3.5 10C3.22386 10 3 10.2239 3 10.5V16.5C3 16.7761 3.22386 17 3.5 17H6C6.27614 17 6.5 16.7761 6.5 16.5V10.5C6.5 10.2239 6.27614 10 6 10H3.5ZM10.4775 3C10.2141 3 10 3.21405 10 3.47754V4.82812C9.9999 6.34856 9.46653 7.82122 8.49316 8.98926L7.47168 10.2139C7.48959 10.3066 7.5 10.4021 7.5 10.5V16.5C7.5 16.5585 7.4948 16.6161 7.48828 16.6729C8.00389 16.8878 8.55762 17 9.11816 17H14.7871C15.2585 17 15.6667 16.6709 15.7656 16.21L16.9707 10.583C16.99 10.493 17 10.4007 17 10.3086C17 9.58598 16.414 9 15.6914 9H11.5C11.4921 9 11.4844 8.99743 11.4766 8.99707C11.457 8.99614 11.4376 8.99451 11.418 8.99121C11.4013 8.98845 11.3852 8.98483 11.3691 8.98047C11.3602 8.97803 11.3507 8.97757 11.3418 8.97461C11.3357 8.97258 11.3302 8.96904 11.3242 8.9668C11.307 8.96032 11.2906 8.95259 11.2744 8.94434C11.261 8.93755 11.2479 8.93071 11.2354 8.92285C11.2217 8.91426 11.2091 8.90437 11.1963 8.89453C11.1828 8.88414 11.1695 8.87392 11.1572 8.8623C11.146 8.85165 11.1362 8.83977 11.126 8.82812C11.1156 8.81623 11.1049 8.80477 11.0957 8.79199C11.0856 8.77799 11.077 8.76309 11.0684 8.74805C11.0609 8.73511 11.0531 8.72253 11.0469 8.70898C11.0393 8.69254 11.0331 8.67555 11.0273 8.6582C11.0225 8.64364 11.0172 8.62925 11.0137 8.61426C11.0106 8.60113 11.0089 8.58772 11.0068 8.57422C11.0038 8.55451 11.0016 8.53476 11.001 8.51465C11.0008 8.50978 11 8.50491 11 8.5C11 8.49212 11.0016 8.48435 11.002 8.47656C11.0029 8.45704 11.0045 8.43757 11.0078 8.41797C11.0106 8.40136 11.0142 8.38516 11.0186 8.36914C11.021 8.36013 11.0224 8.35077 11.0254 8.3418L11.1943 7.83496C11.3966 7.22817 11.5 6.59274 11.5 5.95312V5.33203C11.5 4.56227 11.2717 3.80943 10.8447 3.16895C10.7919 3.08985 10.7122 3.03448 10.6221 3.01172L10.5293 3H10.4775Z"></path></svg>
                                                            </button>
                                                            <button className="p-1.5 cursor-pointer hover:bg-[#ffffff0a] rounded-lg text-[#c2cadf] transition-colors">
                                                                <svg viewBox="0 0 20 20" fill="#c2cadf" xmlns="http://www.w3.org/2000/svg" className="size-5"><path fillRule="evenodd" clipRule="evenodd" d="M6 2C6.4075 2 6.77654 2.16302 7.04688 2.42676L7.05273 2.4248C7.70431 2.14511 8.40698 2 9.11816 2H14.7871C15.7302 2 16.5456 2.65891 16.7432 3.58105L17.9492 9.20801C17.9832 9.36686 18 9.52895 18 9.69141C18 10.9663 16.9663 12 15.6914 12H12.1904C12.3947 12.6629 12.5 13.3526 12.5 14.0469V14.668C12.5 15.6352 12.2133 16.581 11.6768 17.3857C11.4528 17.7215 11.0952 17.9399 10.7002 17.9893L10.5293 18H10.4775C9.66177 18 9 17.3382 9 16.5225V15.1719C8.9999 13.8855 8.54907 12.6397 7.72559 11.6514L6.91895 10.6836C6.66492 10.8811 6.34669 11 6 11H3.5C2.67157 11 2 10.3284 2 9.5V3.5C2 2.67157 2.67157 2 3.5 2H6ZM9.11816 3C8.55774 3 8.0038 3.11128 7.48828 3.32617C7.49488 3.38327 7.5 3.44114 7.5 3.5V9.5C7.5 9.59759 7.48948 9.69276 7.47168 9.78516L8.49316 11.0107C9.46653 12.1788 9.9999 13.6514 10 15.1719V16.5225C10 16.7859 10.2141 17 10.4775 17H10.5293L10.6221 16.9883C10.7122 16.9655 10.7919 16.9101 10.8447 16.8311C11.2717 16.1906 11.5 15.4377 11.5 14.668V14.0469C11.5 13.4073 11.3966 12.7718 11.1943 12.165L11.0254 11.6582C11.0223 11.6489 11.0211 11.6392 11.0186 11.6299C11.0142 11.6139 11.0105 11.5977 11.0078 11.5811C11.0046 11.5614 11.0028 11.542 11.002 11.5225C11.0016 11.515 11 11.5075 11 11.5C11 11.4948 11.0008 11.4896 11.001 11.4844C11.0016 11.4643 11.0038 11.4445 11.0068 11.4248C11.0089 11.4113 11.0106 11.3979 11.0137 11.3848C11.0179 11.3671 11.0242 11.3501 11.0303 11.333C11.0355 11.3184 11.0404 11.3039 11.0469 11.29C11.0531 11.2765 11.0609 11.2639 11.0684 11.251C11.077 11.236 11.0856 11.221 11.0957 11.207C11.1052 11.1939 11.1162 11.1821 11.127 11.1699C11.1369 11.1587 11.1463 11.147 11.1572 11.1367C11.17 11.1246 11.1841 11.1143 11.1982 11.1035C11.2105 11.0942 11.2223 11.0844 11.2354 11.0762C11.2399 11.0733 11.2443 11.0701 11.249 11.0674L11.3057 11.0391C11.3117 11.0365 11.318 11.0346 11.3242 11.0322C11.3301 11.03 11.3358 11.0274 11.3418 11.0254C11.3508 11.0224 11.3601 11.021 11.3691 11.0186C11.3852 11.0142 11.4014 11.0106 11.418 11.0078C11.4376 11.0045 11.457 11.0029 11.4766 11.002C11.4844 11.0016 11.4921 11 11.5 11H15.6914C16.414 11 17 10.414 17 9.69141C17 9.59931 16.99 9.50704 16.9707 9.41699L15.7656 3.79004C15.6667 3.32914 15.2585 3 14.7871 3H9.11816ZM3.5 3C3.22386 3 3 3.22386 3 3.5V9.5C3 9.77614 3.22386 10 3.5 10H6C6.27614 10 6.5 9.77614 6.5 9.5V3.5C6.5 3.22386 6.27614 3 6 3H3.5Z"></path></svg>
                                                            </button>
                                                            <button className="p-1.5 cursor-pointer hover:bg-[#ffffff0a] rounded-lg text-[#c2cadf] transition-colors">
                                                                <svg viewBox="0 0 20 20" fill="#c2cadf" xmlns="http://www.w3.org/2000/svg" className="size-5"><path d="M9.5 3.00017C9.77607 3.00017 9.99988 3.22413 10 3.50017C10 3.77631 9.77614 4.00017 9.5 4.00017H6C4.89551 4.00017 4.00012 4.8957 4 6.00017V14.0002C4 15.1047 4.89543 16.0002 6 16.0002H14C15.1046 16.0002 16 15.1047 16 14.0002V12.5002C16.0001 12.2241 16.2239 12.0002 16.5 12.0002C16.7761 12.0002 16.9999 12.2241 17 12.5002V14.0002C17 15.657 15.6569 17.0002 14 17.0002H6C4.34315 17.0002 3 15.657 3 14.0002V6.00017C3.00012 4.34342 4.34322 3.00017 6 3.00017H9.5ZM13.2969 2.04314C13.4771 1.96307 13.6883 1.9962 13.835 2.1281L18.835 6.6281C18.9402 6.72287 18.9999 6.85853 19 7.00017C19 7.14184 18.9402 7.27742 18.835 7.37224L13.835 11.8722C13.6883 12.0042 13.4772 12.0373 13.2969 11.9572C13.1165 11.8768 13 11.6976 13 11.5002V9.34001C11.5991 9.46822 10.3347 10.1196 9.2998 10.9484C8.28552 11.7608 7.52484 12.7163 7.10547 13.4328L6.94727 13.7238C6.84356 13.9312 6.61045 14.0398 6.38477 13.9865C6.15932 13.9331 6 13.7319 6 13.5002C6.00003 11.4519 6.38155 9.21589 7.51855 7.47673C8.60929 5.80864 10.3673 4.64331 13 4.51286V2.50017L13.0049 2.42693C13.0297 2.25945 13.1392 2.11338 13.2969 2.04314ZM14 5.00017C14 5.27631 13.7761 5.50017 13.5 5.50017C10.9125 5.50017 9.3231 6.54551 8.35645 8.02361C7.67097 9.07197 7.28309 10.3631 7.11035 11.7072C7.54278 11.1873 8.06932 10.6531 8.6748 10.1681C9.94307 9.1524 11.6004 8.3156 13.5 8.3156C13.776 8.3156 13.9998 8.53962 14 8.8156V10.3761L17.751 7.00017L14 3.62321V5.00017Z"></path></svg>
                                                            </button>
                                                            <button className="p-1.5 cursor-pointer hover:bg-[#ffffff0a] rounded-lg text-[#c2cadf] transition-colors">
                                                                <svg viewBox="0 0 20 20" fill="#c2cadf" xmlns="http://www.w3.org/2000/svg" className="size-5"><path d="M8 2C6.89543 2 6 2.89543 6 4V14C6 15.1046 6.89543 16 8 16H14C15.1046 16 16 15.1046 16 14V4C16 2.89543 15.1046 2 14 2H8ZM7 4C7 3.44772 7.44772 3 8 3H14C14.5523 3 15 3.44772 15 4V14C15 14.5523 14.5523 15 14 15H8C7.44772 15 7 14.5523 7 14V4ZM4 6.00001C4 5.25973 4.4022 4.61339 5 4.26758V14.5C5 15.8807 6.11929 17 7.5 17H13.7324C13.3866 17.5978 12.7403 18 12 18H7.5C5.567 18 4 16.433 4 14.5V6.00001Z"></path></svg>
                                                            </button>
                                                        </div>
                                                    )}

                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )
                        })}

                    </div>
                </div>

                {/* 2. INPUT AREA */}
                <div className="w-full pb-6 pt-2">
                    <ChatInput user_name={user_name} showgreet={messages.length === 0} message={message} setMessage={setMessage} handleOnSubmit={handleOnSubmit} />
                </div>
            </div>
        </main >
    )
}

export default ChatMain;