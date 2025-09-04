import os
import sys
import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp.client.streamable_http import streamablehttp_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("ai-agent")

mcp_one = MCPClient(lambda: streamablehttp_client(f"http://{os.environ.get('MCP_SERVICE_ONE_NAME')}:{os.environ.get('MCP_SERVICE_ONE_PORT')}/mcp"))
mcp_two = MCPClient(lambda: streamablehttp_client(f"http://{os.environ.get('MCP_SERVICE_TWO_NAME')}:{os.environ.get('MCP_SERVICE_TWO_PORT')}/mcp"))

agent = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    mcp_one.start()
    mcp_two.start()
        
    tools = mcp_one.list_tools_sync() + mcp_two.list_tools_sync()

    agent["default"] = Agent(
        system_prompt=
        "You are an helpful agent, do not rely on your knowledge to answer users queries, only use the tools to perform the required action. " \
        "If the provided tools cannot solve the user request, " \
        "simply reply by saying: 'I cannot help with this request'",
        tools=tools,
    )
    logger.info("Agent initialized")
    yield
    logger.info("Agent destroyed")
    mcp_one.stop()
    mcp_two.stop()

app = FastAPI(lifespan=lifespan)


@app.get("/")
def read_root():
    logger.info("health check route")

    return {"Hello": "World"}

class ChatRequest(BaseModel):
    prompt: str

@app.post("/chat/")
def chat_request(request: ChatRequest):
    logger.info("chat route")

    return { "answer": str(agent["default"](request.prompt)) }

# Add this to start the server
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
