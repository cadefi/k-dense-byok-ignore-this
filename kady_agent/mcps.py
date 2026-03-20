import os

from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import (
    StdioConnectionParams,
    StdioServerParameters,
    StreamableHTTPConnectionParams,
)

all_mcps = []

if os.getenv("PARALLEL_API_KEY"):
    parallel_search_mcp = McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url="https://search-mcp.parallel.ai/mcp",
            headers={"Authorization": f"Bearer {os.getenv('PARALLEL_API_KEY')}"},
            timeout=600,
        ),
    )
    all_mcps.append(parallel_search_mcp)

docling_mcp = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command="uvx",
            args=["--from=docling-mcp", "docling-mcp-server"],
        ),
        timeout=120.0,
    ),
)
all_mcps.append(docling_mcp)
