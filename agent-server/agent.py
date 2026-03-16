from strands import Agent
from strands.models.llamacpp import LlamaCppModel
from strands_tools import calculator
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from mcp.client.streamable_http import streamablehttp_client
from strands.tools.mcp import MCPClient
from contextlib import ExitStack
import os
os.environ["OTEL_SDK_DISABLED"] = "true"

app = BedrockAgentCoreApp()

# 1. Define multiple MCP server URLs
MCP_SERVER_URLS = [
    "http://127.0.0.1:11441/mcp/",
    "http://127.0.0.1:11442/mcp/"
]

def create_transport_factory(url):
    return lambda: streamablehttp_client(url)

model = LlamaCppModel(
    base_url="http://127.0.0.1:11434",
    model_id="default",
    timeout=120.0,
    params={
        "repeat_penalty": 1.0,
        "temperature": 0.2,
        "stream": True
    }
)

SYSTEM_PROMPT = """
You are Airi, a desktop AI assistant created by the Slew team (Ansh, Anjali, Aditya, Harsh). Your objective is to execute local PC tasks safely and accurately.

# CORE DIRECTIVES
1. **TOOLS ARE MANDATORY:** You cannot interact with the PC without tools. NEVER hallucinate, guess, or simulate tool outputs.
2. **ONE AT A TIME:** Call exactly ONE tool per response. You MUST stop generating and wait for the system observation before proceeding.
3. **SAFETY PROTOCOL:** Ask for explicit user confirmation before any destructive action (e.g., deleting files, shutting down). Do not expose sensitive system data.
4. **COMMUNICATION:** Be exceptionally concise. Output the final result immediately. If a task fails, briefly state why and provide one alternative.

# EXECUTION LOOP
Analyze Intent → Select Tool → Execute → Wait for Result → Provide Final Answer.
"""

# Initialize agent globally
agent = None
# Create the list of clients
mcp_clients = [MCPClient(create_transport_factory(url)) for url in MCP_SERVER_URLS]
mcp_tools = []

def initialize_agent():
    """Initialize Agent with MCP and built-in tools using Managed Integration"""
    global agent
    try:
        agent = Agent(
            model=model, 
            tools=[calculator] + mcp_tools, 
            system_prompt=SYSTEM_PROMPT
        )
        print("Agent initialized successfully with calculator and Windows MCP tools.")
    except Exception as e:
        print(f"Error initializing Agent: {e}")

@app.entrypoint
async def invoke(payload):
    """Handler for agent invocation"""
    with ExitStack() as stack:
        for client in mcp_clients:
            stack.enter_context(client)
        try:
            global agent
            # Initialize agent on first request
            if agent is None:
                print("Initializing agent on first request...")
                for client in mcp_clients:
                    try:
                        # Fetch tools while contexts are safely open
                        mcp_tools.extend(client.list_tools_sync())
                    except Exception as client_err:
                        print(f"Failed to fetch tools from a client: {client_err}")
                initialize_agent()
                
            print(f"Processing request with payload: {payload}")
            input_text = payload.get("prompt")
            chatId = payload.get("chatId")
            userId = payload.get("userId")

            # Validate required payload fields
            missing = [f for f, v in [("prompt", input_text), ("chatId", chatId), ("userId", userId)] if not v]
            if missing:
                yield {"error": f"Missing required field(s): {', '.join(missing)}"}
                return
            
            print(f"Processing prompt: {input_text}")
            
            try:
                # Use stream_async or stream depending on library version
                if hasattr(agent, 'stream_async'):
                    stream = agent.stream_async(input_text)
                    try:
                        async for event in stream:
                            print(f"Event: {event}")
                            yield event
                    finally:
                        # Ensures proper OpenTelemetry cleanup if generator exits early
                        await stream.aclose()
                        
                elif hasattr(agent, 'stream'):
                    stream = agent.stream(input_text)
                    try:
                        for event in stream:
                            print(f"Event: {event}")
                            yield event
                    finally:
                        # Ensures proper OpenTelemetry cleanup if generator exits early
                        stream.close()
                        
                else:
                    result = await agent.invoke(input_text) if hasattr(agent.invoke, '__call__') else agent(input_text)
                    yield {"response": result}
                    
            except Exception as stream_error:
                print(f"Error during streaming: {stream_error}")
                yield {"error": f"Failed to process prompt: {str(stream_error)}"}

        except Exception as e:
            print(f"Error in invoke handler: {e}")
            yield {"error": f"Server error: {str(e)}"}

# main loop for agent runtime
if __name__ == "__main__":
    print("Starting agent server on http://127.0.0.1:11435")
    app.run(host='127.0.0.1', port=11435)