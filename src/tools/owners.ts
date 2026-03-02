import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerOwnersTools(server: McpServer, client: ConduitClient) {
  // Search code ownership packages
  server.tool(
    'phabricator_owners_search',
    'Search Owners packages (code ownership). Find who owns a code path or list ownership packages.',
    {
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Package IDs'),
        phids: z.array(z.string()).optional().describe('Package PHIDs'),
        owners: z.array(z.string()).optional().describe('Owner user or project PHIDs'),
        repositoryPHIDs: z.array(z.string()).optional().describe('Repository PHIDs'),
        paths: z.array(z.string()).optional().describe('Code paths to find ownership for'),
        statuses: z.array(z.string()).optional().describe('Package statuses'),
        query: z.string().optional().describe('Full-text search query'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        owners: z.boolean().optional().describe('Include owner details'),
        paths: z.boolean().optional().describe('Include owned paths'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('owners.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
