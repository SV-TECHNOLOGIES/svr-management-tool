/**
 * Local MCP server over stdio. Connects straight to the database in DATABASE_URL.
 *
 *   claude mcp add project-portal -- npx --prefix /path/to/backend ts-node src/mcp/stdio.ts
 *   (or after `npm run build`: node /path/to/backend/dist/mcp/stdio.js)
 *
 * Env: DATABASE_URL (required), MCP_ADMIN_EMAIL (admin to act as; default: first admin)
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server';

async function main() {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
  // stdout is the protocol channel; log to stderr only
  console.error('project-portal MCP server running on stdio');
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
