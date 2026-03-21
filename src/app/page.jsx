import AppSideBar from "@/component/appsidebar";
import ChatMain from "@/component/chatMain/chatMain";
import {auth0} from "@/lib/auth0";
import { redirect } from "next/navigation";
import { encode } from 'node-base64-image';

const UserDashboard = async() => {
    const session = await auth0.getSession();
    const profilePicBase64 = session?.user?.picture ? await encode(session.user.picture, { string: true }) : null;
    
    if(!session){
        redirect('/login')
    }
    
    return (
        <div className="h-screen bg-bg-app flex">
            <AppSideBar session={session} profilePicBase64={profilePicBase64} />
            <ChatMain user_name={session?.user?.given_name} userId={session?.user?.sub} />
        </div>
    )
}

export default UserDashboard;
