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
import { JsonResponseHandler } from '@yilin-jing/mcp-json-utils';

/**
 * Interface definitions for HarvestAPI LinkedIn responses
 */
interface LinkedInProfile {
  id: string;
  publicIdentifier: string;
  name: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  summary?: string;
  location?: {
    linkedinText: string;
  };
  linkedinUrl: string;
  photo?: string;
  backgroundImage?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    name: string;
    authority?: string;
    date?: string;
  }>;
}

interface LinkedInCompany {
  id: string;
  universalName: string;
  name: string;
  tagline?: string;
  website?: string;
  linkedinUrl: string;
  logo?: string;
  description?: string;
  employeeCount?: number;
  employeeCountRange?: string;
  followerCount?: number;
  foundedOn?: {
    year: number;
    month?: number;
    day?: number;
  };
  headquarter?: {
    city?: string;
    country?: string;
    postalCode?: string;
  };
  industries?: string[];
  specialities?: string[];
}

interface LinkedInJob {
  id: string;
  title: string;
  linkedinUrl: string;
  jobState?: string;
  postedDate?: string;
  descriptionText?: string;
  descriptionHtml?: string;
  location?: {
    linkedinText?: string;
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
  };
  employmentType?: string;
  workplaceType?: string;
  workRemoteAllowed?: boolean;
  applicants?: number;
  views?: number;
  companyName?: string;
  companyLogo?: string;
  companyLink?: string;
  companyUniversalName?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    text?: string;
  };
  easyApplyUrl?: string;
}

interface LinkedInPost {
  id: string;
  content: string;
  linkedinUrl: string;
  author?: {
    publicIdentifier?: string;
    universalName?: string;
    name: string;
    linkedinUrl?: string;
    avatar?: {
      url: string;
      width?: number;
      height?: number;
    };
  };
  postedAgo?: string;
  postImages?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    reactions?: Array<{
      type: string;
      count: number;
    }>;
  };
}

interface LinkedInGroup {
  id: string;
  linkedinUrl: string;
  name: string;
  memberCount?: number;
  description?: string;
  rules?: string;
  logo?: {
    url: string;
    width?: number;
    height?: number;
  };
}

interface PaginationInfo {
  totalPages: number;
  totalElements: number;
  pageNumber: number;
  previousElements?: number;
  pageSize: number;
  paginationToken?: string;
}

interface ApiResponse<T> {
  element?: T;
  elements?: T[];
  pagination?: PaginationInfo;
  status: string;
  error?: string;
  query?: Record<string, any>;
}

/**
 * LinkedIn API MCP Server
 * Provides access to LinkedIn data through HarvestAPI service
 */
class LinkedInAPIMCPServer {
  private server: Server;
  private apiClient: AxiosInstance;
  private apiKey: string;

  constructor() {
    // Get API key from environment
    this.apiKey = process.env.HARVESTAPI_API_KEY || process.env.LINKEDIN_API_KEY || '';

    this.server = new Server(
      {
        name: 'linkedin-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Configure axios client with proxy support
    const axiosConfig: AxiosRequestConfig = {
      baseURL: 'https://api.harvest-api.com/linkedin',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LinkedIn-MCP-Server/1.0.0'
      }
    };

    // Proxy support for enterprise environments
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
          // Profile endpoints
          {
            name: 'get_profile',
            description: 'Get LinkedIn profile information by URL, public identifier, or profile ID',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'LinkedIn profile URL',
                },
                publicIdentifier: {
                  type: 'string',
                  description: 'Public identifier (last part of LinkedIn URL)',
                },
                profileId: {
                  type: 'string',
                  description: 'LinkedIn profile ID',
                },
                findEmail: {
                  type: 'boolean',
                  description: 'Find email address for the profile',
                  default: false,
                },
                includeAboutProfile: {
                  type: 'boolean',
                  description: 'Include detailed about section',
                  default: false,
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'search_profiles',
            description: 'Search LinkedIn profiles by name, company, location, and other criteria',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Search profiles by name',
                },
                currentCompany: {
                  type: 'string',
                  description: 'Filter by current company ID or URL (comma-separated for multiple)',
                },
                pastCompany: {
                  type: 'string',
                  description: 'Filter by past company ID or URL (comma-separated for multiple)',
                },
                school: {
                  type: 'string',
                  description: 'Filter by school ID or URL (comma-separated for multiple)',
                },
                firstName: {
                  type: 'string',
                  description: 'Filter by first name',
                },
                lastName: {
                  type: 'string',
                  description: 'Filter by last name',
                },
                title: {
                  type: 'string',
                  description: 'Filter by job title',
                },
                location: {
                  type: 'string',
                  description: 'Filter by location text',
                },
                geoId: {
                  type: 'string',
                  description: 'Filter by LinkedIn Geo ID (use search_geo_id to find)',
                },
                industryId: {
                  type: 'string',
                  description: 'Filter by industry ID (comma-separated for multiple)',
                },
                keywordsCompany: {
                  type: 'string',
                  description: 'Filter by keywords in company name',
                },
                keywordsSchool: {
                  type: 'string',
                  description: 'Filter by keywords in school name',
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: ['search'],
            },
          } as Tool,
          {
            name: 'get_profile_posts',
            description: 'Get posts from a LinkedIn profile',
            inputSchema: {
              type: 'object',
              properties: {
                profile: {
                  type: 'string',
                  description: 'LinkedIn profile URL',
                },
                profileId: {
                  type: 'string',
                  description: 'LinkedIn profile ID (faster)',
                },
                profilePublicIdentifier: {
                  type: 'string',
                  description: 'Profile public identifier',
                },
                postedLimit: {
                  type: 'string',
                  description: 'Filter by time: 24h, week, month',
                  enum: ['24h', 'week', 'month'],
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                paginationToken: {
                  type: 'string',
                  description: 'Pagination token for next page',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_profile_comments',
            description: 'Get comments made by a LinkedIn profile',
            inputSchema: {
              type: 'object',
              properties: {
                profile: {
                  type: 'string',
                  description: 'LinkedIn profile URL',
                },
                profileId: {
                  type: 'string',
                  description: 'LinkedIn profile ID (faster)',
                },
                postedLimit: {
                  type: 'string',
                  description: 'Filter by time: 24h, week, month',
                  enum: ['24h', 'week', 'month'],
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                paginationToken: {
                  type: 'string',
                  description: 'Pagination token for next page',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_profile_reactions',
            description: 'Get reactions from a LinkedIn profile',
            inputSchema: {
              type: 'object',
              properties: {
                profile: {
                  type: 'string',
                  description: 'LinkedIn profile URL',
                },
                profileId: {
                  type: 'string',
                  description: 'LinkedIn profile ID (faster)',
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                paginationToken: {
                  type: 'string',
                  description: 'Pagination token for next page',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,

          // Company endpoints
          {
            name: 'get_company',
            description: 'Get LinkedIn company information by URL, universal name, or search',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'LinkedIn company URL',
                },
                universalName: {
                  type: 'string',
                  description: 'Company universal name (found in URL)',
                },
                search: {
                  type: 'string',
                  description: 'Company name to search (returns most relevant result)',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'search_companies',
            description: 'Search LinkedIn companies by keywords and filters',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Keywords to search for in company names',
                },
                location: {
                  type: 'string',
                  description: 'Filter by location',
                },
                geoId: {
                  type: 'string',
                  description: 'Filter by LinkedIn Geo ID (overrides location)',
                },
                companySize: {
                  type: 'string',
                  description: 'Filter by company size (comma-separated): 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10001+',
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: ['search'],
            },
          } as Tool,
          {
            name: 'get_company_posts',
            description: 'Get posts from a LinkedIn company page',
            inputSchema: {
              type: 'object',
              properties: {
                company: {
                  type: 'string',
                  description: 'LinkedIn company URL',
                },
                companyId: {
                  type: 'string',
                  description: 'LinkedIn company ID (faster)',
                },
                companyUniversalName: {
                  type: 'string',
                  description: 'Company universal name',
                },
                postedLimit: {
                  type: 'string',
                  description: 'Filter by time: 24h, week, month',
                  enum: ['24h', 'week', 'month'],
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                paginationToken: {
                  type: 'string',
                  description: 'Pagination token for next page',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,

          // Job endpoints
          {
            name: 'get_job',
            description: 'Get LinkedIn job details by ID or URL',
            inputSchema: {
              type: 'object',
              properties: {
                jobId: {
                  type: 'string',
                  description: 'LinkedIn job ID',
                },
                url: {
                  type: 'string',
                  description: 'LinkedIn job URL',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'search_jobs',
            description: 'Search LinkedIn jobs with various filters',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Search jobs by title',
                },
                companyId: {
                  type: 'string',
                  description: 'Filter by company ID (comma-separated for multiple)',
                },
                location: {
                  type: 'string',
                  description: 'Filter by location text',
                },
                geoId: {
                  type: 'string',
                  description: 'Filter by LinkedIn Geo ID (overrides location)',
                },
                sortBy: {
                  type: 'string',
                  description: 'Sort by: relevance or date',
                  enum: ['relevance', 'date'],
                },
                workplaceType: {
                  type: 'string',
                  description: 'Filter by workplace type: office, hybrid, remote',
                  enum: ['office', 'hybrid', 'remote'],
                },
                employmentType: {
                  type: 'string',
                  description: 'Filter by employment type: full-time, part-time, contract, temporary, volunteer, internship',
                  enum: ['full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship'],
                },
                salary: {
                  type: 'string',
                  description: 'Filter by salary: 40k+, 60k+, 80k+, 100k+, 120k+, 140k+, 160k+, 180k+, 200k+',
                },
                postedLimit: {
                  type: 'string',
                  description: 'Filter by post date: 24h, week, month',
                  enum: ['24h', 'week', 'month'],
                },
                experienceLevel: {
                  type: 'string',
                  description: 'Filter by experience level: internship, entry, associate, mid-senior, director, executive',
                  enum: ['internship', 'entry', 'associate', 'mid-senior', 'director', 'executive'],
                },
                industryId: {
                  type: 'string',
                  description: 'Filter by industry ID (comma-separated)',
                },
                functionId: {
                  type: 'string',
                  description: 'Filter by job function ID (comma-separated)',
                },
                under10Applicants: {
                  type: 'boolean',
                  description: 'Filter jobs with under 10 applicants',
                },
                easyApply: {
                  type: 'boolean',
                  description: 'Filter Easy Apply jobs',
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,

          // Post endpoints
          {
            name: 'get_post',
            description: 'Get LinkedIn post details by URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'LinkedIn post URL (required)',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: ['url'],
            },
          } as Tool,
          {
            name: 'search_posts',
            description: 'Search LinkedIn posts by keywords and filters',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Keywords to search for in posts',
                },
                profile: {
                  type: 'string',
                  description: 'Filter by author profile URL',
                },
                profileId: {
                  type: 'string',
                  description: 'Filter by author profile ID',
                },
                company: {
                  type: 'string',
                  description: 'Filter by company name',
                },
                companyId: {
                  type: 'string',
                  description: 'Filter by company ID',
                },
                authorsCompany: {
                  type: 'string',
                  description: 'Search posts from employees of a company',
                },
                authorsCompanyId: {
                  type: 'string',
                  description: 'Filter by company ID of post authors',
                },
                group: {
                  type: 'string',
                  description: 'Filter by group name',
                },
                postedLimit: {
                  type: 'string',
                  description: 'Filter by time: 24h, week, month',
                  enum: ['24h', 'week', 'month'],
                },
                sortBy: {
                  type: 'string',
                  description: 'Sort by relevance or date',
                  enum: ['relevance', 'date'],
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                paginationToken: {
                  type: 'string',
                  description: 'Pagination token for next page',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'get_post_comments',
            description: 'Get comments on a LinkedIn post',
            inputSchema: {
              type: 'object',
              properties: {
                post: {
                  type: 'string',
                  description: 'LinkedIn post URL (required)',
                },
                sortBy: {
                  type: 'string',
                  description: 'Sort by: relevance or date',
                  enum: ['relevance', 'date'],
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                paginationToken: {
                  type: 'string',
                  description: 'Pagination token (required for relevance sort on page > 1)',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: ['post'],
            },
          } as Tool,
          {
            name: 'get_post_reactions',
            description: 'Get reactions on a LinkedIn post',
            inputSchema: {
              type: 'object',
              properties: {
                post: {
                  type: 'string',
                  description: 'LinkedIn post URL (required)',
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: ['post'],
            },
          } as Tool,

          // Group endpoints
          {
            name: 'get_group',
            description: 'Get LinkedIn group information by URL or ID',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'LinkedIn group URL',
                },
                groupId: {
                  type: 'string',
                  description: 'LinkedIn group ID',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: [],
            },
          } as Tool,
          {
            name: 'search_groups',
            description: 'Search LinkedIn groups by keywords',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Keywords to search for in group names/descriptions',
                },
                page: {
                  type: 'integer',
                  description: 'Page number for pagination',
                  default: 1,
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
              },
              required: ['search'],
            },
          } as Tool,

          // Geo ID endpoint
          {
            name: 'search_geo_id',
            description: 'Search LinkedIn Geo ID by location text (useful for location-based filtering)',
            inputSchema: {
              type: 'object',
              properties: {
                search: {
                  type: 'string',
                  description: 'Location text to search for Geo ID',
                },
                raw_data_save_dir: {
                  type: 'string',
                  description: 'Directory path to save raw response data',
                },
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

        if (!args) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
        }

        switch (name) {
          // Profile endpoints
          case 'get_profile':
            return await this.getProfile(args as Record<string, any>);
          case 'search_profiles':
            return await this.searchProfiles(args as Record<string, any>);
          case 'get_profile_posts':
            return await this.getProfilePosts(args as Record<string, any>);
          case 'get_profile_comments':
            return await this.getProfileComments(args as Record<string, any>);
          case 'get_profile_reactions':
            return await this.getProfileReactions(args as Record<string, any>);

          // Company endpoints
          case 'get_company':
            return await this.getCompany(args as Record<string, any>);
          case 'search_companies':
            return await this.searchCompanies(args as Record<string, any>);
          case 'get_company_posts':
            return await this.getCompanyPosts(args as Record<string, any>);

          // Job endpoints
          case 'get_job':
            return await this.getJob(args as Record<string, any>);
          case 'search_jobs':
            return await this.searchJobs(args as Record<string, any>);

          // Post endpoints
          case 'get_post':
            return await this.getPost(args as Record<string, any>);
          case 'search_posts':
            return await this.searchPosts(args as Record<string, any>);
          case 'get_post_comments':
            return await this.getPostComments(args as Record<string, any>);
          case 'get_post_reactions':
            return await this.getPostReactions(args as Record<string, any>);

          // Group endpoints
          case 'get_group':
            return await this.getGroup(args as Record<string, any>);
          case 'search_groups':
            return await this.searchGroups(args as Record<string, any>);

          // Geo ID endpoint
          case 'search_geo_id':
            return await this.searchGeoId(args as Record<string, any>);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

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

      // Add API key if available
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

  // JSON response handler for formatting and limiting responses
  private jsonHandler = new JsonResponseHandler({ maxItemsForContext: 10 });

  private formatResponse(data: any, options?: { rawDataSaveDir?: string; toolName?: string; params?: Record<string, any> }): CallToolResult {
    return this.jsonHandler.formatResponse(data, options);
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_profile', params: args });
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
    if (args.keywordsCompany) params.keywordsCompany = args.keywordsCompany;
    if (args.keywordsSchool) params.keywordsSchool = args.keywordsSchool;
    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/profile-search', params);
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'search_profiles', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_profile_posts', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_profile_comments', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_profile_reactions', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_company', params: args });
  }

  private async searchCompanies(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { search: args.search };

    if (args.location) params.location = args.location;
    if (args.geoId) params.geoId = args.geoId;
    if (args.companySize) params.companySize = args.companySize;
    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/company-search', params);
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'search_companies', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_company_posts', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_job', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'search_jobs', params: args });
  }

  // Post methods
  private async getPost(args: Record<string, any>): Promise<CallToolResult> {
    const data = await this.makeRequest('/post', { url: args.url });
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_post', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'search_posts', params: args });
  }

  private async getPostComments(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { post: args.post };

    if (args.sortBy) params.sortBy = args.sortBy;
    if (args.page) params.page = args.page;
    if (args.paginationToken) params.paginationToken = args.paginationToken;

    const data = await this.makeRequest('/post-comments', params);
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_post_comments', params: args });
  }

  private async getPostReactions(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { post: args.post };

    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/post-reactions', params);
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_post_reactions', params: args });
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
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'get_group', params: args });
  }

  private async searchGroups(args: Record<string, any>): Promise<CallToolResult> {
    const params: Record<string, any> = { search: args.search };

    if (args.page) params.page = args.page;

    const data = await this.makeRequest('/group-search', params);
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'search_groups', params: args });
  }

  // Geo ID method
  private async searchGeoId(args: Record<string, any>): Promise<CallToolResult> {
    const data = await this.makeRequest('/geo-id-search', { search: args.search });
    return this.formatResponse(data, { rawDataSaveDir: args.raw_data_save_dir, toolName: 'search_geo_id', params: args });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new LinkedInAPIMCPServer();
server.run().catch(console.error);
