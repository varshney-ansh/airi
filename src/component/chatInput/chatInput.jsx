"use client";

import { Add24Regular, ArrowUp24Regular, MicSparkle24Regular, MicOff24Regular } from "@fluentui/react-icons";
import { useState, useRef, useEffect, useCallback } from "react";

const isElectron = () => typeof window !== "undefined" && window.electronAPI?.isElectron === true;

// ── Electron mic: WebSocket + AudioWorklet → local Whisper real-time ─────────
function useElectronMic({ onFinalText, onInterimText }) {
    const [isListening, setIsListening] = useState(false);
    const isListeningRef = useRef(false);
    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);
    const sourceRef = useRef(null);
    const processorRef = useRef(null);
    const streamRef = useRef(null);
    const autoSubmitTimerRef = useRef(null);

    const stop = useCallback(() => {
        isListeningRef.current = false;
        setIsListening(false);
        if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
        // Stop audio pipeline
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        audioCtxRef.current?.close();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        // Close WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send("stop");
            wsRef.current.close();
        }
        processorRef.current = null;
        sourceRef.current = null;
        audioCtxRef.current = null;
        streamRef.current = null;
        wsRef.current = null;
    }, []);

    const start = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
            streamRef.current = stream;

            // Open WebSocket to local Whisper server
            const ws = new WebSocket("ws://127.0.0.1:11435/ws/transcribe");
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[ElectronMic] WS connected");
            };

            ws.onmessage = (event) => {
                try {
                    const { type, text } = JSON.parse(event.data);
                    if (!text?.trim()) return;
                    if (type === "interim") {
                        onInterimText(text.trim());
                    } else if (type === "final") {
                        onInterimText("");
                        onFinalText(text.trim());
                        // Auto-submit after 2s silence
                        if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
                        autoSubmitTimerRef.current = setTimeout(() => {
                            // signal parent to submit
                            onFinalText("\x00SUBMIT");
                        }, 2000);
                    }
                } catch (_) {}
            };

            ws.onerror = (e) => console.error("[ElectronMic] WS error:", e);
            ws.onclose = () => { if (isListeningRef.current) stop(); };

            // AudioContext at 16kHz for Whisper
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            sourceRef.current = source;

            // ScriptProcessor to capture PCM16 chunks and send over WS
            const bufferSize = 4096;
            const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!isListeningRef.current || ws.readyState !== WebSocket.OPEN) return;
                const float32 = e.inputBuffer.getChannelData(0);
                // Convert float32 → int16 PCM
                const int16 = new Int16Array(float32.length);
                for (let i = 0; i < float32.length; i++) {
                    int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
                }
                ws.send(int16.buffer);
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);

            isListeningRef.current = true;
            setIsListening(true);
        } catch (err) {
            console.error("[ElectronMic] start error:", err);
            setIsListening(false);
            isListeningRef.current = false;
        }
    }, [onFinalText, onInterimText, stop]);

    return { isListening, start, stop };
}

// ── Browser mic: Web Speech API (never used in Electron) ─────────────────────
function useBrowserMic({ enabled, onFinalText, onInterimText, onAutoSubmit }) {
    const [isListening, setIsListening] = useState(false);
    const isListeningRef = useRef(false);
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;

        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (event) => {
            let final = "", interim = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            if (final) onFinalText(final.trim());
            if (interim) onInterimText(interim);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(onAutoSubmit, 2000);
        };

        rec.onerror = (e) => {
            console.error("Mic error:", e.error);
            if (e.error === "not-allowed") { setIsListening(false); isListeningRef.current = false; }
        };

        rec.onend = () => { if (isListeningRef.current) { try { rec.start(); } catch (_) {} } };

        recognitionRef.current = rec;
        try { rec.start(); setIsListening(true); isListeningRef.current = true; } catch (_) {}
        return () => { try { rec.stop(); } catch (_) {} };
    }, [enabled]);

    const toggle = useCallback(() => {
        if (!recognitionRef.current) return;
        const next = !isListening;
        setIsListening(next);
        isListeningRef.current = next;
        if (next) { try { recognitionRef.current.start(); } catch (_) {} }
        else { recognitionRef.current.stop(); if (timerRef.current) clearTimeout(timerRef.current); }
    }, [isListening]);

    return { isListening, toggle };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatInput({ showgreet, handleOnSubmit, user_name }) {
    const [message, setMessage] = useState({ text: "" });
    const [interimText, setInterimText] = useState("");
    const [files, setFiles] = useState([]);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const submitRef = useRef();
    const autoSubmitTimerRef = useRef(null);

    const submit = useCallback(() => {
        const fullText = ((message?.text || "") + interimText).trim();
        if (!fullText && files.length === 0) return;
        handleOnSubmit({ text: fullText, files });
        setMessage({ text: "" });
        setInterimText("");
        setFiles([]);
        if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    }, [message, interimText, files, handleOnSubmit]);

    useEffect(() => { submitRef.current = submit; }, [submit]);

    const handleFinalText = useCallback((text) => {
        // \x00SUBMIT is a signal from ElectronMic to auto-submit after silence
        if (text === "\x00SUBMIT") {
            submitRef.current?.();
            return;
        }
        setMessage((prev) => ({ text: prev.text ? prev.text + " " + text : text }));
        if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = setTimeout(() => submitRef.current?.(), 2000);
    }, []);

    const handleInterimText = useCallback((text) => setInterimText(text), []);
    const handleAutoSubmit = useCallback(() => submitRef.current?.(), []);

    const inElectron = isElectron();

    const electronMic = useElectronMic({ onFinalText: handleFinalText, onInterimText: handleInterimText });

    const browserMic = useBrowserMic({
        enabled: !inElectron,
        onFinalText: handleFinalText,
        onInterimText: handleInterimText,
        onAutoSubmit: handleAutoSubmit,
    });

    const isListening = inElectron ? electronMic.isListening : browserMic.isListening;

    const toggleMic = useCallback(() => {
        if (inElectron) {
            electronMic.isListening ? electronMic.stop() : electronMic.start();
        } else {
            browserMic.toggle();
        }
    }, [inElectron, electronMic, browserMic]);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, [message?.text, interimText]);

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

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    };

    const hasContent = !!(message?.text?.trim() || interimText.trim()) || files.length > 0;

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

            <div className={`bg-bg-card rounded-[28px] border shadow-lg transition-colors ${
                isListening ? "border-blue-500/50 shadow-blue-500/10" : "border-border-default focus-within:border-border-active"
            }`}>
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
                                <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full size-5 flex items-center justify-center text-xs">✕</button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="px-4 pt-4">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={(message?.text || "") + interimText}
                        onChange={(e) => { setMessage({ text: e.target.value }); setInterimText(""); }}
                        onKeyDown={handleKeyDown}
                        placeholder={isListening ? "Listening..." : "Ask me anything..."}
                        className="w-full bg-transparent text-text-primary placeholder:text-text-muted outline-none resize-none text-[16px] max-h-[200px]"
                    />
                </div>

                <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-1">
                        <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-muted hover:bg-bg-hover rounded-full transition-colors">
                            <Add24Regular />
                        </button>
                        <button
                            onClick={toggleMic}
                            title={isListening ? "Stop Listening" : "Start Voice Input"}
                            className={`p-2 rounded-full transition-colors ${isListening ? "text-blue-500 bg-blue-500/20 animate-pulse" : "text-text-muted hover:bg-bg-hover"}`}
                        >
                            {isListening ? <MicSparkle24Regular /> : <MicOff24Regular />}
                        </button>
                    </div>
                    <button
                        onClick={submit}
                        disabled={!hasContent}
                        className={`size-10 rounded-full flex items-center justify-center transition ${hasContent ? "bg-text-primary text-bg-app" : "bg-bg-hover text-text-muted"}`}
                    >
                        <ArrowUp24Regular />
                    </button>
                </div>
            </div>
        </div>
    );
}
