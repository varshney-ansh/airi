export {};

declare global {
    interface Window {
        electronAPI?: {
            openOverlay: () => void;
            getChats: (userId: string) => Promise<any[]>;
            pullChats: (userId: string) => Promise<{ success: boolean; count?: number; error?: string }>;
            saveChat: (chatData: any) => Promise<{ success: boolean; error?: string }>;
            deleteChat: (chatId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
        };
    }
}
