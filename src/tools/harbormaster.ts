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
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Cursor for next-page pagination'),
      before: z.string().optional().describe('Cursor for previous-page pagination'),
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
        buildables: z.array(z.string()).optional().describe('Buildable PHIDs'),
        plans: z.array(z.string()).optional().describe('Build plan PHIDs'),
        statuses: z.array(z.string()).optional().describe('Build statuses: building, passed, failed, aborted, error, paused'),
        initiatorPHIDs: z.array(z.string()).optional().describe('PHIDs of users/objects that initiated the build'),
      })).optional().describe('Search constraints'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Cursor for next-page pagination'),
      before: z.string().optional().describe('Cursor for previous-page pagination'),
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
      after: z.string().optional().describe('Cursor for next-page pagination'),
      before: z.string().optional().describe('Cursor for previous-page pagination'),
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
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Cursor for next-page pagination'),
      before: z.string().optional().describe('Cursor for previous-page pagination'),
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
      unit: jsonCoerce(z.array(z.object({
        name: z.string().describe('Test name'),
        result: z.string().describe('Result: "pass", "fail", "skip", "broken", "unsound"'),
        namespace: z.string().optional().describe('Test namespace/group'),
        engine: z.string().optional().describe('Test engine name'),
        duration: z.coerce.number().optional().describe('Duration in seconds'),
        path: z.string().optional().describe('File path related to the test'),
        coverage: z.record(z.string(), z.string()).optional().describe('Coverage data as {path: "NNCUUUC..."} where N=not executable, C=covered, U=uncovered'),
        details: z.string().optional().describe('Additional details or failure message'),
      }))).optional().describe('Unit test results to report'),
      lint: jsonCoerce(z.array(z.object({
        name: z.string().describe('Lint message name'),
        code: z.string().describe('Lint rule code'),
        severity: z.string().describe('Severity: "advice", "autofix", "warning", "error", "disabled"'),
        path: z.string().optional().describe('File path'),
        line: z.coerce.number().optional().describe('Line number'),
        char: z.coerce.number().optional().describe('Character offset'),
        description: z.string().optional().describe('Lint message description'),
      }))).optional().describe('Lint results to report'),
    },
    async (params) => {
      const apiParams: Record<string, unknown> = {
        buildTargetPHID: params.buildTargetPHID,
        type: params.type,
      };
      if (params.unit !== undefined) {
        apiParams.unit = params.unit;
      }
      if (params.lint !== undefined) {
        apiParams.lint = params.lint;
      }
      const result = await client.call('harbormaster.sendmessage', apiParams);
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
        status: z.array(z.string()).optional().describe('Plan statuses: "active", "disabled"'),
        match: z.string().optional().describe('Search for build plans by name substring'),
      })).optional().describe('Search constraints'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      after: z.string().optional().describe('Cursor for next-page pagination'),
      before: z.string().optional().describe('Cursor for previous-page pagination'),
    },
    async (params) => {
      const result = await client.call('harbormaster.buildplan.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
