import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { z } from 'zod';
import { jsonCoerce } from './coerce.js';

export function registerDiffusionTools(server: McpServer, client: ConduitClient) {
  // Search repositories
  server.tool(
    'phabricator_repository_search',
    'Search Diffusion repositories',
    {
      queryKey: z.string().optional().describe('Built-in query: "all", "active"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Repository IDs'),
        phids: z.array(z.string()).optional().describe('Repository PHIDs'),
        callsigns: z.array(z.string()).optional().describe('Repository callsigns'),
        shortNames: z.array(z.string()).optional().describe('Repository short names'),
        types: z.array(z.string()).optional().describe('VCS types: git, hg, svn'),
        uris: z.array(z.string()).optional().describe('Repository URIs'),
        query: z.string().optional().describe('Full-text search query'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        uris: z.boolean().optional().describe('Include repository URIs'),
        metrics: z.boolean().optional().describe('Include metrics'),
        projects: z.boolean().optional().describe('Include projects'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('diffusion.repository.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search commits
  server.tool(
    'phabricator_commit_search',
    'Search Diffusion commits',
    {
      queryKey: z.string().optional().describe('Built-in query: "all", "authored"'),
      constraints: jsonCoerce(z.object({
        ids: z.array(z.coerce.number()).optional().describe('Commit IDs'),
        phids: z.array(z.string()).optional().describe('Commit PHIDs'),
        repositoryPHIDs: z.array(z.string()).optional().describe('Repository PHIDs'),
        identifiers: z.array(z.string()).optional().describe('Commit identifiers (hashes)'),
        authorPHIDs: z.array(z.string()).optional().describe('Author PHIDs'),
        query: z.string().optional().describe('Full-text search query'),
      })).optional().describe('Search constraints'),
      attachments: jsonCoerce(z.object({
        projects: z.boolean().optional().describe('Include projects'),
        subscribers: z.boolean().optional().describe('Include subscribers'),
        auditors: z.boolean().optional().describe('Include auditor info'),
      })).optional().describe('Data attachments'),
      order: z.string().optional().describe('Result order'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      after: z.string().optional().describe('Pagination cursor'),
    },
    async (params) => {
      const result = await client.call('diffusion.commit.search', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Browse repository file tree
  server.tool(
    'phabricator_repository_browse',
    'Browse a repository directory tree at a given path and commit/branch',
    {
      path: z.string().describe('Path to browse (e.g., "/", "/src/")'),
      repository: z.string().optional().describe('Repository callsign, short name, or PHID'),
      commit: z.string().optional().describe('Commit hash or branch name (default: HEAD)'),
    },
    async (params) => {
      const result = await client.call('diffusion.browsequery', {
        path: params.path,
        repository: params.repository,
        commit: params.commit,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Read file content from repository
  server.tool(
    'phabricator_repository_file_content',
    'Read file contents from a Diffusion repository at a given path and commit/branch',
    {
      path: z.string().describe('File path in the repository (e.g., "src/index.ts")'),
      repository: z.string().optional().describe('Repository callsign, short name, or PHID'),
      commit: z.string().optional().describe('Commit hash or branch name (default: HEAD)'),
    },
    async (params) => {
      const result = await client.call('diffusion.filecontentquery', {
        path: params.path,
        repository: params.repository,
        commit: params.commit,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // List branches
  server.tool(
    'phabricator_branch_search',
    'List branches in a Diffusion repository',
    {
      repository: z.string().describe('Repository callsign, short name, or PHID'),
      contains: z.string().optional().describe('Only branches containing this commit'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      offset: z.coerce.number().optional().describe('Result offset for pagination'),
    },
    async (params) => {
      const result = await client.call('diffusion.branchquery', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // List tags
  server.tool(
    'phabricator_tag_search',
    'List tags in a Diffusion repository',
    {
      repository: z.string().describe('Repository callsign, short name, or PHID'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      offset: z.coerce.number().optional().describe('Result offset for pagination'),
    },
    async (params) => {
      const result = await client.call('diffusion.tagsquery', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // File commit history
  server.tool(
    'phabricator_repository_file_history',
    'Get commit history for a file path in a Diffusion repository',
    {
      path: z.string().describe('File path in the repository'),
      repository: z.string().optional().describe('Repository callsign, short name, or PHID'),
      commit: z.string().optional().describe('Commit hash or branch to start from (default: HEAD)'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      offset: z.coerce.number().optional().describe('Result offset for pagination'),
    },
    async (params) => {
      const result = await client.call('diffusion.historyquery', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Search file contents in repository
  server.tool(
    'phabricator_code_search',
    'Search (grep) file contents within a Diffusion repository',
    {
      path: z.string().optional().describe('Directory path to search within (default: root)'),
      repository: z.string().describe('Repository callsign, short name, or PHID'),
      query: z.string().describe('Search query / pattern'),
      commit: z.string().optional().describe('Commit hash or branch (default: HEAD)'),
      limit: z.coerce.number().max(100).optional().describe('Maximum results'),
      offset: z.coerce.number().optional().describe('Result offset for pagination'),
    },
    async (params) => {
      const result = await client.call('diffusion.searchquery', {
        path: params.path ?? '/',
        repository: params.repository,
        grep: params.query,
        commit: params.commit,
        limit: params.limit,
        offset: params.offset,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );
}
