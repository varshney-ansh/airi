'use client'
import { useState } from "react";
import AppsSection from "./appsSection/AppsSection";
import AppDetailCompo from "./appsSection/AppDetailCompo";

export const SUPPORTED_APPS = [
  {
    name: "Gmail",
    shortDes: "Send, receive and manage emails easily",
    icon: "https://www.google.com/a/cpanel/images/favicon.ico",
    longDes:
      "Gmail lets you send, receive, organize and search emails efficiently. Manage labels, attachments, filters, and inbox categories directly from ChatGPT.",
    category: "Productivity",
    capabilities: ["Read Emails", "Send Emails", "Search Inbox"],
    developer: "Google LLC",
    websitelink: "https://mail.google.com",
    version: "2.3.1",
    privacyPolicy: "https://policies.google.com/privacy",
  },
  {
    name: "Google Calendar",
    shortDes: "Schedule meetings and reminders",
    icon: "https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_21.ico",
    longDes:
      "Google Calendar helps you schedule events, set reminders, manage meetings, and coordinate schedules seamlessly with ChatGPT integration.",
    category: "Productivity",
    capabilities: ["Create Events", "Edit Events", "View Schedule"],
    developer: "Google LLC",
    websitelink: "https://calendar.google.com",
    version: "4.1.0",
    privacyPolicy: "https://policies.google.com/privacy",
  },
  {
    name: "Slack",
    shortDes: "Team communication simplified",
    icon: "https://a.slack-edge.com/e6a93c1/img/icons/favicon-32.png",
    longDes:
      "Slack allows you to send messages, manage channels, collaborate with teams, and automate workflows directly from ChatGPT.",
    category: "Work",
    capabilities: ["Send Messages", "Read Channels", "Manage Threads"],
    developer: "Slack Technologies",
    websitelink: "https://slack.com",
    version: "5.0.2",
    privacyPolicy: "https://slack.com/privacy-policy",
  },
  {
    name: "Notion",
    shortDes: "All-in-one workspace for notes & tasks",
    icon: "https://www.notion.com/front-static/favicon.ico",
    longDes:
      "Notion helps you create notes, manage tasks, organize databases, and collaborate on documents inside ChatGPT conversations.",
    category: "Productivity",
    capabilities: ["Create Pages", "Edit Notes", "Manage Databases"],
    developer: "Notion Labs Inc.",
    websitelink: "https://notion.so",
    version: "3.2.4",
    privacyPolicy: "https://www.notion.so/privacy",
  },
  {
    name: "Trello",
    shortDes: "Organize projects with boards",
    icon: "https://bxp-content-static.prod.public.atl-paas.net/img/favicon.ico",
    longDes:
      "Trello allows you to manage projects with boards, lists, and cards. Track tasks and collaborate with your team easily.",
    category: "Work",
    capabilities: ["Create Cards", "Move Tasks", "Track Progress"],
    developer: "Atlassian",
    websitelink: "https://trello.com",
    version: "2.8.0",
    privacyPolicy: "https://www.atlassian.com/legal/privacy-policy",
  },
  {
    name: "Dropbox",
    shortDes: "Cloud file storage and sharing",
    icon: "https://cfl.dropboxstatic.com/static/metaserver/static/images/favicon.ico",
    longDes:
      "Dropbox lets you upload, manage, share, and organize files securely in the cloud directly through ChatGPT.",
    category: "Work",
    capabilities: ["Upload Files", "Share Files", "Manage Folders"],
    developer: "Dropbox Inc.",
    websitelink: "https://dropbox.com",
    version: "6.0.3",
    privacyPolicy: "https://www.dropbox.com/privacy",
  },
  {
    name: "Zoom",
    shortDes: "Video meetings and collaboration",
    icon: "https://us01st-cf.zoom.us/homepage/20260312-1055/backup/dist/assets/images/zoom.ico",
    longDes:
      "Zoom integration allows you to schedule meetings, generate join links, and manage virtual conferences from ChatGPT.",
    category: "Work",
    capabilities: ["Schedule Meetings", "Generate Links", "Manage Calls"],
    developer: "Zoom Video Communications",
    websitelink: "https://zoom.us",
    version: "5.15.1",
    privacyPolicy: "https://zoom.us/privacy",
  },
  {
    name: "GitHub",
    shortDes: "Manage repositories and code",
    icon: "https://github.githubassets.com/favicons/favicon-dark.svg",
    longDes:
      "GitHub integration helps you manage repositories, create issues, track pull requests, and monitor code changes directly from ChatGPT.",
    category: "Work",
    capabilities: ["Create Issues", "Manage PRs", "Read Repos"],
    developer: "GitHub Inc.",
    websitelink: "https://github.com",
    version: "3.9.0",
    privacyPolicy:
      "https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement",
  },
  {
    name: "Spotify",
    shortDes: "Stream and manage music",
    icon: "https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico",
    longDes:
      "Spotify lets you search tracks, manage playlists, control playback, and discover new music inside ChatGPT.",
    category: "Entertainment",
    capabilities: ["Play Music", "Create Playlist", "Search Songs"],
    developer: "Spotify AB",
    websitelink: "https://spotify.com",
    version: "8.9.2",
    privacyPolicy: "https://www.spotify.com/privacy",
  },
  {
    name: "Canva",
    shortDes: "Create designs and social posts",
    icon: "https://static.canva.com/domain-assets/canva-india/static/images/favicon-1.ico",
    longDes:
      "Canva integration allows you to generate social media posts, presentations, flyers, and visual content using ChatGPT prompts.",
    category: "Productivity",
    capabilities: ["Create Designs", "Edit Templates", "Export Graphics"],
    developer: "Canva Pty Ltd",
    websitelink: "https://canva.com",
    version: "4.4.0",
    privacyPolicy: "https://www.canva.com/policies/privacy-policy/",
  },
];

export default function AppsCompo() {
  const [selectedApp, setSelectedApp] = useState(null);
  return (
    <div className="h-full bg-bg-app text-text-primary">
      {!selectedApp ? (
        <AppsSection onSelect={setSelectedApp} appsList={SUPPORTED_APPS} />
      ) : (
        <AppDetailCompo app={selectedApp} onBack={() => setSelectedApp(null)} />
      )}
    </div>
  );
}