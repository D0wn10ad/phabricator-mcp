import type { ConduitClient } from '../client/conduit.js';

export const edgeTools = {
  'edge_search': {
    description: 'Read relationship edges between Phabricator objects (e.g., tasks to revisions, tasks to subtasks, commits to tasks).',
    inputSchema: {
      type: 'object',
      properties: {
        sourcePHIDs: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of object PHIDs to query relationships from.'
        },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: "Edge constants (e.g., 'task.revision', 'revision.task', 'task.subtask', 'task.parent', 'commit.task')."
        },
        destinationPHIDs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of destination object PHIDs to filter results.'
        },
        limit: { type: 'number', description: 'Maximum number of results to return (default 100).' },
        after: { type: 'string', description: 'Cursor string for forward pagination.' },
        before: { type: 'string', description: 'Cursor string for reverse pagination.' }
      },
      required: ['sourcePHIDs', 'types']
    },
    handler: async (client: ConduitClient, args: any) => {
      const response = await client.edgeSearch({
        sourcePHIDs: args.sourcePHIDs,
        types: args.types,
        destinationPHIDs: args.destinationPHIDs,
        limit: args.limit,
        after: args.after,
        before: args.before
      });
      
      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    }
  }
};
