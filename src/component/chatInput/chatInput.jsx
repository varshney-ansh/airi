"use client"
import { random } from 'nanoid';
import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ showgreet, message, setMessage, handleOnSubmit, user_name }) {

    const [files, setFiles] = useState([]);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    // Auto-resize textarea logic
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [message]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        // Create preview URLs for images
        const filePreviews = selectedFiles.map(file => ({
            file,
            url: URL.createObjectURL(file),
            isImage: file.type.startsWith('image/')
        }));
        setFiles([...files, ...filePreviews]);
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmitClick = (e) => {
        e.preventDefault();
        if (!message.text?.trim() && files.length === 0) return;

        handleOnSubmit({ text: message.text, files: files });

        // Clear the input and files after sending
        setMessage({ text: "" });
        setFiles([]);
    };

    return (
        <div className="w-full max-w-184 mx-auto px-4">
            {/* Greeting Section */}
            {showgreet && (
                <div className="flex text-[#e5ebfa] font-semibold w-full flex-col items-start justify-start sm:justify-end sm:mb-8 sm:h-25 text-2xl sm:ps-2">
                    <h2 className="text-[28px]">Hi {user_name}, what should we dive into today?</h2>
                </div>
            )}

            {/* Main Input Container */}
            <div className="relative bg-[#171a26] rounded-[28px] border border-[#ffffff14] shadow-lg transition-all focus-within:border-[#ffffff33]">

                {/* 1. File Preview Area (Only shows when files exist) */}
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-4 pb-0">
                        {files.map((file, i) => (
                            <div key={i} className="relative group size-16 bg-[#ffffff0a] rounded-xl border border-[#ffffff14] overflow-hidden">
                                {file.isImage ? (
                                    <img src={file.url} className="size-full object-cover" alt="preview" />
                                ) : (
                                    <div className="size-full flex items-center justify-center text-[10px] text-[#c2cadf] p-1 text-center break-all">
                                        {file.file.name.split('.').pop().toUpperCase()}
                                    </div>
                                )}
                                <button
                                    onClick={() => removeFile(i)}
                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full size-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg viewBox="0 0 24 24" fill="#c2cadf" xmlns="http://www.w3.org/2000/svg" className="size-3" aria-hidden="true"><path d="M4.39705 4.55379L4.46967 4.46967C4.73594 4.2034 5.1526 4.1792 5.44621 4.39705L5.53033 4.46967L12 10.939L18.4697 4.46967C18.7626 4.17678 19.2374 4.17678 19.5303 4.46967C19.8232 4.76256 19.8232 5.23744 19.5303 5.53033L13.061 12L19.5303 18.4697C19.7966 18.7359 19.8208 19.1526 19.6029 19.4462L19.5303 19.5303C19.2641 19.7966 18.8474 19.8208 18.5538 19.6029L18.4697 19.5303L12 13.061L5.53033 19.5303C5.23744 19.8232 4.76256 19.8232 4.46967 19.5303C4.17678 19.2374 4.17678 18.7626 4.46967 18.4697L10.939 12L4.46967 5.53033C4.2034 5.26406 4.1792 4.8474 4.39705 4.55379L4.46967 4.46967L4.39705 4.55379Z"></path></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. Textarea */}
                <div className="px-4 pt-4">
                    <textarea
                        ref={textareaRef}
                        rows="1"
                        value={message.text}
                        onChange={(e) => setMessage({ id: random(), text: e.target.value })}
                        placeholder="Ask me anything..."
                        className="w-full bg-transparent text-[#e5ebfa] placeholder-[#c2cadf] outline-none resize-none text-[16px] leading-relaxed max-h-[200px]"
                    />
                </div>

                {/* 3. Action Bar */}
                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-1">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {/* Attachment Button */}
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="group p-2 text-[#c2cadf] hover:bg-[#ffffff0a] rounded-full transition-all duration-200"
                            title="Add files"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                                className="size-6 transition-transform duration-200 group-hover:rotate-90"
                            >
                                <path d="M11.7498 3C12.1295 3 12.4434 3.28201 12.4931 3.64808L12.5 3.74985L12.5012 11H19.7543C20.1685 11 20.5043 11.3358 20.5043 11.75C20.5043 12.1297 20.2221 12.4435 19.8561 12.4932L19.7543 12.5H12.5012L12.5032 19.7491C12.5033 20.1633 12.1676 20.4993 11.7534 20.4993C11.3737 20.4993 11.0598 20.2173 11.0101 19.8512L11.0032 19.7494L11.0012 12.5H3.7522C3.33798 12.5 3.0022 12.1642 3.0022 11.75C3.0022 11.3703 3.28435 11.0565 3.65043 11.0068L3.7522 11H11.0012L11 3.75015C10.9999 3.33594 11.3356 3 11.7498 3Z" />
                            </svg>
                        </button>
                    </div>

                    {/* Send Button */}
                    <button onClick={handleSubmitClick}
                        disabled={!message?.text?.trim() && files.length === 0}
                        className={`size-10 flex items-center justify-center rounded-full transition-all ${message?.text?.trim() || files.length > 0
                            ? 'bg-[#e5ebfa] text-black hover:opacity-90'
                            : 'bg-[#ffffff0a] text-[#ffffff33]'
                            }`}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-6"><path d="M4.20889 10.7327C3.9232 11.0326 3.93475 11.5074 4.23467 11.7931C4.5346 12.0788 5.00933 12.0672 5.29502 11.7673L11.2495 5.516V20.25C11.2495 20.6642 11.5853 21 11.9995 21C12.4137 21 12.7495 20.6642 12.7495 20.25V5.51565L18.7043 11.7673C18.99 12.0672 19.4648 12.0788 19.7647 11.7931C20.0646 11.5074 20.0762 11.0326 19.7905 10.7327L12.7238 3.31379C12.5627 3.14474 12.3573 3.04477 12.1438 3.01386C12.0971 3.00477 12.0489 3 11.9995 3C11.9498 3 11.9012 3.00483 11.8543 3.01406C11.6412 3.04518 11.4363 3.14509 11.2756 3.31379L4.20889 10.7327Z"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

