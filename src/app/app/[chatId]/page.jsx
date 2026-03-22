import AppSideBar from "@/component/appsidebar";
import ChatMain from "@/component/chatMain/chatMain";
import { ChatProvider } from "@/context/ChatContext";
import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { encode } from 'node-base64-image';

const ChatPage = async ({ params }) => {
    const { chatId } = await params;
    const session = await auth0.getSession();
    const profilePicBase64 = session?.user?.picture ? await encode(session.user.picture, { string: true }) : null;

    if (!session) redirect('/login');

    return (
        <ChatProvider userId={session.user.sub}>
            <div className="h-screen bg-bg-app flex">
                <AppSideBar session={session} profilePicBase64={profilePicBase64} userId={session.user.sub} />
                <ChatMain
                    user_name={session?.user?.given_name}
                    userId={session?.user?.sub}
                    chatId={chatId}
                />
            </div>
        </ChatProvider>
    );
}

export default ChatPage;
