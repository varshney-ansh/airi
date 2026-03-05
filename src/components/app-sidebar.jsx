"use client"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {Library24Regular,AppRecent24Regular,Add24Regular, PersonSupport20Regular, Send20Regular }from "@fluentui/react-icons";
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: PersonSupport20Regular,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send20Regular,
    },
  ],
  navMain: [
    {
      title: "Chat Title",
      url: "#",
      pinState: true,
    },
    
  ],
  projects: [
    {
      name: "Library",
      url: "#",
      icon: (
        <Library24Regular />
      ),
    },
    {
      name: "Memory",
      url: "#",
      icon: (
        <AppRecent24Regular />
      ),
    },
    {
      name: "New Chat",
      url: "#",
      icon: (
        <Add24Regular />
      ),
    },
  ],
}

export function AppSidebar({
  User,
  ...props
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuItem>
          <Avatar>
            <AvatarImage src="/logo.ico" />
            <AvatarFallback>airi_logo</AvatarFallback>
          </Avatar>
        </SidebarMenuItem>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={User} />
      </SidebarFooter>
    </Sidebar>
  );
}
