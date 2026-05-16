import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { handleToolCall, listToolSchemas } from "./tools.js";

export async function startMcpServer(): Promise<void> {
  const server = new Server(
    {
      name: "md2wechat",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listToolSchemas()
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error(`[md2wechat mcp] call ${request.params.name}`);
    return await handleToolCall(request.params.name, request.params.arguments || {}) as any;
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[md2wechat mcp] server started");
}
