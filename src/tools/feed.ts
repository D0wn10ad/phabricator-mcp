import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';

export function registerFeedTools(server: McpServer, client: ConduitClient) {
  // Query activity feed
  server.tool(
    'phabricator_feed_query',
    'Query the Phabricator activity feed. Returns a chronological stream of recent activity (task updates, revision changes, commits, etc.). Uses feed.query (the only Conduit method for feed data).',
    {
      filterPHIDs: z.array(z.string()).optional().describe('Only show activity involving these PHIDs (user, project, task, etc.)'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Cursor for pagination (chronological key from previous results)'),
      before: z.string().optional().describe('Cursor for reverse pagination'),
    },
    async (params) => {
      const result = await client.call('feed.query', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
