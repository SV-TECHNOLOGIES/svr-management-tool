import crypto from 'crypto';
import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server';
import { verifyToken } from '../utils/auth';
import { resourceMetadataUrl } from '../oauth/oauth';

/**
 * Remote MCP endpoint (Streamable HTTP, stateless — works on serverless hosts).
 * Auth: `Authorization: Bearer <MCP_API_TOKEN>` or a portal login JWT.
 */
const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

const authorize = (req: Request): { ok: boolean; adminId?: string } => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false };
  const apiToken = process.env.MCP_API_TOKEN;
  if (apiToken && safeEqual(token, apiToken)) return { ok: true };
  try {
    const decoded = verifyToken(token) as { userId: string };
    return { ok: true, adminId: decoded.userId };
  } catch {
    return { ok: false };
  }
};

export const mcpHttpHandler = async (req: Request, res: Response) => {
  const auth = authorize(req);
  if (!auth.ok) {
    // Points OAuth-capable clients (ChatGPT, Claude) at the authorization server.
    res.set('WWW-Authenticate', `Bearer resource_metadata="${resourceMetadataUrl(req)}", scope="mcp"`);
    return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null });
  }

  const server = createMcpServer({ defaultAdminId: auth.adminId });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
};
