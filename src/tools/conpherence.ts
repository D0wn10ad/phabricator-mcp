import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerConpherenceTools(server: McpServer, client: ConduitClient) {
  // Search chat rooms
  server.tool(
    'phabricator_conpherence_search',
    'Search Conpherence chat rooms/threads',
    {
      queryKey: z.string().optional().describe('Built-in query: "all", "participant"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Room IDs'),
        phids: z.array(z.string()).optional().describe('Room PHIDs'),
        participants: z.array(z.string()).optional().describe('Participant user PHIDs'),
      })).optional().describe('Search constraints'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('conpherence.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Read messages in a thread
  server.tool(
    'phabricator_conpherence_read',
    'Read messages from a Conpherence chat room/thread',
    {
      id: z.coerce.number().describe('Room ID'),
      limit: z.coerce.number().max(100).optional().describe('Maximum messages to return'),
      offset: z.coerce.number().optional().describe('Result offset for pagination'),
    },
    async (params) => {
      const result = await client.call('conpherence.querythread', {
        ids: [params.id],
        limit: params.limit,
        offset: params.offset,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Create a new thread
  server.tool(
    'phabricator_conpherence_create',
    'Create a new Conpherence chat room/thread',
    {
      title: z.string().describe('Thread title'),
      message: z.string().optional().describe('Initial message (supports Remarkup)'),
      participantPHIDs: z.array(z.string()).optional().describe('Participant user PHIDs to add'),
    },
    async (params) => {
      const transactions: Array<{ type: string; value: unknown }> = [
        { type: 'title', value: params.title },
      ];

      if (params.message !== undefined) {
        transactions.push({ type: 'comment', value: params.message });
      }
      if (params.participantPHIDs !== undefined) {
        transactions.push({ type: 'participants.add', value: params.participantPHIDs });
      }

      const result = await client.call('conpherence.edit', { transactions });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Send a message
  server.tool(
    'phabricator_conpherence_send',
    'Send a message to a Conpherence chat room/thread',
    {
      roomID: z.coerce.number().describe('Room ID'),
      message: z.string().describe('Message text (supports Remarkup)'),
    },
    async (params) => {
      const result = await client.call('conpherence.edit', {
        objectIdentifier: params.roomID,
        transactions: [{ type: 'comment', value: params.message }],
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
