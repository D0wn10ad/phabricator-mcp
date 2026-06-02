import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerEdgeTools(server: McpServer, client: ConduitClient) {
  // Read edge relationships between objects
  server.tool(
    'phabricator_edge_search',
    'Read edge relationships between objects (e.g. tracking dependencies or links between tasks, commits, and revisions)',
    {
      sourcePHIDs: jsonCoerce(z.array(z.string())).describe('List of source Object PHIDs to query relationships from.'),
      types: jsonCoerce(z.array(z.string())).describe("List of edge constants (e.g., ['task.revision', 'revision.task', 'task.subtask', 'task.parent', 'commit.task'])."),
      destinationPHIDs: jsonCoerce(z.array(z.string())).optional().describe('Optional list of destination Object PHIDs to filter the relationship destinations.'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100, default 100)'),
      after: z.string().optional().describe('Cursor for next-page pagination'),
      before: z.string().optional().describe('Cursor for previous-page pagination'),
    },
    async (params) => {
      const result = await client.call('edge.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
