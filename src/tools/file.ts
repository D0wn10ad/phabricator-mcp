import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerFileTools(server: McpServer, client: ConduitClient) {
  // Upload a file
  server.tool(
    'phabricator_file_upload',
    'Upload a file to Phabricator. Returns a file PHID that can be used with phabricator_file_info to get the file ID for embedding in Remarkup via {F<id>}.',
    {
      name: z.string().describe('Filename with extension (e.g. "screenshot.png")'),
      data_base64: z.string().describe('Base64-encoded file content'),
    },
    async (params) => {
      const phid = await client.call<string>('file.upload', {
        name: params.name,
        data_base64: params.data_base64,
      });
      return { content: [{ type: 'text', text: phid }] };
    },
  );

  // Search files
  server.tool(
    'phabricator_file_search',
    'Search for files in Phabricator',
    {
      queryKey: z.string().optional().describe('Built-in query: "all", "authored"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('File IDs'),
        phids: z.array(z.string()).optional().describe('File PHIDs'),
        authorPHIDs: z.array(z.string()).optional().describe('Author PHIDs'),
        names: z.array(z.string()).optional().describe('File names'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        content: z.boolean().optional().describe('Include file content (for small text files)'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('file.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Get file info
  server.tool(
    'phabricator_file_info',
    'Get metadata about a file (name, size, MIME type, URI). Use the returned URI to download. Provide at least one of id or phid. Uses file.info (the only Conduit method that returns download URIs).',
    {
      id: z.coerce.number().optional().describe('File ID (provide this or phid)'),
      phid: z.string().optional().describe('File PHID (provide this or id)'),
    },
    async (params) => {
      const result = await client.call('file.info', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
