import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Singleton instance of the MCP client
let mcpClient: Client | null = null;

/**
 * Initializes and returns a singleton instance of the MCP client.
 * Connects to the Zapier MCP server on the first call.
 */
export const getMcpClient = async (): Promise<Client> => {
    // If the client is already initialized, return it.
    if (mcpClient) {
        return mcpClient;
    }
    
    // Hardcoded Zapier MCP server URL with a CORS proxy.
    const PROXY_URL = "https://corsproxy.io/?";
    const serverUrl = "https://mcp.zapier.com/api/mcp/s/NmJmMGM1ODMtY2U3NS00NmU5LWE3NTEtYTc1MjA5OTZjNGZmOmQ0NzQyYTcxLWEzYzEtNDlmMy1hZTZjLWE5NjZmZjYwNTQxZQ==/mcp";
    
    // Initialize the MCP client with app details.
    const client = new Client(
        { name: "foam-crm-ai-client", version: "1.0.0" },
        { capabilities: {} }
    );
    
    // Use the Streamable HTTP transport with the proxy.
    const transport = new StreamableHTTPClientTransport(new URL(PROXY_URL + serverUrl));
    
    console.log("Connecting to MCP server...");
    // Connect to the server. This can take a moment.
    await client.connect(transport);
    console.log("MCP client connected successfully.");

    // Store the initialized client for future calls.
    mcpClient = client;
    return client;
};
