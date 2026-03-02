import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerManiphestTools(server: McpServer, client: ConduitClient) {
  // Search tasks
  server.tool(
    'phabricator_task_search',
    'Search Maniphest tasks with optional filters',
    {
      queryKey: z.string().optional().describe('Built-in query: "all", "open", "authored", "assigned"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Task IDs to search for'),
        phids: z.array(z.string()).optional().describe('Task PHIDs to search for'),
        assignedPHIDs: z.array(z.string()).optional().describe('Assigned user PHIDs'),
        authorPHIDs: z.array(z.string()).optional().describe('Author PHIDs'),
        statuses: z.array(z.string()).optional().describe('Task statuses: open, resolved, wontfix, invalid, spite, duplicate'),
        priorities: z.array(z.coerce.number()).optional().describe('Priority levels'),
        subtypes: z.array(z.string()).optional().describe('Task subtypes'),
        columnPHIDs: z.array(z.string()).optional().describe('Workboard column PHIDs'),
        projects: z.array(z.string()).optional().describe('Project PHIDs (tasks tagged with these projects)'),
        query: z.string().optional().describe('Full-text search query'),
        createdStart: z.coerce.number().optional().describe('Created after (epoch timestamp)'),
        createdEnd: z.coerce.number().optional().describe('Created before (epoch timestamp)'),
        modifiedStart: z.coerce.number().optional().describe('Modified after (epoch timestamp)'),
        modifiedEnd: z.coerce.number().optional().describe('Modified before (epoch timestamp)'),
        parentIDs: z.array(z.coerce.number()).optional().describe('Parent task IDs'),
        subtaskIDs: z.array(z.coerce.number()).optional().describe('Subtask IDs'),
        hasParents: z.boolean().optional().describe('Filter to tasks that have open parent tasks'),
        hasSubtasks: z.boolean().optional().describe('Filter to tasks that have open subtasks'),
        spacePHIDs: z.array(z.string()).optional().describe('Filter by Space PHIDs (for multi-space installations)'),
        closedStart: z.coerce.number().optional().describe('Closed after (epoch timestamp)'),
        closedEnd: z.coerce.number().optional().describe('Closed before (epoch timestamp)'),
        closerPHIDs: z.array(z.string()).optional().describe('PHIDs of users who closed the task'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        columns: z.boolean().optional().describe('Include workboard column info'),
        projects: z.boolean().optional().describe('Include project info'),
        subscribers: z.boolean().optional().describe('Include subscriber info'),
        'custom-fields': z.boolean().optional().describe('Include custom field values in results'),
      })).optional().describe('Data attachments to include'),
      order: z.string().optional().describe('Result order: "priority", "updated", "newest", "oldest", "title", "relevance"'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Cursor for next-page pagination'),
      before: z.string().optional().describe('Cursor for previous-page pagination'),
    },
    async (params) => {
      const result = await client.call('maniphest.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Create task
  server.tool(
    'phabricator_task_create',
    'Create a new Maniphest task',
    {
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description (supports Remarkup)'),
      ownerPHID: z.string().optional().describe('Assigned owner PHID'),
      priority: z.string().optional().describe('Priority keyword (unbreak, triage, high, normal, low, wish) or numeric value'),
      projectPHIDs: z.array(z.string()).optional().describe('Project PHIDs to tag'),
      subscriberPHIDs: z.array(z.string()).optional().describe('Subscriber PHIDs'),
      status: z.string().optional().describe('Initial status'),
      subtype: z.string().optional().describe('Task subtype (e.g. "default", "incident")'),
      parentPHIDs: z.array(z.string()).optional().describe('Parent task PHIDs'),
      subtaskPHIDs: z.array(z.string()).optional().describe('Subtask PHIDs'),
      space: z.string().optional().describe('Space PHID to place the task in (for multi-space installations)'),
      comment: z.string().optional().describe('Initial comment on the task (supports Remarkup)'),
      customFields: jsonCoerce(z.record(z.string(), z.unknown())).optional().describe(
        'Custom field transactions. Keys are transaction types (e.g. "custom.my-field"), values are the field values. Check your Phabricator Conduit console (conduit/method/maniphest.edit/) for available fields.'
      ),
    },
    async (params) => {
      const transactions: Array<{ type: string; value: unknown }> = [
        { type: 'title', value: params.title },
      ];

      if (params.description !== undefined) {
        transactions.push({ type: 'description', value: params.description });
      }
      if (params.ownerPHID !== undefined) {
        transactions.push({ type: 'owner', value: params.ownerPHID });
      }
      if (params.priority !== undefined) {
        transactions.push({ type: 'priority', value: params.priority });
      }
      if (params.projectPHIDs !== undefined) {
        transactions.push({ type: 'projects.set', value: params.projectPHIDs });
      }
      if (params.subscriberPHIDs !== undefined) {
        transactions.push({ type: 'subscribers.set', value: params.subscriberPHIDs });
      }
      if (params.status !== undefined) {
        transactions.push({ type: 'status', value: params.status });
      }
      if (params.subtype !== undefined) {
        transactions.push({ type: 'subtype', value: params.subtype });
      }
      if (params.parentPHIDs !== undefined) {
        transactions.push({ type: 'parents.set', value: params.parentPHIDs });
      }
      if (params.subtaskPHIDs !== undefined) {
        transactions.push({ type: 'subtasks.set', value: params.subtaskPHIDs });
      }
      if (params.space !== undefined) {
        transactions.push({ type: 'space', value: params.space });
      }
      if (params.comment !== undefined) {
        transactions.push({ type: 'comment', value: params.comment });
      }
      if (params.customFields !== undefined) {
        for (const [key, value] of Object.entries(params.customFields)) {
          transactions.push({ type: key, value });
        }
      }

      const result = await client.call('maniphest.edit', { transactions });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Edit task
  server.tool(
    'phabricator_task_edit',
    'Edit an existing Maniphest task',
    {
      objectIdentifier: z.string().describe('Task PHID or ID (e.g., "T123" or PHID)'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      ownerPHID: z.string().nullable().optional().describe('New owner PHID (null to unassign)'),
      priority: z.string().optional().describe('New priority'),
      status: z.string().optional().describe('New status: open, resolved, wontfix, invalid, spite, duplicate'),
      subtype: z.string().optional().describe('Task subtype (e.g. "default", "incident")'),
      addProjectPHIDs: z.array(z.string()).optional().describe('Project PHIDs to add'),
      removeProjectPHIDs: z.array(z.string()).optional().describe('Project PHIDs to remove'),
      addSubscriberPHIDs: z.array(z.string()).optional().describe('Subscriber PHIDs to add'),
      removeSubscriberPHIDs: z.array(z.string()).optional().describe('Subscriber PHIDs to remove'),
      addParentPHIDs: z.array(z.string()).optional().describe('Parent task PHIDs to add'),
      removeParentPHIDs: z.array(z.string()).optional().describe('Parent task PHIDs to remove'),
      addSubtaskPHIDs: z.array(z.string()).optional().describe('Subtask PHIDs to add'),
      removeSubtaskPHIDs: z.array(z.string()).optional().describe('Subtask PHIDs to remove'),
      columnPHID: z.string().optional().describe('Move to workboard column'),
      space: z.string().optional().describe('Space PHID to move the task to (for multi-space installations)'),
      comment: z.string().optional().describe('Add a comment alongside the edit (supports Remarkup)'),
      customFields: jsonCoerce(z.record(z.string(), z.unknown())).optional().describe(
        'Custom field transactions. Keys are transaction types (e.g. "custom.my-field"), values are the field values. Check your Phabricator Conduit console (conduit/method/maniphest.edit/) for available fields.'
      ),
    },
    async (params) => {
      const transactions: Array<{ type: string; value: unknown }> = [];

      if (params.title !== undefined) {
        transactions.push({ type: 'title', value: params.title });
      }
      if (params.description !== undefined) {
        transactions.push({ type: 'description', value: params.description });
      }
      if (params.ownerPHID !== undefined) {
        transactions.push({ type: 'owner', value: params.ownerPHID });
      }
      if (params.priority !== undefined) {
        transactions.push({ type: 'priority', value: params.priority });
      }
      if (params.status !== undefined) {
        transactions.push({ type: 'status', value: params.status });
      }
      if (params.subtype !== undefined) {
        transactions.push({ type: 'subtype', value: params.subtype });
      }
      if (params.addProjectPHIDs !== undefined) {
        transactions.push({ type: 'projects.add', value: params.addProjectPHIDs });
      }
      if (params.removeProjectPHIDs !== undefined) {
        transactions.push({ type: 'projects.remove', value: params.removeProjectPHIDs });
      }
      if (params.addSubscriberPHIDs !== undefined) {
        transactions.push({ type: 'subscribers.add', value: params.addSubscriberPHIDs });
      }
      if (params.removeSubscriberPHIDs !== undefined) {
        transactions.push({ type: 'subscribers.remove', value: params.removeSubscriberPHIDs });
      }
      if (params.addParentPHIDs !== undefined) {
        transactions.push({ type: 'parents.add', value: params.addParentPHIDs });
      }
      if (params.removeParentPHIDs !== undefined) {
        transactions.push({ type: 'parents.remove', value: params.removeParentPHIDs });
      }
      if (params.addSubtaskPHIDs !== undefined) {
        transactions.push({ type: 'subtasks.add', value: params.addSubtaskPHIDs });
      }
      if (params.removeSubtaskPHIDs !== undefined) {
        transactions.push({ type: 'subtasks.remove', value: params.removeSubtaskPHIDs });
      }
      if (params.columnPHID !== undefined) {
        transactions.push({ type: 'column', value: [{ columnPHID: params.columnPHID }] });
      }
      if (params.space !== undefined) {
        transactions.push({ type: 'space', value: params.space });
      }
      if (params.comment !== undefined) {
        transactions.push({ type: 'comment', value: params.comment });
      }
      if (params.customFields !== undefined) {
        for (const [key, value] of Object.entries(params.customFields)) {
          transactions.push({ type: key, value });
        }
      }

      if (transactions.length === 0) {
        return { content: [{ type: 'text', text: 'No changes specified' }] };
      }

      const result = await client.call('maniphest.edit', {
        objectIdentifier: params.objectIdentifier,
        transactions,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Add comment to task
  server.tool(
    'phabricator_task_add_comment',
    'Add a comment to a Maniphest task',
    {
      objectIdentifier: z.string().describe('Task PHID or ID (e.g., "T123")'),
      comment: z.string().describe('Comment text (supports Remarkup)'),
    },
    async (params) => {
      const result = await client.call('maniphest.edit', {
        objectIdentifier: params.objectIdentifier,
        transactions: [{ type: 'comment', value: params.comment }],
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search available task statuses
  server.tool(
    'phabricator_task_status_search',
    'List all available task statuses configured on this Phabricator instance',
    {},
    async () => {
      const result = await client.call('maniphest.status.search');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search available task priorities
  server.tool(
    'phabricator_task_priority_search',
    'List all available task priorities configured on this Phabricator instance',
    {},
    async () => {
      const result = await client.call('maniphest.priority.search');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

}
