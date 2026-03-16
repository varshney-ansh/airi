import urllib.parse
import asyncio
from pyppeteer import launch
from mcp.server import FastMCP

# 1. Initialize Server
mcp = FastMCP("Browser Search MCP", host="127.0.0.1", port=11442)

# 3. Smart Web Scraper Tool
# FEATURE 3 IMPLEMENTED: Short, strict description so AI knows exactly when to call it.
@mcp.tool(description="get info by searching online")
async def browser_search(queries: list[str]): # FEATURE 1 IMPLEMENTED: Accepts list of subqueries
    
    # Launch browser
    browser = await launch(
        headless=False,
        executablePath=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    )

    all_search_results = []

    # STEP 1: Search all subqueries on DuckDuckGo
    for query in queries:
        page = await browser.newPage()
        encoded = urllib.parse.quote(query)
        search_url = f"https://duckduckgo.com/?q={encoded}"

        await page.goto(search_url, {"waitUntil": "domcontentloaded"})
        await asyncio.sleep(2)

        results = await page.evaluate("""
        () => {
            const data = [];
            const items = document.querySelectorAll('[data-testid="result"]');

            items.forEach((el, index) => {
                const title = el.querySelector("h2")?.innerText || "";
                const link = el.querySelector("a")?.href || "";
                const description = el.querySelector('[data-result="snippet"]')?.innerText || "";

                if (link) {
                    data.push({ position: index + 1, title, link, description });
                }
            });

            return data.slice(0, 2); // Get top 2 links per subquery
        }
        """)

        for r in results:
            r['original_query'] = query
            all_search_results.append(r)
            
        await page.close()

    seen_texts = set()

    # STEP 2: Smart Scrape with Strict UI Limits
    async def scrape_page(item):
        content = ""
        query_words = item['original_query'].lower().split()
        
        try:
            new_page = await browser.newPage()
            await new_page.goto(item["link"], {"waitUntil": "domcontentloaded"})
            await asyncio.sleep(2)

            # Fetch paragraphs, lists, and headings to handle all types of data
            page_elements = await new_page.evaluate("""
                () => {
                    return Array.from(document.querySelectorAll('p, li, h2, h3'))
                        .map(el => el.innerText.trim())
                        .filter(text => text.length > 30); // Ignore tiny useless UI words
                }
            """)

            relevant_chunks = []
            other_chunks = []
            
            # Separate matching data vs other data, avoid duplicates
            for text in page_elements:
                if text not in seen_texts:
                    seen_texts.add(text)
                    if any(word in text.lower() for word in query_words):
                        relevant_chunks.append(text)
                    else:
                        other_chunks.append(text)

            # Prioritize relevant data (put it at the front of the string)
            combined_text = " | ".join(relevant_chunks + other_chunks)
            
            # FEATURE 2 IMPLEMENTED: Strict limit so UI never crashes
            max_chars = 800
            if len(combined_text) > max_chars:
                content = combined_text[:max_chars] + "... [TRUNCATED]"
            else:
                content = combined_text

            await new_page.close()

        except Exception:
            # Fallback if site blocks scraping
            content = item["description"] 

        return {
            "subquery": item["original_query"],
            "title": item["title"],
            "link": item["link"],
            "content": content
        }

    # STEP 3: Run all scrapes at the same time for max speed
    final_results = await asyncio.gather(
        *[scrape_page(item) for item in all_search_results]
    )

    await browser.close()

    return {
        "status": "Success",
        "total_queries": len(queries),
        "results": final_results
    }

@mcp.tool(description="access given link and scrap full text content.")
async def link_scrap(url: str):
    
    browser = await launch(
        headless=False,
        executablePath=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    )
    
    try:
        page = await browser.newPage()
        await page.goto(url, {"waitUntil": "domcontentloaded"})
        
        # Pura page theek se render hone ke liye 3 second wait
        await asyncio.sleep(3)

        # Smart DOM Cleaning Logic
        page_content = await page.evaluate("""
            () => {
                // STEP 1: Saare aaltu-faltu tags (kachra) ko page se completely delete kar do
                const junkSelectors = [
                    'nav', 'footer', 'header', 'aside', 'script', 'style', 'noscript', 
                    'iframe', '.ad', '.ads', '.menu', '.sidebar', '[role="navigation"]', '#comments'
                ];
                
                junkSelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                });
                
                // STEP 2: Ab page pe sirf main content bacha hai. Uska arranged text utha lo.
                // innerText use karne se paragraphs aur headings ka natural arrangement maintain rehta hai.
                let cleanText = document.body.innerText;
                
                // STEP 3: Agar beech mein bohot saari khali lines (empty spaces) hain, toh unhe clean kar do taaki UI smooth rahe
                cleanText = cleanText.replace(/\\n{3,}/g, '\\n\\n').trim();
                
                return cleanText;
            }
        """)
        
        await browser.close()
        
        return {
            "status": "Success",
            "url": url,
            "data_type": "Full Page Content", 
            "content": page_content
        }
        
    except Exception as e:
        await browser.close()
        return {
            "status": "Failed",
            "url": url,
            "error": str(e)
        }

# 4. Run the Server
if __name__ == "__main__":
    print("Starting Browser Search MCP on http://127.0.0.1:11442")
    mcp.run(transport="streamable-http")