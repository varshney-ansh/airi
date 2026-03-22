import AppSideBar from "@/component/appsidebar";
import { ChatProvider } from "@/context/ChatContext";
import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { encode } from 'node-base64-image';
import AppsCompo from "../../../ui-components/components/AppsCompo";

const AppsPage = async () => {
    const session = await auth0.getSession();
    const profilePicBase64 = session?.user?.picture ? await encode(session.user.picture, { string: true }) : null;

    if (!session) redirect('/login');

    return (
        <ChatProvider userId={session.user.sub}>
            <div className="h-screen bg-bg-app flex">
                <AppSideBar session={session} profilePicBase64={profilePicBase64} userId={session.user.sub} />
                <main className="flex-1 h-screen overflow-hidden relative px-1.5">
                    <div className="bg-bg-modal h-[99vh] overflow-auto rounded-md border border-border-default flex flex-col relative">
                        <AppsCompo />
                    </div>
                </main>
            </div>
        </ChatProvider>
    );
}

export default AppsPage;
