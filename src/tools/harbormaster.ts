import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerHarbormasterTools(server: McpServer, client: ConduitClient) {
  // Search buildables
  server.tool(
    'phabricator_buildable_search',
    'Search Harbormaster buildables (objects that can be built, like revisions or commits)',
    {
      queryKey: z.string().optional().describe('Built-in query: "all"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Buildable IDs'),
        phids: z.array(z.string()).optional().describe('Buildable PHIDs'),
        objectPHIDs: z.array(z.string()).optional().describe('Object PHIDs (revision or commit PHIDs)'),
        containerPHIDs: z.array(z.string()).optional().describe('Container PHIDs'),
        statuses: z.array(z.string()).optional().describe('Buildable statuses'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        builds: z.boolean().optional().describe('Include builds for each buildable'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('harbormaster.buildable.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search builds
  server.tool(
    'phabricator_build_search',
    'Search Harbormaster builds (CI/build results)',
    {
      queryKey: z.string().optional().describe('Built-in query: "all"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Build IDs'),
        phids: z.array(z.string()).optional().describe('Build PHIDs'),
        buildablePHIDs: z.array(z.string()).optional().describe('Buildable PHIDs'),
        buildPlanPHIDs: z.array(z.string()).optional().describe('Build plan PHIDs'),
        statuses: z.array(z.string()).optional().describe('Build statuses: building, passed, failed, aborted, error, paused, deadlocked'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        targets: z.boolean().optional().describe('Include build targets for each build'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('harbormaster.build.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search build targets
  server.tool(
    'phabricator_build_target_search',
    'Search Harbormaster build targets (individual build steps within a build)',
    {
      queryKey: z.string().optional().describe('Built-in query: "all"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Target IDs'),
        phids: z.array(z.string()).optional().describe('Target PHIDs'),
        buildPHIDs: z.array(z.string()).optional().describe('Build PHIDs'),
      })).optional().describe('Search constraints'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('harbormaster.target.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search build logs
  server.tool(
    'phabricator_build_log_search',
    'Search Harbormaster build logs (output from build steps). Use phabricator_build_target_search to find target PHIDs first.',
    {
      queryKey: z.string().optional().describe('Built-in query: "all"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Log IDs'),
        phids: z.array(z.string()).optional().describe('Log PHIDs'),
        buildTargetPHIDs: z.array(z.string()).optional().describe('Build target PHIDs'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        content: z.boolean().optional().describe('Include actual log text content'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('harbormaster.log.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Send build command
  server.tool(
    'phabricator_build_command',
    'Report build status to Harbormaster. Used by external build systems to notify Phabricator of build results. Provide the build target PHID (use phabricator_build_target_search to find it).',
    {
      buildTargetPHID: z.string().describe('Build target PHID to send the message to. Use phabricator_build_target_search to find this.'),
      type: z.enum(['pass', 'fail', 'work']).describe('Message type: "pass" (build succeeded), "fail" (build failed), "work" (build is still running)'),
    },
    async (params) => {
      const result = await client.call('harbormaster.sendmessage', {
        buildTargetPHID: params.buildTargetPHID,
        type: params.type,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search build plans
  server.tool(
    'phabricator_build_plan_search',
    'Search Harbormaster build plans (CI pipeline configurations)',
    {
      queryKey: z.string().optional().describe('Built-in query: "all", "active"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Build plan IDs'),
        phids: z.array(z.string()).optional().describe('Build plan PHIDs'),
        statuses: z.array(z.string()).optional().describe('Plan statuses'),
        query: z.string().optional().describe('Full-text search query'),
      })).optional().describe('Search constraints'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('harbormaster.buildplan.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
