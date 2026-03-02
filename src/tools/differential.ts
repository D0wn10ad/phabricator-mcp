import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerDifferentialTools(server: McpServer, client: ConduitClient) {
  // Search revisions
  server.tool(
    'phabricator_revision_search',
    'Search Differential revisions (code reviews)',
    {
      queryKey: z.string().optional().describe('Built-in query: "all", "active", "authored", "waiting", "reviewable"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Revision IDs'),
        phids: z.array(z.string()).optional().describe('Revision PHIDs'),
        authorPHIDs: z.array(z.string()).optional().describe('Author PHIDs'),
        reviewerPHIDs: z.array(z.string()).optional().describe('Reviewer PHIDs'),
        repositoryPHIDs: z.array(z.string()).optional().describe('Repository PHIDs'),
        statuses: z.array(z.string()).optional().describe('Statuses: needs-review, needs-revision, accepted, published, abandoned, changes-planned'),
        responsiblePHIDs: z.array(z.string()).optional().describe('User PHIDs who are responsible (as author or reviewer)'),
        affectedPaths: z.array(z.string()).optional().describe('File paths affected by the revision'),
        createdStart: z.coerce.number().optional().describe('Created after (epoch timestamp)'),
        createdEnd: z.coerce.number().optional().describe('Created before (epoch timestamp)'),
        modifiedStart: z.coerce.number().optional().describe('Modified after (epoch timestamp)'),
        modifiedEnd: z.coerce.number().optional().describe('Modified before (epoch timestamp)'),
        query: z.string().optional().describe('Full-text search query'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        reviewers: z.boolean().optional().describe('Include reviewers'),
        subscribers: z.boolean().optional().describe('Include subscribers'),
        projects: z.boolean().optional().describe('Include projects'),
        'reviewers-extra': z.boolean().optional().describe('Include detailed reviewer info with status (accepted, rejected, etc.)'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order: "newest", "oldest", "updated", "relevance"'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('differential.revision.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Edit revision
  server.tool(
    'phabricator_revision_edit',
    'Create or edit a Differential revision. Supports actions like accept, reject, abandon, request-review, plan-changes, and commandeer. Can also add/remove reviewers, subscribers, linked tasks, and comments.',
    {
      objectIdentifier: z.string().optional().describe('Revision PHID or ID (e.g., "D123"). Omit to create a new revision.'),
      title: z.string().optional().describe('New title'),
      summary: z.string().optional().describe('New summary'),
      testPlan: z.string().optional().describe('New test plan'),
      addReviewerPHIDs: z.array(z.string()).optional().describe('Add reviewers'),
      removeReviewerPHIDs: z.array(z.string()).optional().describe('Remove reviewers'),
      addProjectPHIDs: z.array(z.string()).optional().describe('Add projects'),
      removeProjectPHIDs: z.array(z.string()).optional().describe('Remove projects'),
      comment: z.string().optional().describe('Add a comment'),
      action: z.enum(['accept', 'reject', 'abandon', 'reclaim', 'request-review', 'resign', 'commandeer', 'plan-changes']).optional().describe('Revision action to take'),
      addSubscriberPHIDs: z.array(z.string()).optional().describe('Subscriber PHIDs to add'),
      removeSubscriberPHIDs: z.array(z.string()).optional().describe('Subscriber PHIDs to remove'),
      addTaskPHIDs: z.array(z.string()).optional().describe('Task PHIDs to link (e.g., "fixes T123")'),
      removeTaskPHIDs: z.array(z.string()).optional().describe('Task PHIDs to unlink'),
    },
    async (params) => {
      const transactions: Array<{ type: string; value: unknown }> = [];

      if (params.title !== undefined) {
        transactions.push({ type: 'title', value: params.title });
      }
      if (params.summary !== undefined) {
        transactions.push({ type: 'summary', value: params.summary });
      }
      if (params.testPlan !== undefined) {
        transactions.push({ type: 'testPlan', value: params.testPlan });
      }
      if (params.addReviewerPHIDs !== undefined) {
        transactions.push({ type: 'reviewers.add', value: params.addReviewerPHIDs });
      }
      if (params.removeReviewerPHIDs !== undefined) {
        transactions.push({ type: 'reviewers.remove', value: params.removeReviewerPHIDs });
      }
      if (params.addProjectPHIDs !== undefined) {
        transactions.push({ type: 'projects.add', value: params.addProjectPHIDs });
      }
      if (params.removeProjectPHIDs !== undefined) {
        transactions.push({ type: 'projects.remove', value: params.removeProjectPHIDs });
      }
      if (params.comment !== undefined) {
        transactions.push({ type: 'comment', value: params.comment });
      }
      if (params.action !== undefined) {
        transactions.push({ type: params.action, value: true });
      }
      if (params.addSubscriberPHIDs !== undefined) {
        transactions.push({ type: 'subscribers.add', value: params.addSubscriberPHIDs });
      }
      if (params.removeSubscriberPHIDs !== undefined) {
        transactions.push({ type: 'subscribers.remove', value: params.removeSubscriberPHIDs });
      }
      if (params.addTaskPHIDs !== undefined) {
        transactions.push({ type: 'tasks.add', value: params.addTaskPHIDs });
      }
      if (params.removeTaskPHIDs !== undefined) {
        transactions.push({ type: 'tasks.remove', value: params.removeTaskPHIDs });
      }

      if (transactions.length === 0) {
        return { content: [{ type: 'text', text: 'No changes specified' }] };
      }

      const apiParams: Record<string, unknown> = { transactions };
      if (params.objectIdentifier !== undefined) {
        apiParams.objectIdentifier = params.objectIdentifier;
      }
      const result = await client.call('differential.revision.edit', apiParams);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Get raw diff content
  server.tool(
    'phabricator_raw_diff',
    'Get the raw diff/patch content for a Differential diff by diff ID. Use phabricator_diff_search to find the diff ID from a revision PHID first.',
    {
      diffID: z.coerce.number().describe('The diff ID (numeric, e.g., 1392561). Use phabricator_diff_search to find this from a revision.'),
    },
    async (params) => {
      const result = await client.call<string>('differential.getrawdiff', {
        diffID: params.diffID,
      });
      return { content: [{ type: 'text', text: result }] };
    },
  );

  // Search diffs
  server.tool(
    'phabricator_diff_search',
    'Search Differential diffs (code change snapshots within a revision). A revision may have multiple diffs as it gets updated.',
    {
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Diff IDs'),
        phids: z.array(z.string()).optional().describe('Diff PHIDs'),
        revisionPHIDs: z.array(z.string()).optional().describe('Revision PHIDs'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        commits: z.boolean().optional().describe('Include commit info'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order: "newest", "oldest"'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('differential.diff.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search changesets (changed files within a diff)
  server.tool(
    'phabricator_changeset_search',
    'Search changesets (individual changed files) within a Differential diff. Use phabricator_diff_search to find the diff PHID first.',
    {
      constraints: jsonCoerce(z.object({
        diffPHIDs: z.array(z.string()).optional().describe('Diff PHIDs to list changesets for'),
      })).optional().describe('Search constraints'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('differential.changeset.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Create inline comment on a diff
  server.tool(
    'phabricator_revision_inline_comment',
    'Create an inline comment on a specific line of a Differential diff. The comment will appear as a draft until the revision is submitted/commented on.',
    {
      revisionID: z.string().describe('Revision ID (e.g., "D123" or just "123")'),
      diffID: z.coerce.number().describe('Diff ID to comment on. Use phabricator_diff_search to find this.'),
      filePath: z.string().describe('Path to the file being commented on'),
      lineNumber: z.coerce.number().describe('Line number in the file'),
      lineLength: z.coerce.number().optional().describe('Number of lines the comment spans (default: 0 for single line)'),
      content: z.string().describe('Comment text (supports Remarkup)'),
      isNewFile: z.boolean().optional().describe('Whether the line number refers to the new file (true) or old file (false). Default: true'),
    },
    async (params) => {
      const result = await client.call('differential.createinline', {
        revisionID: params.revisionID,
        diffID: params.diffID,
        filePath: params.filePath,
        lineNumber: params.lineNumber,
        lineLength: params.lineLength ?? 0,
        content: params.content,
        isNewFile: params.isNewFile ?? true,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
