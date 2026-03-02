import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerPhrictionTools(server: McpServer, client: ConduitClient) {
  // Search wiki documents
  server.tool(
    'phabricator_document_search',
    'Search Phriction wiki documents',
    {
      queryKey: z.string().optional().describe('Built-in query: "all", "active"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Document IDs'),
        phids: z.array(z.string()).optional().describe('Document PHIDs'),
        paths: z.array(z.string()).optional().describe('Document paths'),
        ancestorPaths: z.array(z.string()).optional().describe('Ancestor paths to search under'),
        statuses: z.array(z.string()).optional().describe('Document statuses'),
        query: z.string().optional().describe('Full-text search query'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        content: z.boolean().optional().describe('Include document content'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('phriction.document.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Edit wiki document
  server.tool(
    'phabricator_document_edit',
    'Create or edit a Phriction wiki document. To create, provide a new slug with title and content.',
    {
      objectIdentifier: z.string().describe('Document slug, PHID, or ID (e.g., "projects/myproject/")'),
      title: z.string().optional().describe('Document title'),
      content: z.string().optional().describe('Document content (Remarkup)'),
    },
    async (params) => {
      const transactions: Array<{ type: string; value: unknown }> = [];

      if (params.title !== undefined) {
        transactions.push({ type: 'title', value: params.title });
      }
      if (params.content !== undefined) {
        transactions.push({ type: 'content', value: params.content });
      }

      if (transactions.length === 0) {
        return { content: [{ type: 'text', text: 'No changes specified' }] };
      }

      const result = await client.call('phriction.document.edit', {
        objectIdentifier: params.objectIdentifier,
        transactions,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Add comment to document
  server.tool(
    'phabricator_document_add_comment',
    'Add a comment to a Phriction wiki document',
    {
      objectIdentifier: z.string().describe('Document slug, PHID, or ID (e.g., "projects/myproject/")'),
      comment: z.string().describe('Comment text (supports Remarkup)'),
    },
    async (params) => {
      const result = await client.call('phriction.document.edit', {
        objectIdentifier: params.objectIdentifier,
        transactions: [{ type: 'comment', value: params.comment }],
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
