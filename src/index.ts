#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { encode } from '@toon-format/toon';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Data cleaners for each endpoint type
 * Removes noise and keeps only useful fields for agents
 */
const DataCleaners = {
  cleanProfile(raw: any): any {
    if (!raw) return null;
    const exp = (raw.experience || []).map((e: any) => ({
      position: e.position,
      company: e.companyName,
      location: e.location,
      duration: e.duration,
      startDate: e.startDate?.text,
      endDate: e.endDate?.text,
      description: e.description,
    }));
    const edu = (raw.education || []).map((e: any) => ({
      school: e.schoolName || e.title,
      degree: e.degree,
      field: e.fieldOfStudy,
      period: e.period || `${e.startDate?.year || ''}-${e.endDate?.year || ''}`.replace(/^-|-$/g, ''),
    }));
    const skills = (raw.skills || []).map((s: any) => s.name);
    const certs = (raw.certifications || []).map((c: any) => ({
      title: c.title,
      issuedBy: c.issuedBy,
      issuedAt: c.issuedAt,
    }));

    return {
      id: raw.id,
      publicIdentifier: raw.publicIdentifier,
      linkedinUrl: raw.linkedinUrl,
      name: `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
      headline: raw.headline,
      about: raw.about,
      location: raw.location?.linkedinText,
      photo: raw.photo || raw.profilePicture?.url,
      premium: raw.premium,
      influencer: raw.influencer,
      verified: raw.verified,
      openToWork: raw.openToWork,
      hiring: raw.hiring,
      connections: raw.connectionsCount,
      followers: raw.followerCount,
      experience: exp,
      education: edu,
      skills: skills,
      certifications: certs,
    };
  },

  cleanProfileSearchResult(raw: any): any {
    if (!raw) return null;
    return {
      id: raw.id,
      name: raw.name,
      position: raw.position,
      location: raw.location?.linkedinText,
      linkedinUrl: raw.linkedinUrl,
      publicIdentifier: raw.publicIdentifier,
    };
  },

  cleanCompany(raw: any): any {
    if (!raw) return null;
    const hq = (raw.locations || []).find((l: any) => l.headquarter) || raw.locations?.[0];
    return {
      id: raw.id,
      universalName: raw.universalName,
      linkedinUrl: raw.linkedinUrl,
      name: raw.name,
      website: raw.website,
      logo: raw.logo,
      description: raw.description,
      employeeCount: raw.employeeCount,
      followers: raw.followerCount,
      headquarter: hq?.parsed?.text || hq?.city,
    };
  },

  cleanJob(raw: any): any {
    if (!raw) return null;
    return {
      id: raw.id,
      title: raw.title,
      linkedinUrl: raw.linkedinUrl || raw.url,
      state: raw.jobState,
      postedDate: raw.postedDate,
      location: raw.location?.linkedinText,
      company: raw.company?.name || raw.companyName,
      companyUrl: raw.company?.linkedinUrl || raw.companyLink,
      salary: raw.salary?.text || (raw.salary?.min && raw.salary?.max ? `${raw.salary.min}-${raw.salary.max} ${raw.salary.currency || ''}` : null),
      employmentType: raw.employmentType,
      workplaceType: raw.workplaceType,
      easyApply: raw.easyApply,
      description: raw.descriptionText,
    };
  },

  cleanJobSearchResult(raw: any): any {
    if (!raw) return null;
    return {
      id: raw.id,
      title: raw.title,
      url: raw.url,
      postedDate: raw.postedDate,
      company: raw.company?.name,
      location: raw.location?.linkedinText,
      easyApply: raw.easyApply,
    };
  },

  cleanPost(raw: any): any {
    if (!raw) return null;
    return {
      id: raw.id,
      linkedinUrl: raw.linkedinUrl,
      content: raw.content,
      authorName: raw.author?.name,
      authorType: raw.author?.type,
      postedAgo: raw.postedAt?.postedAgoText || raw.postedAt?.postedAgoShort,
      likes: raw.engagement?.likes,
      comments: raw.engagement?.comments,
      shares: raw.engagement?.shares,
      hasVideo: !!raw.postVideo,
      hasImages: (raw.postImages?.length || 0) > 0,
    };
  },

  cleanGroup(raw: any): any {
    if (!raw) return null;
    return {
      id: raw.id,
      linkedinUrl: raw.linkedinUrl,
      name: raw.name,
      members: raw.members || raw.memberCount,
      summary: raw.summary || raw.description,
    };
  },

  cleanGeoId(raw: any): any {
    if (!raw) return null;
    return {
      geoId: raw.geoId,
      title: raw.title,
    };
  },

  cleanComment(raw: any): any {
    if (!raw) return null;
    return {
      id: raw.id,
      content: raw.content,
      authorName: raw.author?.name,
      postedAgo: raw.postedAt?.postedAgoText,
      likes: raw.engagement?.likes,
    };
  },

  cleanReaction(raw: any): any {
    if (!raw) return null;
    return {
      name: raw.name,
      headline: raw.headline,
      reactionType: raw.reactionType,
      linkedinUrl: raw.linkedinUrl,
    };
  },
};

/**
 * LinkedIn API MCP Server
 * Provides access to LinkedIn data through HarvestAPI service
 * Returns data in TOON format for token efficiency
 */
class LinkedInAPIMCPServer {
  private server: Server;
  private apiClient: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.HARVESTAPI_API_KEY || process.env.LINKEDIN_API_KEY || '';

    this.server = new Server(
      {
        name: 'linkedin-mcp-server',
        version: '1.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const axiosConfig: AxiosRequestConfig = {
      baseURL: 'https://api.harvest-api.com/linkedin',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkedIn-MCP-Server/1.2.0'
      }
    };

    const proxyUrl = process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
      axiosConfig.proxy = false;
    }

    this.apiClient = axios.create(axiosConfig);
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_profile',
            description: 'Get LinkedIn profile information by URL, public identifier, or profile ID. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'LinkedIn profile URL' },
                publicIdentifier: { type: 'string', description: 'Public identifier (last part of LinkedIn URL)' },
                profileId: { type: 'string', description: 'LinkedIn profile ID' },
                findEmail: { type: 'boolean', description: 'Find email address for the profile', default: false },
                includeAboutProfile: { type: 'boolean', description: 'Include detailed about section', default: false },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum items in arrays (default: 5)', default: 5 },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'search_profiles',
            description: 'Search LinkedIn profiles by name, company, location. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Search profiles by name' },
                currentCompany: { type: 'string', description: 'Filter by current company ID or URL' },
                pastCompany: { type: 'string', description: 'Filter by past company ID or URL' },
                school: { type: 'string', description: 'Filter by school ID or URL' },
                firstName: { type: 'string', description: 'Filter by first name' },
                lastName: { type: 'string', description: 'Filter by last name' },
                title: { type: 'string', description: 'Filter by job title' },
                location: { type: 'string', description: 'Filter by location text' },
                geoId: { type: 'string', description: 'Filter by LinkedIn Geo ID' },
                industryId: { type: 'string', description: 'Filter by industry ID' },
                page: { type: 'integer', description: 'Page number', default: 1 },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum results (default: 10)', default: 10 },
              },
              required: ['search'],
            },
          } as Tool,
          {
            name: 'get_profile_posts',
            description: 'Get posts from a LinkedIn profile. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                profile: { type: 'string', description: 'LinkedIn profile URL' },
                profileId: { type: 'string', description: 'LinkedIn profile ID (faster)' },
                profilePublicIdentifier: { type: 'string', description: 'Profile public identifier' },
                postedLimit: { type: 'string', description: 'Filter by time: 24h, week, month', enum: ['24h', 'week', 'month'] },
                page: { type: 'integer', description: 'Page number', default: 1 },
                paginationToken: { type: 'string', description: 'Pagination token' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum posts (default: 10)', default: 10 },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_profile_comments',
            description: 'Get comments made by a LinkedIn profile. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                profile: { type: 'string', description: 'LinkedIn profile URL' },
                profileId: { type: 'string', description: 'LinkedIn profile ID (faster)' },
                postedLimit: { type: 'string', description: 'Filter by time: 24h, week, month', enum: ['24h', 'week', 'month'] },
                page: { type: 'integer', description: 'Page number', default: 1 },
                paginationToken: { type: 'string', description: 'Pagination token' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum comments (default: 10)', default: 10 },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_profile_reactions',
            description: 'Get reactions from a LinkedIn profile. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                profile: { type: 'string', description: 'LinkedIn profile URL' },
                profileId: { type: 'string', description: 'LinkedIn profile ID (faster)' },
                page: { type: 'integer', description: 'Page number', default: 1 },
                paginationToken: { type: 'string', description: 'Pagination token' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum reactions (default: 10)', default: 10 },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_company',
            description: 'Get LinkedIn company information. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'LinkedIn company URL' },
                universalName: { type: 'string', description: 'Company universal name (found in URL)' },
                search: { type: 'string', description: 'Company name to search' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'search_companies',
            description: 'Search LinkedIn companies. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Keywords to search' },
                location: { type: 'string', description: 'Filter by location' },
                geoId: { type: 'string', description: 'Filter by LinkedIn Geo ID' },
                companySize: { type: 'string', description: 'Filter by size: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10001+' },
                page: { type: 'integer', description: 'Page number', default: 1 },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum results (default: 10)', default: 10 },
              },
              required: ['search'],
            },
          } as Tool,
          {
            name: 'get_company_posts',
            description: 'Get posts from a LinkedIn company page. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                company: { type: 'string', description: 'LinkedIn company URL' },
                companyId: { type: 'string', description: 'LinkedIn company ID (faster)' },
                companyUniversalName: { type: 'string', description: 'Company universal name' },
                postedLimit: { type: 'string', description: 'Filter by time: 24h, week, month', enum: ['24h', 'week', 'month'] },
                page: { type: 'integer', description: 'Page number', default: 1 },
                paginationToken: { type: 'string', description: 'Pagination token' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum posts (default: 10)', default: 10 },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_job',
            description: 'Get LinkedIn job details. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                jobId: { type: 'string', description: 'LinkedIn job ID' },
                url: { type: 'string', description: 'LinkedIn job URL' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'search_jobs',
            description: 'Search LinkedIn jobs. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Search jobs by title' },
                companyId: { type: 'string', description: 'Filter by company ID' },
                location: { type: 'string', description: 'Filter by location' },
                geoId: { type: 'string', description: 'Filter by LinkedIn Geo ID' },
                sortBy: { type: 'string', description: 'Sort by: relevance or date', enum: ['relevance', 'date'] },
                workplaceType: { type: 'string', description: 'Filter: office, hybrid, remote', enum: ['office', 'hybrid', 'remote'] },
                employmentType: { type: 'string', description: 'Filter: full-time, part-time, contract, temporary, volunteer, internship', enum: ['full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship'] },
                salary: { type: 'string', description: 'Filter by salary: 40k+, 60k+, 80k+, 100k+, 120k+, 140k+, 160k+, 180k+, 200k+' },
                postedLimit: { type: 'string', description: 'Filter by post date: 24h, week, month', enum: ['24h', 'week', 'month'] },
                experienceLevel: { type: 'string', description: 'Filter: internship, entry, associate, mid-senior, director, executive', enum: ['internship', 'entry', 'associate', 'mid-senior', 'director', 'executive'] },
                industryId: { type: 'string', description: 'Filter by industry ID (comma-separated)' },
                functionId: { type: 'string', description: 'Filter by job function ID (comma-separated)' },
                under10Applicants: { type: 'boolean', description: 'Filter jobs with under 10 applicants' },
                easyApply: { type: 'boolean', description: 'Filter Easy Apply jobs' },
                page: { type: 'integer', description: 'Page number', default: 1 },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum results (default: 10)', default: 10 },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_post',
            description: 'Get LinkedIn post details. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'LinkedIn post URL (required)' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
              },
              required: ['url'],
            },
          } as Tool,
          {
            name: 'search_posts',
            description: 'Search LinkedIn posts. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Keywords to search' },
                profile: { type: 'string', description: 'Filter by author profile URL' },
                profileId: { type: 'string', description: 'Filter by author profile ID' },
                company: { type: 'string', description: 'Filter by company name' },
                companyId: { type: 'string', description: 'Filter by company ID' },
                authorsCompany: { type: 'string', description: 'Search posts from employees of a company' },
                authorsCompanyId: { type: 'string', description: 'Filter by company ID of post authors' },
                group: { type: 'string', description: 'Filter by group name' },
                postedLimit: { type: 'string', description: 'Filter by time: 24h, week, month', enum: ['24h', 'week', 'month'] },
                sortBy: { type: 'string', description: 'Sort by: relevance or date', enum: ['relevance', 'date'] },
                page: { type: 'integer', description: 'Page number', default: 1 },
                paginationToken: { type: 'string', description: 'Pagination token' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum results (default: 10)', default: 10 },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_post_comments',
            description: 'Get comments on a LinkedIn post. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                post: { type: 'string', description: 'LinkedIn post URL (required)' },
                sortBy: { type: 'string', description: 'Sort by: relevance or date', enum: ['relevance', 'date'] },
                page: { type: 'integer', description: 'Page number', default: 1 },
                paginationToken: { type: 'string', description: 'Pagination token' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum comments (default: 10)', default: 10 },
              },
              required: ['post'],
            },
          } as Tool,
          {
            name: 'get_post_reactions',
            description: 'Get reactions on a LinkedIn post. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                post: { type: 'string', description: 'LinkedIn post URL (required)' },
                page: { type: 'integer', description: 'Page number', default: 1 },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum reactions (default: 10)', default: 10 },
              },
              required: ['post'],
            },
          } as Tool,
          {
            name: 'get_group',
            description: 'Get LinkedIn group information. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'LinkedIn group URL' },
                groupId: { type: 'string', description: 'LinkedIn group ID' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'search_groups',
            description: 'Search LinkedIn groups. Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Keywords to search' },
                page: { type: 'integer', description: 'Page number', default: 1 },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum results (default: 10)', default: 10 },
              },
              required: ['search'],
            },
          } as Tool,
          {
            name: 'search_geo_id',
            description: 'Search LinkedIn Geo ID by location (for location-based filtering). Returns cleaned data in TOON format.',
            inputSchema: {
              type: 'object',
              properties: {
                search: { type: 'string', description: 'Location text to search' },
                save_dir: { type: 'string', description: 'Directory to save cleaned JSON data' },
                max_items: { type: 'integer', description: 'Maximum results (default: 10)', default: 10 },
              },
              required: ['search'],
            },
          } as Tool,
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        if (!args) throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');

        switch (name) {
          case 'get_profile': return await this.getProfile(args as Record<string, any>);
          case 'search_profiles': return await this.searchProfiles(args as Record<string, any>);
          case 'get_profile_posts': return await this.getProfilePosts(args as Record<string, any>);
          case 'get_profile_comments': return await this.getProfileComments(args as Record<string, any>);
          case 'get_profile_reactions': return await this.getProfileReactions(args as Record<string, any>);
          case 'get_company': return await this.getCompany(args as Record<string, any>);
          case 'search_companies': return await this.searchCompanies(args as Record<string, any>);
          case 'get_company_posts': return await this.getCompanyPosts(args as Record<string, any>);
          case 'get_job': return await this.getJob(args as Record<string, any>);
          case 'search_jobs': return await this.searchJobs(args as Record<string, any>);
          case 'get_post': return await this.getPost(args as Record<string, any>);
          case 'search_posts': return await this.searchPosts(args as Record<string, any>);
          case 'get_post_comments': return await this.getPostComments(args as Record<string, any>);
          case 'get_post_reactions': return await this.getPostReactions(args as Record<string, any>);
          case 'get_group': return await this.getGroup(args as Record<string, any>);
          case 'search_groups': return await this.searchGroups(args as Record<string, any>);
          case 'search_geo_id': return await this.searchGeoId(args as Record<string, any>);
          default: throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new McpError(ErrorCode.InternalError, `HarvestAPI error: ${message}`);
      }
    });
  }

  private async makeRequest(endpoint: string, params?: Record<string, any>): Promise<any> {
    try {
      const config: AxiosRequestConfig = {
        headers: {},
        params: params || {},
      };
      if (this.apiKey && config.headers) {
        config.headers['X-API-Key'] = this.apiKey;
      }
      const response = await this.apiClient.get(endpoint, config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
        throw new Error(`HarvestAPI error (${statusCode}): ${errorMessage}`);
      }
      throw error;
    }
  }

  private saveData(data: any, dir: string, toolName: string): string {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${toolName}_${timestamp}.json`;
      const filepath = path.join(dir, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      return filepath;
    } catch (e) {
      return `Error saving: ${e}`;
    }
  }

  private formatResponse(
    cleanedData: any,
    options: {
      saveDir?: string;
      toolName?: string;
      pagination?: any;
    }
  ): CallToolResult {
    const output: any = { data: cleanedData };
    if (options.pagination) {
      output.pagination = {
        page: options.pagination.pageNumber,
        totalPages: options.pagination.totalPages,
        totalElements: options.pagination.totalElements,
      };
    }

    let savedPath = '';
    if (options.saveDir && options.toolName) {
      savedPath = this.saveData(output, options.saveDir, options.toolName);
    }

    const toonString = encode(output);
    let text = toonString;
    if (savedPath) {
      text += `\n\n[Cleaned data saved to: ${savedPath}]`;
    }

    return {
      content: [{ type: 'text', text }],
    };
  }

  // Profile methods
  private async getProfile(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.url) params.url = args.url;
    if (args.publicIdentifier) params.publicIdentifier = args.publicIdentifier;
    if (args.profileId) params.profileId = args.profileId;
    if (args.findEmail) params.findEmail = args.findEmail;
    if (args.includeAboutProfile) params.includeAboutProfile = args.includeAboutProfile;

    if (!params.url && !params.publicIdentifier && !params.profileId) {
      throw new Error('At least one of url, publicIdentifier, or profileId is required');
    }

    const data = await this.makeRequest('/profile', params);
    const maxItems = args.max_items || 5;
    const cleaned = DataCleaners.cleanProfile(data.element);
    if (cleaned) {
      if (cleaned.experience) cleaned.experience = cleaned.experience.slice(0, maxItems);
      if (cleaned.education) cleaned.education = cleaned.education.slice(0, maxItems);
      if (cleaned.skills) cleaned.skills = cleaned.skills.slice(0, maxItems);
      if (cleaned.certifications) cleaned.certifications = cleaned.certifications.slice(0, maxItems);
    }

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_profile',
    });
  }

  private async searchProfiles(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { search: args.search };
    if (args.currentCompany) params.currentCompany = args.currentCompany;
    if (args.pastCompany) params.pastCompany = args.pastCompany;
    if (args.school) params.school = args.school;
    if (args.firstName) params.firstName = args.firstName;
    if (args.lastName) params.lastName = args.lastName;
    if (args.title) params.title = args.title;
    if (args.location) params.location = args.location;
    if (args.geoId) params.geoId = args.geoId;
    if (args.industryId) params.industryId = args.industryId;
    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/profile-search', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanProfileSearchResult);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'search_profiles',
      pagination: data.pagination,
    });
  }

  private async getProfilePosts(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.profile) params.profile = args.profile;
    if (args.profileId) params.profileId = args.profileId;
    if (args.profilePublicIdentifier) params.profilePublicIdentifier = args.profilePublicIdentifier;
    if (args.postedLimit) params.postedLimit = args.postedLimit;
    if (args.page) params.page = args.page;
    if (args.paginationToken) params.paginationToken = args.paginationToken;

    if (!params.profile && !params.profileId && !params.profilePublicIdentifier) {
      throw new Error('At least one of profile, profileId, or profilePublicIdentifier is required');
    }

    const data = await this.makeRequest('/profile-posts', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanPost);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_profile_posts',
      pagination: data.pagination,
    });
  }

  private async getProfileComments(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.profile) params.profile = args.profile;
    if (args.profileId) params.profileId = args.profileId;
    if (args.postedLimit) params.postedLimit = args.postedLimit;
    if (args.page) params.page = args.page;
    if (args.paginationToken) params.paginationToken = args.paginationToken;

    if (!params.profile && !params.profileId) {
      throw new Error('At least one of profile or profileId is required');
    }

    const data = await this.makeRequest('/profile-comments', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanComment);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_profile_comments',
      pagination: data.pagination,
    });
  }

  private async getProfileReactions(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.profile) params.profile = args.profile;
    if (args.profileId) params.profileId = args.profileId;
    if (args.page) params.page = args.page;
    if (args.paginationToken) params.paginationToken = args.paginationToken;

    if (!params.profile && !params.profileId) {
      throw new Error('At least one of profile or profileId is required');
    }

    const data = await this.makeRequest('/profile-reactions', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanReaction);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_profile_reactions',
      pagination: data.pagination,
    });
  }

  // Company methods
  private async getCompany(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.url) params.url = args.url;
    if (args.universalName) params.universalName = args.universalName;
    if (args.search) params.search = args.search;

    if (!params.url && !params.universalName && !params.search) {
      throw new Error('At least one of url, universalName, or search is required');
    }

    const data = await this.makeRequest('/company', params);
    const cleaned = DataCleaners.cleanCompany(data.element);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_company',
    });
  }

  private async searchCompanies(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { search: args.search };
    if (args.location) params.location = args.location;
    if (args.geoId) params.geoId = args.geoId;
    if (args.companySize) params.companySize = args.companySize;
    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/company-search', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanCompany);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'search_companies',
      pagination: data.pagination,
    });
  }

  private async getCompanyPosts(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.company) params.company = args.company;
    if (args.companyId) params.companyId = args.companyId;
    if (args.companyUniversalName) params.companyUniversalName = args.companyUniversalName;
    if (args.postedLimit) params.postedLimit = args.postedLimit;
    if (args.page) params.page = args.page;
    if (args.paginationToken) params.paginationToken = args.paginationToken;

    if (!params.company && !params.companyId && !params.companyUniversalName) {
      throw new Error('At least one of company, companyId, or companyUniversalName is required');
    }

    const data = await this.makeRequest('/company-posts', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanPost);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_company_posts',
      pagination: data.pagination,
    });
  }

  // Job methods
  private async getJob(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.jobId) params.jobId = args.jobId;
    if (args.url) params.url = args.url;

    if (!params.jobId && !params.url) {
      throw new Error('At least one of jobId or url is required');
    }

    const data = await this.makeRequest('/job', params);
    const cleaned = DataCleaners.cleanJob(data.element);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_job',
    });
  }

  private async searchJobs(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.search) params.search = args.search;
    if (args.companyId) params.companyId = args.companyId;
    if (args.location) params.location = args.location;
    if (args.geoId) params.geoId = args.geoId;
    if (args.sortBy) params.sortBy = args.sortBy;
    if (args.workplaceType) params.workplaceType = args.workplaceType;
    if (args.employmentType) params.employmentType = args.employmentType;
    if (args.salary) params.salary = args.salary;
    if (args.postedLimit) params.postedLimit = args.postedLimit;
    if (args.experienceLevel) params.experienceLevel = args.experienceLevel;
    if (args.industryId) params.industryId = args.industryId;
    if (args.functionId) params.functionId = args.functionId;
    if (args.under10Applicants) params.under10Applicants = args.under10Applicants;
    if (args.easyApply !== undefined) params.easyApply = args.easyApply;
    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/job-search', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanJobSearchResult);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'search_jobs',
      pagination: data.pagination,
    });
  }

  // Post methods
  private async getPost(args: Record<string, any>): Promise<CallToolResult> {
    const data = await this.makeRequest('/post', { url: args.url });
    const cleaned = DataCleaners.cleanPost(data.element);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_post',
    });
  }

  private async searchPosts(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.search) params.search = args.search;
    if (args.profile) params.profile = args.profile;
    if (args.profileId) params.profileId = args.profileId;
    if (args.company) params.company = args.company;
    if (args.companyId) params.companyId = args.companyId;
    if (args.authorsCompany) params.authorsCompany = args.authorsCompany;
    if (args.authorsCompanyId) params.authorsCompanyId = args.authorsCompanyId;
    if (args.group) params.group = args.group;
    if (args.postedLimit) params.postedLimit = args.postedLimit;
    if (args.sortBy) params.sortBy = args.sortBy;
    if (args.page) params.page = args.page;
    if (args.paginationToken) params.paginationToken = args.paginationToken;

    const data = await this.makeRequest('/post-search', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanPost);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'search_posts',
      pagination: data.pagination,
    });
  }

  private async getPostComments(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { post: args.post };
    if (args.sortBy) params.sortBy = args.sortBy;
    if (args.page) params.page = args.page;
    if (args.paginationToken) params.paginationToken = args.paginationToken;

    const data = await this.makeRequest('/post-comments', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanComment);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_post_comments',
      pagination: data.pagination,
    });
  }

  private async getPostReactions(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { post: args.post };
    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/post-reactions', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanReaction);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_post_reactions',
      pagination: data.pagination,
    });
  }

  // Group methods
  private async getGroup(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = {};
    if (args.url) params.url = args.url;
    if (args.groupId) params.groupId = args.groupId;

    if (!params.url && !params.groupId) {
      throw new Error('At least one of url or groupId is required');
    }

    const data = await this.makeRequest('/group', params);
    const cleaned = DataCleaners.cleanGroup(data.element);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'get_group',
    });
  }

  private async searchGroups(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { search: args.search };
    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/group-search', params);
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanGroup);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'search_groups',
      pagination: data.pagination,
    });
  }

  // Geo ID method
  private async searchGeoId(args: Record<string, any>): Promise<CallToolResult> {
    const data = await this.makeRequest('/geo-id-search', { search: args.search });
    const maxItems = args.max_items || 10;
    const cleaned = (data.elements || []).slice(0, maxItems).map(DataCleaners.cleanGeoId);

    return this.formatResponse(cleaned, {
      
      saveDir: args.save_dir,
      toolName: 'search_geo_id',
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new LinkedInAPIMCPServer();
server.run().catch(console.error);
