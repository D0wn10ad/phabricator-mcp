import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';

export function registerFileTools(server: McpServer, client: ConduitClient) {
  // Upload a file
  server.tool(
    'phabricator_file_upload',
    'Upload a file to Phabricator. Returns a file ID that can be embedded in task descriptions, comments, or diff comments using Remarkup syntax {F<id>}.',
    {
      name: z.string().describe('Filename with extension (e.g. "screenshot.png")'),
      data_base64: z.string().describe('Base64-encoded file content'),
      viewPolicy: z.string().optional().describe('View policy PHID (default: uploading user)'),
    },
    async (params) => {
      const result = await client.call<{ phid: string; id: number; name: string; uri: string }>('file.upload', {
        name: params.name,
        data_base64: params.data_base64,
        viewPolicy: params.viewPolicy,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
