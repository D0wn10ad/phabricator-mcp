import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';

export function registerAuditTools(server: McpServer, client: ConduitClient) {
  // Query audits
  server.tool(
    'phabricator_audit_query',
    'Search commit audit requests. Find commits needing audit, or audits by a specific user. Uses the audit.query endpoint (no modern replacement available).',
    {
      auditorPHIDs: z.array(z.string()).optional().describe('Auditor user/project PHIDs'),
      commitPHIDs: z.array(z.string()).optional().describe('Commit PHIDs to check audit status for'),
      status: z.string().optional().describe('Audit status filter: "audit-status-any" (default), "audit-status-open", "audit-status-concern", "audit-status-accepted", "audit-status-partial"'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results (max 100)'),
      offset: z.coerce.number().optional().describe('Result offset for pagination'),
    },
    async (params) => {
      const result = await client.call('audit.query', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
