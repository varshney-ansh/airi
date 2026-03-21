import { auth0 } from "@/lib/auth0";
import LoginDetailForm from "../../../../ui-components/components/LoginDetailForm";

const OnboardPage = async () => {
    const session = await auth0.getSession();
    return (
        <LoginDetailForm session={session} />
    )
}

export default OnboardPage;