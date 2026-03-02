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
        query: z.string().optional().describe('Full-text search query'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        participants: z.boolean().optional().describe('Include participant details'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Cursor for next-page pagination'),
      before: z.string().optional().describe('Cursor for previous-page pagination'),
    },
    async (params) => {
      const result = await client.call('conpherence.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Read messages in a thread
  server.tool(
    'phabricator_conpherence_read',
    'Read messages from a Conpherence chat room/thread (returned in reverse chronological order). Uses conpherence.querythread (the only Conduit method that returns message content).',
    {
      roomID: z.coerce.number().describe('Numeric room ID (use phabricator_conpherence_search to find it)'),
      limit: z.coerce.number().max(100).optional().describe('Maximum messages to return'),
      offset: z.coerce.number().optional().describe('Result offset for pagination'),
    },
    async (params) => {
      const result = await client.call('conpherence.querythread', {
        ids: [params.roomID],
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
        { type: 'name', value: params.title },
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

  // Edit an existing thread
  server.tool(
    'phabricator_conpherence_edit',
    'Edit a Conpherence chat room/thread. Rename it or manage participants.',
    {
      objectIdentifier: z.string().describe('Room ID or PHID'),
      title: z.string().optional().describe('New room title'),
      topic: z.string().optional().describe('Room topic/description'),
      addParticipantPHIDs: z.array(z.string()).optional().describe('Participant PHIDs to add'),
      removeParticipantPHIDs: z.array(z.string()).optional().describe('Participant PHIDs to remove'),
      comment: z.string().optional().describe('Send a message alongside the edit (supports Remarkup)'),
    },
    async (params) => {
      const transactions: Array<{ type: string; value: unknown }> = [];

      if (params.title !== undefined) {
        transactions.push({ type: 'name', value: params.title });
      }
      if (params.topic !== undefined) {
        transactions.push({ type: 'topic', value: params.topic });
      }
      if (params.addParticipantPHIDs !== undefined) {
        transactions.push({ type: 'participants.add', value: params.addParticipantPHIDs });
      }
      if (params.removeParticipantPHIDs !== undefined) {
        transactions.push({ type: 'participants.remove', value: params.removeParticipantPHIDs });
      }
      if (params.comment !== undefined) {
        transactions.push({ type: 'comment', value: params.comment });
      }

      if (transactions.length === 0) {
        return { content: [{ type: 'text', text: 'No changes specified' }] };
      }

      const result = await client.call('conpherence.edit', {
        objectIdentifier: params.objectIdentifier,
        transactions,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Send a message
  server.tool(
    'phabricator_conpherence_send',
    'Send a message to a Conpherence chat room/thread',
    {
      objectIdentifier: z.string().describe('Room ID or PHID'),
      message: z.string().describe('Message text (supports Remarkup)'),
    },
    async (params) => {
      const result = await client.call('conpherence.edit', {
        objectIdentifier: params.objectIdentifier,
        transactions: [{ type: 'comment', value: params.message }],
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
