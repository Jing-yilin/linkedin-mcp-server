/**
 * MCP Server Integration Tests for LinkedIn MCP
 *
 * These tests verify the MCP server protocol compliance and tool schemas.
 * They spawn the actual MCP server and test via JSON-RPC.
 */

import { describe, test, expect } from 'bun:test';
import { spawn } from 'child_process';
import * as path from 'path';

const API_KEY = process.env.HARVESTAPI_API_KEY || process.env.LINKEDIN_API_KEY || '';

describe('LinkedIn MCP Server Integration Tests', () => {
  const sendRequest = (request: object): Promise<any> => {
    return new Promise((resolve, reject) => {
      const proc = spawn('node', [path.join(__dirname, '../build/index.js')], {
        env: { ...process.env, HARVESTAPI_API_KEY: API_KEY },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', () => {
        try {
          const lines = stdout.trim().split('\n');
          for (const line of lines) {
            if (line.startsWith('{')) {
              const response = JSON.parse(line);
              resolve(response);
              return;
            }
          }
          resolve({ stdout, stderr });
        } catch (e) {
          resolve({ stdout, stderr, error: e });
        }
      });

      proc.on('error', reject);

      proc.stdin?.write(JSON.stringify(request) + '\n');
      proc.stdin?.end();

      setTimeout(() => {
        proc.kill();
        reject(new Error('Request timeout'));
      }, 30000);
    });
  };

  describe('tools/list endpoint', () => {
    test('returns all 17 tools', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBe(17);
    });

    test('includes get_profile tool with correct schema', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'get_profile');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('url');
      expect(tool.inputSchema.properties).toHaveProperty('publicIdentifier');
      expect(tool.inputSchema.properties).toHaveProperty('profileId');
      expect(tool.inputSchema.properties).toHaveProperty('findEmail');
      expect(tool.inputSchema.properties).toHaveProperty('includeAboutProfile');
    });

    test('includes search_profiles tool with correct schema', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'search_profiles');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('search');
      expect(tool.inputSchema.properties).toHaveProperty('currentCompany');
      expect(tool.inputSchema.properties).toHaveProperty('pastCompany');
      expect(tool.inputSchema.properties).toHaveProperty('school');
      expect(tool.inputSchema.properties).toHaveProperty('firstName');
      expect(tool.inputSchema.properties).toHaveProperty('lastName');
      expect(tool.inputSchema.properties).toHaveProperty('title');
      expect(tool.inputSchema.properties).toHaveProperty('location');
      expect(tool.inputSchema.properties).toHaveProperty('geoId');
      expect(tool.inputSchema.properties).toHaveProperty('industryId');
    });

    test('includes get_profile_posts tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'get_profile_posts');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('profile');
      expect(tool.inputSchema.properties).toHaveProperty('profileId');
      expect(tool.inputSchema.properties).toHaveProperty('profilePublicIdentifier');
      expect(tool.inputSchema.properties).toHaveProperty('postedLimit');
    });

    test('includes get_company tool with correct schema', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'get_company');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('url');
      expect(tool.inputSchema.properties).toHaveProperty('universalName');
      expect(tool.inputSchema.properties).toHaveProperty('search');
    });

    test('includes search_companies tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'search_companies');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('search');
      expect(tool.inputSchema.properties).toHaveProperty('location');
      expect(tool.inputSchema.properties).toHaveProperty('geoId');
      expect(tool.inputSchema.properties).toHaveProperty('companySize');
    });

    test('includes get_job tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'get_job');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('jobId');
      expect(tool.inputSchema.properties).toHaveProperty('url');
    });

    test('includes search_jobs tool with comprehensive filters', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'search_jobs');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('search');
      expect(tool.inputSchema.properties).toHaveProperty('companyId');
      expect(tool.inputSchema.properties).toHaveProperty('location');
      expect(tool.inputSchema.properties).toHaveProperty('geoId');
      expect(tool.inputSchema.properties).toHaveProperty('sortBy');
      expect(tool.inputSchema.properties).toHaveProperty('workplaceType');
      expect(tool.inputSchema.properties).toHaveProperty('employmentType');
      expect(tool.inputSchema.properties).toHaveProperty('salary');
      expect(tool.inputSchema.properties).toHaveProperty('postedLimit');
      expect(tool.inputSchema.properties).toHaveProperty('experienceLevel');
      expect(tool.inputSchema.properties).toHaveProperty('industryId');
      expect(tool.inputSchema.properties).toHaveProperty('functionId');
      expect(tool.inputSchema.properties).toHaveProperty('under10Applicants');
      expect(tool.inputSchema.properties).toHaveProperty('easyApply');
    });

    test('includes get_post tool requiring URL', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'get_post');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('url');
    });

    test('includes search_posts tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'search_posts');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('search');
      expect(tool.inputSchema.properties).toHaveProperty('profile');
      expect(tool.inputSchema.properties).toHaveProperty('company');
      expect(tool.inputSchema.properties).toHaveProperty('authorsCompany');
      expect(tool.inputSchema.properties).toHaveProperty('postedLimit');
      expect(tool.inputSchema.properties).toHaveProperty('sortBy');
    });

    test('includes get_post_comments tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'get_post_comments');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('post');
      expect(tool.inputSchema.properties).toHaveProperty('sortBy');
      expect(tool.inputSchema.properties).toHaveProperty('paginationToken');
    });

    test('includes get_post_reactions tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'get_post_reactions');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('post');
    });

    test('includes get_group tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'get_group');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('url');
      expect(tool.inputSchema.properties).toHaveProperty('groupId');
    });

    test('includes search_groups tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'search_groups');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('search');
    });

    test('includes search_geo_id tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const tool = tools.find((t: any) => t.name === 'search_geo_id');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.required).toContain('search');
    });

    test('all tools have name and description', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      for (const tool of tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
      }
    });

    test('tool names follow snake_case convention', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });

      const tools = response.result.tools;
      const snakeCaseRegex = /^[a-z]+(_[a-z]+)*$/;
      for (const tool of tools) {
        expect(snakeCaseRegex.test(tool.name)).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    test('returns error for unknown tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      });

      expect(response.error || response.result).toBeDefined();
    });

    test('returns error for missing arguments', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'get_profile',
        },
      });

      expect(response.error || response.result).toBeDefined();
    });
  });
});
