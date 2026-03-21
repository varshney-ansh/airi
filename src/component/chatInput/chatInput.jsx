"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export default function ChatInput({ showgreet, handleOnSubmit, user_name }) {
    const [message, setMessage] = useState({ text: "" });
    const [files, setFiles] = useState([]);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, [message?.text]);

    useEffect(() => {
        return () => { files.forEach((f) => URL.revokeObjectURL(f.url)); };
    }, [files]);

    const handleFileChange = useCallback((e) => {
        const selected = Array.from(e.target.files || []);
        setFiles((prev) => [...prev, ...selected.map((file) => ({
            file,
            url: URL.createObjectURL(file),
            isImage: file.type.startsWith("image/"),
        }))]);
    }, []);

    const removeFile = useCallback((index) => {
        setFiles((prev) => {
            const file = prev[index];
            if (file?.url) URL.revokeObjectURL(file.url);
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    const submit = useCallback(() => {
        const text = message?.text?.trim();
        if (!text && files.length === 0) return;
        handleOnSubmit({ text, files });
        setMessage({ text: "" });
        setFiles([]);
    }, [message, files, handleOnSubmit]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    return (
        <div className="w-full max-w-184 mx-auto px-4">
            {showgreet && (
                <div className="max-sm:pb-4 flex text-text-primary font-semibold w-full flex-col items-start justify-start sm:justify-end sm:mb-8 sm:h-25 text-2xl sm:ps-2">
                    <h2 className="text-[28px]">
                        <span className="font-normal text-[24px]">Hi {user_name},</span>
                        <br />
                        <span className="text-[36px] max-sm:text-[28px] font-normal tracking-[-0.03125rem]">Where should we start?</span>
                    </h2>
                </div>
            )}

            <div className="bg-bg-card rounded-[28px] border border-border-default shadow-lg focus-within:border-border-active">
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-4 pb-0">
                        {files.map((file, i) => (
                            <div key={i} className="relative size-16 bg-bg-hover rounded-xl overflow-hidden border border-border-default">
                                {file.isImage ? (
                                    <img src={file.url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-xs text-text-muted p-1 text-center">
                                        {file.file.name.split(".").pop().toUpperCase()}
                                    </div>
                                )}
                                <button
                                    onClick={() => removeFile(i)}
                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full size-5 flex items-center justify-center text-xs"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="px-4 pt-4">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={message?.text || ""}
                        onChange={(e) => setMessage((prev) => ({ ...prev, text: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything..."
                        className="w-full bg-transparent text-text-primary placeholder:text-text-muted outline-none resize-none text-[16px] max-h-[200px]"
                    />
                </div>

                <div className="flex items-center justify-between p-3">
                    <div>
                        <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-text-muted hover:bg-bg-hover rounded-full transition-colors"
                        >
                            +
                        </button>
                    </div>
                    <button
                        onClick={submit}
                        disabled={!message?.text?.trim() && files.length === 0}
                        className={`size-10 rounded-full flex items-center justify-center transition ${
                            message?.text?.trim() || files.length > 0
                                ? "bg-text-primary text-bg-app"
                                : "bg-bg-hover text-text-muted"
                        }`}
                    >
                        ↑
                    </button>
                </div>
            </div>
        </div>
    );
}
