import { SummarizerManager } from "node-summarizer";
const MIN_LENGTH = 100;

export async function POST(request) {
    try {
        const { text } = await request.json();
        if (!text || text.length < MIN_LENGTH) {
            return Response.json({ title: text?.slice(0, 60) || "New Chat" });
        }
        
        const summarizer = new SummarizerManager(text, 1);
        const result = await summarizer.getSummaryByRank();
        const sentence = result?.summary?.trim() || text.slice(0, 60);
        const title = sentence.length > 60 ? sentence.slice(0, 57) + "..." : sentence;
        return Response.json({ title });
    } catch (err) {
        console.error("[summarize]", err.message);
        return Response.json({ title: "New Chat" });
    }
}
