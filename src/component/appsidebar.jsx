"use client"

import { clsx } from "clsx";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ChatItem from "./chatItem/chatItem";
import { SettingsModal } from "../../ui-components/components/SettingModal";
import { useChatContext } from "@/context/ChatContext";
import { Apps24Regular } from "@fluentui/react-icons";

const AppSideBar = ({ session, profilePicBase64, userId }) => {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { chats, removeChat } = useChatContext();
    const router = useRouter();

    const handleDeleteChat = async (chatId) => {
        if (typeof window === "undefined" || !window.electronAPI) return;
        await window.electronAPI.deleteChat(chatId, userId);
        removeChat(chatId);
    };
    return (
        <>
            <div className={clsx("fixed inset-y-0 left-0 z-50 bg-bg-card", "transition-transform duration-300 ease-in-out", "data-[state=close]:-translate-x-full data-[state=open]:translate-x-0", "w-[256px]", "md:relative md:data-[state=close]:translate-x-0 md:transition-all", "md:data-[state=open]:w-[256px] md:data-[state=close]:w-13", "h-screen overflow-hidden group")} data-state="open" id="sidebar">
                <div className="w-full max-w-[256px] px-1 pb-0.5 pt-4 select-none">
                    <div className="flex justify-between items-center group-data-[state=close]:flex-col group-data-[state=close]:gap-2 group-data-[state=close]:items-start">
                        <h1 className="font-medium text-text-primary text-[20px] outline-offset-1 pl-2.5">Airi</h1>
                        <div onClick={() => { const sidebar = document.getElementById("sidebar"); const newState = sidebar.getAttribute('data-state') === 'open' ? 'close' : 'open'; sidebar.setAttribute('data-state', newState); }} className="text-[14px] outline-offset-1 flex items-center justify-center hover:bg-bg-hover transition-all duration-100 cursor-pointer bg-transparent text-text-muted font-medium w-9 h-9 rounded-lg">
                            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-5"><path d="M3.75 8.5C3.75 8.08579 4.08579 7.75 4.5 7.75H5.75C6.16421 7.75 6.5 8.08579 6.5 8.5C6.5 8.91421 6.16421 9.25 5.75 9.25H4.5C4.08579 9.25 3.75 8.91421 3.75 8.5ZM3.75 12C3.75 11.5858 4.08579 11.25 4.5 11.25H5.75C6.16421 11.25 6.5 11.5858 6.5 12C6.5 12.4142 6.16421 12.75 5.75 12.75H4.5C4.08579 12.75 3.75 12.4142 3.75 12ZM3.75 15.5C3.75 15.0858 4.08579 14.75 4.5 14.75H5.75C6.16421 14.75 6.5 15.0858 6.5 15.5C6.5 15.9142 6.16421 16.25 5.75 16.25H4.5C4.08579 16.25 3.75 15.9142 3.75 15.5ZM4.25 3C2.45507 3 1 4.45507 1 6.25V17.75C1 19.5449 2.45508 21 4.25 21H19.75C21.5449 21 23 19.5449 23 17.75V6.25C23 4.45507 21.5449 3 19.75 3H4.25ZM19.75 19.5H9V4.5H19.75C20.7165 4.5 21.5 5.2835 21.5 6.25V17.75C21.5 18.7165 20.7165 19.5 19.75 19.5ZM4.25 4.5H7.5V19.5H4.25C3.2835 19.5 2.5 18.7165 2.5 17.75V6.25C2.5 5.2835 3.2835 4.5 4.25 4.5Z"></path></svg>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 pt-1 items-center group-data-[state=close]:items-start">
                        <button onClick={() => router.push(`/app/${crypto.randomUUID()}`)} className="group-data-[state=close]:w-9 group-data-[state=close]:h-9 flex w-full gap-2 h-10 items-center px-2 py-1.5 rounded-xl hover:bg-bg-hover cursor-pointer transition-all duration-100 ease-in-out">
                            <span className="text-text-primary"><svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-5"><path d="M21.7803 3.28033C22.0732 2.98744 22.0732 2.51256 21.7803 2.21967C21.4874 1.92678 21.0125 1.92678 20.7196 2.21967L10.7197 12.2197L10.25 13.75L11.7803 13.2803L21.7803 3.28033ZM6.25 3C4.45507 3 3 4.45508 3 6.25V17.75C3 19.5449 4.45507 21 6.25 21H17.75C19.5449 21 21 19.5449 21 17.75V9.75C21 9.33579 20.6642 9 20.25 9C19.8358 9 19.5 9.33579 19.5 9.75V17.75C19.5 18.7165 18.7165 19.5 17.75 19.5H6.25C5.2835 19.5 4.5 18.7165 4.5 17.75V6.25C4.5 5.2835 5.2835 4.5 6.25 4.5H14.25C14.6642 4.5 15 4.16421 15 3.75C15 3.33579 14.6642 3 14.25 3H6.25Z"></path></svg></span>
                            <span className="group-data-[state=close]:hidden flex min-h-6 w-full font-medium items-center gap-1.5 text-start text-[14px] text-text-primary">New chat</span>
                        </button>
                        <button onClick={() => router.push('/apps')} className="group-data-[state=close]:w-9 group-data-[state=close]:h-9 flex w-full gap-2 h-10 items-center px-2 py-1.5 rounded-xl hover:bg-bg-hover cursor-pointer transition-all duration-100 ease-in-out">
                            <Apps24Regular />
                            <span className="group-data-[state=close]:hidden flex min-h-6 w-full font-medium items-center gap-1.5 text-start text-[14px] text-text-primary">Apps</span>
                        </button>
                        <button className="group-data-[state=close]:w-9 group-data-[state=close]:h-9 flex w-full gap-2 h-10 items-center px-2 py-1.5 rounded-xl hover:bg-bg-hover cursor-pointer transition-all duration-100 ease-in-out">
                            <span className="text-text-primary">
                                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.0656 8.00389L11.25 7.99875H18.75C20.483 7.99875 21.8992 9.3552 21.9949 11.0643L22 11.2487V18.7487C22 20.4818 20.6435 21.898 18.9344 21.9936L18.75 21.9987H11.25C9.51697 21.9987 8.10075 20.6423 8.00515 18.9332L8 18.7487V11.2487C8 9.51571 9.35646 8.0995 11.0656 8.00389ZM18.75 9.49875H11.25C10.3318 9.49875 9.57881 10.2059 9.5058 11.1052L9.5 11.2487V18.7487C9.5 19.6669 10.2071 20.4199 11.1065 20.4929L11.25 20.4987H18.75C19.6682 20.4987 20.4212 19.7916 20.4942 18.8923L20.5 18.7487V11.2487C20.5 10.2822 19.7165 9.49875 18.75 9.49875ZM15.5818 4.23284L15.6345 4.40964L16.327 6.998H14.774L14.1856 4.79787C13.9355 3.86431 12.9759 3.31029 12.0423 3.56044L4.79787 5.50158C3.91344 5.73856 3.36966 6.61227 3.52756 7.49737L3.56044 7.64488L5.50158 14.8893C5.69372 15.6064 6.30445 16.0996 7.00045 16.1764L7.00056 17.6816C5.69932 17.6051 4.52962 16.7445 4.10539 15.4544L4.05269 15.2776L2.11155 8.03311C1.66301 6.35913 2.6067 4.6401 4.23284 4.10539L4.40964 4.05269L11.6541 2.11155C13.3281 1.66301 15.0471 2.6067 15.5818 4.23284Z"></path></svg>
                            </span>
                            <span className="group-data-[state=close]:hidden flex min-h-6 w-full font-medium items-center gap-1.5 text-start text-[14px] text-text-primary">Library</span>
                        </button>
                        <button className="group-data-[state=close]:w-9 group-data-[state=close]:h-9 flex w-full gap-2 h-10 items-center px-2 py-1.5 rounded-xl hover:bg-bg-hover cursor-pointer transition-all duration-100 ease-in-out">
                            <span className="text-text-primary">
                                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-5"><path d="M2 5.25C2 3.45507 3.45507 2 5.25 2H14.75C16.5449 2 18 3.45507 18 5.25V8H16.5V5.25C16.5 4.2835 15.7165 3.5 14.75 3.5H5.25C4.2835 3.5 3.5 4.2835 3.5 5.25V12.75C3.5 13.7165 4.2835 14.5 5.25 14.5H8V16H5.25C3.45507 16 2 14.5449 2 12.75V5.25ZM19 13.25C19 13.9404 18.4404 14.5 17.75 14.5C17.0596 14.5 16.5 13.9404 16.5 13.25C16.5 12.5596 17.0596 12 17.75 12C18.4404 12 19 12.5596 19 13.25ZM9 12.25C9 10.4551 10.4551 9 12.25 9H18.75C20.5449 9 22 10.4551 22 12.25V18.75C22 20.5449 20.5449 22 18.75 22H12.25C10.4551 22 9 20.5449 9 18.75V12.25ZM12.25 10.5C11.2835 10.5 10.5 11.2835 10.5 12.25V18.75C10.5 18.9393 10.5301 19.1216 10.5856 19.2923L13.98 16.1069C14.845 15.2977 16.1892 15.2977 17.0542 16.1069L20.4246 19.2598C20.4736 19.0985 20.5 18.9273 20.5 18.75V12.25C20.5 11.2835 19.7165 10.5 18.75 10.5H12.25ZM12.25 20.5H18.75C18.9854 20.5 19.2099 20.4535 19.4149 20.3693L16.0295 17.2023C15.7411 16.9326 15.2931 16.9326 15.0047 17.2023L11.6167 20.3819C11.8131 20.4582 12.0267 20.5 12.25 20.5ZM5.75 5C6.16421 5 6.5 5.33579 6.5 5.75V6.25C6.5 6.66421 6.16421 7 5.75 7C5.33579 7 5 6.66421 5 6.25V5.75C5 5.33579 5.33579 5 5.75 5ZM6.5 8.75C6.5 8.33579 6.16421 8 5.75 8C5.33579 8 5 8.33579 5 8.75V9.25C5 9.66421 5.33579 10 5.75 10C6.16421 10 6.5 9.66421 6.5 9.25V8.75ZM14.25 5C14.6642 5 15 5.33579 15 5.75V6.25C15 6.66421 14.6642 7 14.25 7C13.8358 7 13.5 6.66421 13.5 6.25V5.75C13.5 5.33579 13.8358 5 14.25 5ZM6.5 11.75C6.5 11.3358 6.16421 11 5.75 11C5.33579 11 5 11.3358 5 11.75V12.25C5 12.6642 5.33579 13 5.75 13C6.16421 13 6.5 12.6642 6.5 12.25V11.75Z"></path></svg>
                            </span>
                            <span className="group-data-[state=close]:hidden flex min-h-6 w-full font-medium items-center gap-1.5 text-start text-[14px] text-text-primary">Memory</span>
                        </button>
                    </div>
                    <div className="h-6 rounded-xl py-3 w-full px-2 group-data-[state=close]:hidden"><div className="h-0 border-t border-border-default"></div></div>
                    {/* chats */}
                    <div className="group-data-[state=close]:hidden overflow-y-auto max-h-[calc(100vh-280px)]">
                        {!session && (
                            <p className="px-2.5 pb-6 font-medium text-text-muted text-[14px]">Sign in to save our conversations.</p>
                        )}
                        {session && chats.map((chat) => (
                            <ChatItem
                                key={chat.chatId}
                                chat={chat}
                                onClick={() => router.push(`/app/${chat.chatId}`)}
                                onDelete={() => handleDeleteChat(chat.chatId)}
                            />
                        ))}
                        {session && chats.length === 0 && (
                            <p className="px-2.5 pb-6 font-medium text-text-muted text-[14px]">No conversations yet.</p>
                        )}
                    </div>
                    {/* account */}
                    <div className="absolute bottom-2 w-full max-w-[256px]">
                        {!session && (
                            <button onClick={() => window.location.href = "/login"} className="group-data-[state=close]:w-9 group-data-[state=close]:h-9 flex w-full gap-2 h-10 items-center px-1.5 py-1.5 rounded-xl hover:bg-bg-hover cursor-pointer transition-all duration-100 ease-in-out">
                                <span className="text-text-primary">
                                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-6 shrink-0"><path d="M17.7545 14.0002C18.9966 14.0002 20.0034 15.007 20.0034 16.2491V16.8245C20.0034 17.7188 19.6838 18.5836 19.1023 19.263C17.5329 21.0965 15.1457 22.0013 12.0004 22.0013C8.8545 22.0013 6.46849 21.0962 4.90219 19.2619C4.32242 18.583 4.00391 17.7195 4.00391 16.8267V16.2491C4.00391 15.007 5.01076 14.0002 6.25278 14.0002H17.7545ZM17.7545 15.5002H6.25278C5.83919 15.5002 5.50391 15.8355 5.50391 16.2491V16.8267C5.50391 17.3624 5.69502 17.8805 6.04287 18.2878C7.29618 19.7555 9.26206 20.5013 12.0004 20.5013C14.7387 20.5013 16.7063 19.7555 17.9627 18.2876C18.3117 17.8799 18.5034 17.361 18.5034 16.8245V16.2491C18.5034 15.8355 18.1681 15.5002 17.7545 15.5002ZM12.0004 2.00488C14.7618 2.00488 17.0004 4.24346 17.0004 7.00488C17.0004 9.76631 14.7618 12.0049 12.0004 12.0049C9.23894 12.0049 7.00036 9.76631 7.00036 7.00488C7.00036 4.24346 9.23894 2.00488 12.0004 2.00488ZM12.0004 3.50488C10.0674 3.50488 8.50036 5.07189 8.50036 7.00488C8.50036 8.93788 10.0674 10.5049 12.0004 10.5049C13.9334 10.5049 15.5004 8.93788 15.5004 7.00488C15.5004 5.07189 13.9334 3.50488 12.0004 3.50488Z"></path></svg>
                                </span>
                                <span className="group-data-[state=close]:hidden flex min-h-6 w-full font-medium items-center gap-1.5 text-start text-[14px] text-text-primary">Sign in</span>
                            </button>
                        )}
                        {session && (
                            <div className="relative">
                                <button
                                    popoverTarget="profilemenu"
                                    style={{ anchorName: "--profile-anchor" }}
                                    className="group-data-[state=close]:w-9 group-data-[state=close]:h-9 flex w-full gap-2 h-10 items-center px-1.5 py-1.5 rounded-xl hover:bg-bg-hover cursor-pointer transition-all duration-100 ease-in-out"
                                >
                                    <img className="size-6 rounded-full" src={`data://image/png;base64,${profilePicBase64 || session.user.picture}`} alt="profile-dp" />
                                    <span className="group-data-[state=close]:hidden flex min-h-6 w-full font-medium items-center gap-1.5 text-start text-[15px] truncate text-text-primary">
                                        {session.user.name}
                                    </span>
                                </button>
                                <div
                                    popover="auto"
                                    id="profilemenu"
                                    style={{ positionAnchor: "--profile-anchor" }}
                                    className="popover-content p-1 bg-bg-modal border border-border-default rounded-xl shadow-2xl text-text-primary min-w-69"
                                >
                                    <button onClick={() => setSettingsOpen(true)} className="font-medium cursor-pointer flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] hover:bg-bg-hover transition-all duration-100">
                                        Settings
                                    </button>
                                    <button onClick={() => window.location.href = "/auth/logout"} className="font-medium cursor-pointer flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] hover:bg-bg-hover transition-all duration-100">
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {settingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center sm:p-6" onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}>
                    <SettingsModal onClose={() => setSettingsOpen(false)} name={session.user.name} email={session.user.email} />
                </div>
            )}
        </>
    )
}

export default AppSideBar;
