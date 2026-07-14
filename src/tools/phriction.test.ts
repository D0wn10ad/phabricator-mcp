import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConduitClient } from '../client/conduit.js';
import { registerPhrictionTools } from './phriction.js';

type ToolHandler = (params: unknown) => Promise<{ content: [{ type: 'text'; text: string }] }>;

describe('registerPhrictionTools', () => {
  it('registers document info and proxies requests to phriction.info', async () => {
    const tools: Array<{ name: string; handler: ToolHandler }> = [];
    const server = {
      tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
        tools.push({ name, handler });
      },
    } as unknown as McpServer;

    const client = {
      async call(method: string, params?: unknown) {
        return { method, params };
      },
    } as unknown as ConduitClient;

    registerPhrictionTools(server, client);

    assert.deepStrictEqual(
      tools.map((tool) => tool.name),
      [
        'phabricator_document_search',
        'phabricator_document_info',
        'phabricator_document_create',
        'phabricator_document_edit',
        'phabricator_document_add_comment',
        'phabricator_remarkup_process',
      ],
    );

    const documentInfo = tools.find((tool) => tool.name === 'phabricator_document_info');

    assert.ok(documentInfo);

    const response = await documentInfo.handler({ slug: 'projects/myproject/' });

    assert.deepStrictEqual(response, {
      content: [{ type: 'text', text: JSON.stringify({ method: 'phriction.info', params: { slug: 'projects/myproject/' } }, null, 2) }],
    });
  });

  it('registers remarkup process and proxies requests to remarkup.process', async () => {
    const tools: Array<{ name: string; handler: ToolHandler }> = [];
    const server = {
      tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
        tools.push({ name, handler });
      },
    } as unknown as McpServer;

    const client = {
      async call(method: string, params?: unknown) {
        return { method, params };
      },
    } as unknown as ConduitClient;

    registerPhrictionTools(server, client);

    const remarkupProcess = tools.find((tool) => tool.name === 'phabricator_remarkup_process');

    assert.ok(remarkupProcess);

    const response = await remarkupProcess.handler({
      context: 'phriction',
      contents: ['= Title =', 'Some **Remarkup** content'],
    });

    assert.deepStrictEqual(response, {
      content: [{
        type: 'text',
        text: JSON.stringify({
          method: 'remarkup.process',
          params: {
            context: 'phriction',
            contents: ['= Title =', 'Some **Remarkup** content'],
          },
        }, null, 2),
      }],
    });
  });
});
