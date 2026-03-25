import logging
import os
from typing import List, Optional

from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.base_toolset import BaseToolset
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import (
    StdioConnectionParams,
    StdioServerParameters,
    StreamableHTTPConnectionParams,
)

logger = logging.getLogger(__name__)


class ResilientMcpToolset(BaseToolset):
    """Wraps an McpToolset so that connection failures log a warning
    instead of crashing the agent run."""

    def __init__(self, inner: McpToolset, label: str = "MCP"):
        super().__init__(
            tool_filter=inner.tool_filter,
            tool_name_prefix=inner.tool_name_prefix,
        )
        self._inner = inner
        self._label = label

    async def get_tools(
        self, readonly_context: Optional[ReadonlyContext] = None
    ) -> List[BaseTool]:
        try:
            return await self._inner.get_tools(readonly_context)
        except Exception as exc:
            logger.warning("%s unavailable, skipping its tools: %s", self._label, exc)
            return []

    async def close(self) -> None:
        try:
            await self._inner.close()
        except Exception:
            pass


all_mcps: list[BaseToolset] = []

if os.getenv("PARALLEL_API_KEY"):
    parallel_search_mcp = ResilientMcpToolset(
        McpToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://search-mcp.parallel.ai/mcp",
                headers={"Authorization": f"Bearer {os.getenv('PARALLEL_API_KEY')}"},
                timeout=600,
            ),
        ),
        label="Parallel Search MCP",
    )
    all_mcps.append(parallel_search_mcp)

docling_mcp = ResilientMcpToolset(
    McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command="uvx",
                args=["--from=docling-mcp", "docling-mcp-server"],
            ),
            timeout=120.0,
        ),
    ),
    label="Docling MCP",
)
all_mcps.append(docling_mcp)
