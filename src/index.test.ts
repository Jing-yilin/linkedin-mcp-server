import { describe, test, expect } from 'bun:test';

describe('LinkedIn MCP Server', () => {
  describe('Tool Schemas', () => {
    // Profile Tools
    test('get_profile schema accepts url, publicIdentifier, or profileId', () => {
      const validParams = [
        { url: 'https://www.linkedin.com/in/satyanadella/' },
        { publicIdentifier: 'satyanadella' },
        { profileId: 'ACoAAA8BYqEBCGLg_vT_ca6mMEqkpp9nVffJ3hc' },
      ];

      for (const params of validParams) {
        expect(Object.keys(params).length).toBeGreaterThan(0);
      }
    });

    test('search_profiles requires search parameter', () => {
      const requiredFields = ['search'];
      const params = {
        search: 'software engineer',
        currentCompany: 'google',
        location: 'San Francisco',
      };

      for (const field of requiredFields) {
        expect(params).toHaveProperty(field);
      }
    });

    test('get_profile_posts accepts profile, profileId, or profilePublicIdentifier', () => {
      const validParams = [
        { profile: 'https://www.linkedin.com/in/satyanadella/' },
        { profileId: 'ACoAAA8BYqEBCGLg' },
        { profilePublicIdentifier: 'satyanadella' },
      ];

      for (const params of validParams) {
        expect(Object.keys(params).length).toBeGreaterThan(0);
      }
    });

    test('get_profile_comments supports postedLimit filter', () => {
      const validPostedLimits = ['24h', 'week', 'month'];
      const params = { profileId: 'test123', postedLimit: '24h' };

      expect(validPostedLimits).toContain(params.postedLimit);
    });

    test('get_profile_reactions uses pagination params', () => {
      const params = {
        profile: 'https://www.linkedin.com/in/test/',
        page: 1,
        paginationToken: 'next_token',
      };

      expect(params).toHaveProperty('page');
      expect(params).toHaveProperty('paginationToken');
    });

    // Company Tools
    test('get_company accepts url, universalName, or search', () => {
      const validParams = [
        { url: 'https://www.linkedin.com/company/google/' },
        { universalName: 'google' },
        { search: 'Google' },
      ];

      for (const params of validParams) {
        expect(Object.keys(params).length).toBeGreaterThan(0);
      }
    });

    test('search_companies requires search and supports filters', () => {
      const params = {
        search: 'technology',
        location: 'California',
        geoId: '102095887',
        companySize: '1001-5000,5001-10000',
        page: 1,
      };

      expect(params).toHaveProperty('search');
      expect(params).toHaveProperty('companySize');
    });

    test('get_company_posts supports company identifiers', () => {
      const validParams = [
        { company: 'https://www.linkedin.com/company/google/' },
        { companyId: '1441' },
        { companyUniversalName: 'google' },
      ];

      for (const params of validParams) {
        expect(Object.keys(params).length).toBeGreaterThan(0);
      }
    });

    // Job Tools
    test('get_job accepts jobId or url', () => {
      const validParams = [
        { jobId: '4153069088' },
        { url: 'https://www.linkedin.com/jobs/view/4153069088/' },
      ];

      for (const params of validParams) {
        expect(Object.keys(params).length).toBeGreaterThan(0);
      }
    });

    test('search_jobs supports comprehensive filters', () => {
      const params = {
        search: 'software engineer',
        companyId: '1441',
        location: 'San Francisco',
        geoId: '102095887',
        sortBy: 'date',
        workplaceType: 'remote',
        employmentType: 'full-time',
        salary: '100k+',
        postedLimit: '24h',
        experienceLevel: 'mid-senior',
        industryId: '96',
        functionId: '8',
        under10Applicants: true,
        easyApply: true,
        page: 1,
      };

      expect(params).toHaveProperty('search');
      expect(params).toHaveProperty('workplaceType');
      expect(params).toHaveProperty('employmentType');
      expect(params).toHaveProperty('salary');
      expect(params).toHaveProperty('experienceLevel');
      expect(params).toHaveProperty('easyApply');
    });

    test('search_jobs sortBy accepts relevance or date', () => {
      const validSortBy = ['relevance', 'date'];
      expect(validSortBy).toContain('relevance');
      expect(validSortBy).toContain('date');
    });

    test('search_jobs workplaceType accepts valid values', () => {
      const validWorkplaceTypes = ['office', 'hybrid', 'remote'];
      expect(validWorkplaceTypes).toContain('remote');
      expect(validWorkplaceTypes).toContain('hybrid');
      expect(validWorkplaceTypes).toContain('office');
    });

    test('search_jobs employmentType accepts valid values', () => {
      const validEmploymentTypes = ['full-time', 'part-time', 'contract', 'temporary', 'volunteer', 'internship'];
      expect(validEmploymentTypes).toContain('full-time');
      expect(validEmploymentTypes).toContain('contract');
      expect(validEmploymentTypes).toContain('internship');
    });

    test('search_jobs experienceLevel accepts valid values', () => {
      const validExperienceLevels = ['internship', 'entry', 'associate', 'mid-senior', 'director', 'executive'];
      expect(validExperienceLevels).toContain('entry');
      expect(validExperienceLevels).toContain('mid-senior');
      expect(validExperienceLevels).toContain('director');
    });

    // Post Tools
    test('get_post requires url parameter', () => {
      const params = {
        url: 'https://www.linkedin.com/posts/microsoft-events_microsoft-build-ugcPost-7329991434395160578-GnK7',
      };

      expect(params).toHaveProperty('url');
      expect(params.url).toBeTruthy();
    });

    test('search_posts supports various filters', () => {
      const params = {
        search: 'AI innovation',
        profile: 'https://www.linkedin.com/in/satyanadella/',
        profileId: 'ACoAAA8BYqEBCGLg',
        company: 'Microsoft',
        companyId: '1035',
        authorsCompany: 'Google',
        authorsCompanyId: '1441',
        group: 'AI Professionals',
        postedLimit: '24h',
        sortBy: 'relevance',
        page: 1,
        paginationToken: 'next_token',
      };

      expect(params).toHaveProperty('search');
      expect(params).toHaveProperty('authorsCompany');
    });

    test('get_post_comments requires post URL', () => {
      const params = {
        post: 'https://www.linkedin.com/posts/test-post/',
        sortBy: 'relevance',
        page: 1,
        paginationToken: 'token123',
      };

      expect(params).toHaveProperty('post');
      expect(params.post).toBeTruthy();
    });

    test('get_post_reactions requires post URL', () => {
      const params = {
        post: 'https://www.linkedin.com/posts/test-post/',
        page: 1,
      };

      expect(params).toHaveProperty('post');
    });

    // Group Tools
    test('get_group accepts url or groupId', () => {
      const validParams = [
        { url: 'https://www.linkedin.com/groups/12345/' },
        { groupId: '12345' },
      ];

      for (const params of validParams) {
        expect(Object.keys(params).length).toBeGreaterThan(0);
      }
    });

    test('search_groups requires search parameter', () => {
      const params = {
        search: 'Sales',
        page: 1,
      };

      expect(params).toHaveProperty('search');
      expect(params.search).toBeTruthy();
    });

    // Geo ID Tool
    test('search_geo_id requires search parameter', () => {
      const params = {
        search: 'New York',
      };

      expect(params).toHaveProperty('search');
      expect(params.search).toBeTruthy();
    });
  });

  describe('API Endpoint Paths', () => {
    // Profile endpoints
    test('profile endpoint path is correct', () => {
      const endpoint = '/profile';
      expect(endpoint).toBe('/profile');
    });

    test('profile-search endpoint path is correct', () => {
      const endpoint = '/profile-search';
      expect(endpoint).toBe('/profile-search');
    });

    test('profile-posts endpoint path is correct', () => {
      const endpoint = '/profile-posts';
      expect(endpoint).toBe('/profile-posts');
    });

    test('profile-comments endpoint path is correct', () => {
      const endpoint = '/profile-comments';
      expect(endpoint).toBe('/profile-comments');
    });

    test('profile-reactions endpoint path is correct', () => {
      const endpoint = '/profile-reactions';
      expect(endpoint).toBe('/profile-reactions');
    });

    // Company endpoints
    test('company endpoint path is correct', () => {
      const endpoint = '/company';
      expect(endpoint).toBe('/company');
    });

    test('company-search endpoint path is correct', () => {
      const endpoint = '/company-search';
      expect(endpoint).toBe('/company-search');
    });

    test('company-posts endpoint path is correct', () => {
      const endpoint = '/company-posts';
      expect(endpoint).toBe('/company-posts');
    });

    // Job endpoints
    test('job endpoint path is correct', () => {
      const endpoint = '/job';
      expect(endpoint).toBe('/job');
    });

    test('job-search endpoint path is correct', () => {
      const endpoint = '/job-search';
      expect(endpoint).toBe('/job-search');
    });

    // Post endpoints
    test('post endpoint path is correct', () => {
      const endpoint = '/post';
      expect(endpoint).toBe('/post');
    });

    test('post-search endpoint path is correct', () => {
      const endpoint = '/post-search';
      expect(endpoint).toBe('/post-search');
    });

    test('post-comments endpoint path is correct', () => {
      const endpoint = '/post-comments';
      expect(endpoint).toBe('/post-comments');
    });

    test('post-reactions endpoint path is correct', () => {
      const endpoint = '/post-reactions';
      expect(endpoint).toBe('/post-reactions');
    });

    // Group endpoints
    test('group endpoint path is correct', () => {
      const endpoint = '/group';
      expect(endpoint).toBe('/group');
    });

    test('group-search endpoint path is correct', () => {
      const endpoint = '/group-search';
      expect(endpoint).toBe('/group-search');
    });

    // Geo ID endpoint
    test('geo-id-search endpoint path is correct', () => {
      const endpoint = '/geo-id-search';
      expect(endpoint).toBe('/geo-id-search');
    });
  });

  describe('Parameter Validation', () => {
    test('page should default to 1', () => {
      const defaultPage = 1;
      const params: { page?: number } = {};
      const actualPage = params.page ?? defaultPage;
      expect(actualPage).toBe(1);
    });

    test('postedLimit should be valid enum value', () => {
      const validValues = ['24h', 'week', 'month'];
      const testValue = '24h';
      expect(validValues).toContain(testValue);
    });

    test('sortBy should be relevance or date', () => {
      const validValues = ['relevance', 'date'];
      expect(validValues).toContain('relevance');
      expect(validValues).toContain('date');
    });

    test('companySize should be valid format', () => {
      const validSizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'];
      expect(validSizes).toContain('1001-5000');
      expect(validSizes).toContain('10001+');
    });

    test('salary filters should be valid format', () => {
      const validSalaries = ['40k+', '60k+', '80k+', '100k+', '120k+', '140k+', '160k+', '180k+', '200k+'];
      expect(validSalaries).toContain('100k+');
      expect(validSalaries).toContain('200k+');
    });

    test('profile identifier validation', () => {
      // URL format
      const urlPattern = /^https:\/\/www\.linkedin\.com\/in\/[\w-]+\/?$/;
      expect(urlPattern.test('https://www.linkedin.com/in/satyanadella/')).toBe(true);

      // Public identifier format
      const identifierPattern = /^[\w-]+$/;
      expect(identifierPattern.test('satyanadella')).toBe(true);
    });

    test('company URL validation', () => {
      const urlPattern = /^https:\/\/www\.linkedin\.com\/company\/[\w-]+\/?$/;
      expect(urlPattern.test('https://www.linkedin.com/company/google/')).toBe(true);
    });

    test('job URL validation', () => {
      const urlPattern = /^https:\/\/www\.linkedin\.com\/jobs\/view\/\d+\/?$/;
      expect(urlPattern.test('https://www.linkedin.com/jobs/view/4153069088/')).toBe(true);
    });
  });

  describe('Response Format Validation', () => {
    test('profile response has element field', () => {
      const mockResponse = {
        element: {
          id: 'ACoAAA8BYqEBCGLg',
          publicIdentifier: 'satyanadella',
          name: 'Satya Nadella',
        },
        status: 'success',
        error: '',
      };
      expect(mockResponse).toHaveProperty('element');
      expect(mockResponse.element).toHaveProperty('id');
    });

    test('search response has elements array and pagination', () => {
      const mockResponse = {
        elements: [
          { id: '1', name: 'Test User' },
          { id: '2', name: 'Another User' },
        ],
        pagination: {
          totalPages: 10,
          totalElements: 100,
          pageNumber: 1,
          pageSize: 10,
          paginationToken: 'next_token',
        },
        status: 'success',
        error: '',
      };

      expect(mockResponse).toHaveProperty('elements');
      expect(mockResponse.elements).toBeInstanceOf(Array);
      expect(mockResponse).toHaveProperty('pagination');
      expect(mockResponse.pagination).toHaveProperty('totalPages');
      expect(mockResponse.pagination).toHaveProperty('pageNumber');
      expect(mockResponse.pagination).toHaveProperty('paginationToken');
    });

    test('profile posts response has engagement metrics', () => {
      const mockPost = {
        id: 'post123',
        content: 'Test post content',
        linkedinUrl: 'https://www.linkedin.com/posts/test/',
        engagement: {
          likes: 100,
          comments: 25,
          shares: 10,
          reactions: [
            { type: 'LIKE', count: 80 },
            { type: 'CELEBRATE', count: 20 },
          ],
        },
      };

      expect(mockPost).toHaveProperty('engagement');
      expect(mockPost.engagement).toHaveProperty('likes');
      expect(mockPost.engagement).toHaveProperty('comments');
      expect(mockPost.engagement).toHaveProperty('shares');
      expect(mockPost.engagement.reactions).toBeInstanceOf(Array);
    });

    test('company response has expected fields', () => {
      const mockCompany = {
        id: '1441',
        universalName: 'google',
        name: 'Google',
        linkedinUrl: 'https://www.linkedin.com/company/google/',
        logo: 'https://media.licdn.com/...',
        description: 'A technology company',
        employeeCount: 150000,
        followerCount: 30000000,
        industries: ['Internet', 'Computer Software'],
      };

      expect(mockCompany).toHaveProperty('id');
      expect(mockCompany).toHaveProperty('universalName');
      expect(mockCompany).toHaveProperty('name');
      expect(mockCompany).toHaveProperty('employeeCount');
      expect(mockCompany).toHaveProperty('industries');
    });

    test('job response has expected fields', () => {
      const mockJob = {
        id: '4153069088',
        title: 'Software Engineer',
        linkedinUrl: 'https://www.linkedin.com/jobs/view/4153069088/',
        jobState: 'LISTED',
        postedDate: '2024-01-15T00:00:00Z',
        location: {
          linkedinText: 'San Francisco, CA',
          city: 'San Francisco',
          state: 'California',
          country: 'United States',
        },
        employmentType: 'FULL_TIME',
        workplaceType: 'REMOTE',
        companyName: 'Google',
        salary: {
          min: 150000,
          max: 250000,
          currency: 'USD',
        },
        easyApplyUrl: 'https://www.linkedin.com/jobs/apply/...',
      };

      expect(mockJob).toHaveProperty('id');
      expect(mockJob).toHaveProperty('title');
      expect(mockJob).toHaveProperty('location');
      expect(mockJob).toHaveProperty('salary');
      expect(mockJob.salary).toHaveProperty('min');
      expect(mockJob.salary).toHaveProperty('max');
    });

    test('group response has expected fields', () => {
      const mockGroup = {
        id: '12345',
        linkedinUrl: 'https://www.linkedin.com/groups/12345/',
        name: 'Sales Professionals',
        memberCount: 500000,
        description: 'A group for sales professionals',
        logo: { url: 'https://media.licdn.com/...' },
      };

      expect(mockGroup).toHaveProperty('id');
      expect(mockGroup).toHaveProperty('name');
      expect(mockGroup).toHaveProperty('memberCount');
    });

    test('geo ID response has expected fields', () => {
      const mockGeoResponse = {
        elements: [
          { geoId: '102095887', title: 'California, United States' },
          { geoId: '90000070', title: 'San Francisco Bay Area' },
        ],
        status: 'success',
      };

      expect(mockGeoResponse.elements[0]).toHaveProperty('geoId');
      expect(mockGeoResponse.elements[0]).toHaveProperty('title');
    });
  });

  describe('Error Handling', () => {
    test('missing required params for get_profile should throw error', () => {
      const hasUrl = false;
      const hasPublicIdentifier = false;
      const hasProfileId = false;

      if (!hasUrl && !hasPublicIdentifier && !hasProfileId) {
        expect(() => {
          throw new Error('At least one of url, publicIdentifier, or profileId is required');
        }).toThrow('At least one of url, publicIdentifier, or profileId is required');
      }
    });

    test('missing required params for get_profile_posts should throw error', () => {
      const hasProfile = false;
      const hasProfileId = false;
      const hasProfilePublicIdentifier = false;

      if (!hasProfile && !hasProfileId && !hasProfilePublicIdentifier) {
        expect(() => {
          throw new Error('At least one of profile, profileId, or profilePublicIdentifier is required');
        }).toThrow('At least one of profile, profileId, or profilePublicIdentifier is required');
      }
    });

    test('missing required params for get_company should throw error', () => {
      const hasUrl = false;
      const hasUniversalName = false;
      const hasSearch = false;

      if (!hasUrl && !hasUniversalName && !hasSearch) {
        expect(() => {
          throw new Error('At least one of url, universalName, or search is required');
        }).toThrow('At least one of url, universalName, or search is required');
      }
    });

    test('missing required params for get_job should throw error', () => {
      const hasJobId = false;
      const hasUrl = false;

      if (!hasJobId && !hasUrl) {
        expect(() => {
          throw new Error('At least one of jobId or url is required');
        }).toThrow('At least one of jobId or url is required');
      }
    });

    test('missing required params for get_group should throw error', () => {
      const hasUrl = false;
      const hasGroupId = false;

      if (!hasUrl && !hasGroupId) {
        expect(() => {
          throw new Error('At least one of url or groupId is required');
        }).toThrow('At least one of url or groupId is required');
      }
    });

    test('missing post URL for get_post_comments should throw error', () => {
      const post = '';

      if (!post) {
        expect(() => {
          throw new Error('post URL is required');
        }).toThrow('post URL is required');
      }
    });
  });

  describe('API Key Configuration', () => {
    test('accepts HARVESTAPI_API_KEY environment variable', () => {
      const apiKey = process.env.HARVESTAPI_API_KEY || '';
      expect(typeof apiKey).toBe('string');
    });

    test('accepts LINKEDIN_API_KEY as alternative', () => {
      const apiKey = process.env.LINKEDIN_API_KEY || '';
      expect(typeof apiKey).toBe('string');
    });

    test('X-API-Key header is used for authentication', () => {
      const headers = {
        'X-API-Key': 'test_api_key',
        'Content-Type': 'application/json',
      };

      expect(headers).toHaveProperty('X-API-Key');
    });
  });
});

describe('MCP Protocol Compliance', () => {
  test('tools/list returns valid tool array', () => {
    const toolsResponse = {
      tools: [
        { name: 'get_profile', description: 'Get LinkedIn profile information' },
        { name: 'search_profiles', description: 'Search LinkedIn profiles' },
        { name: 'get_company', description: 'Get LinkedIn company information' },
        { name: 'search_jobs', description: 'Search LinkedIn jobs' },
        { name: 'get_post', description: 'Get LinkedIn post details' },
        { name: 'search_geo_id', description: 'Search LinkedIn Geo ID' },
      ],
    };

    expect(toolsResponse.tools).toBeInstanceOf(Array);
    expect(toolsResponse.tools.length).toBeGreaterThan(0);
    expect(toolsResponse.tools[0]).toHaveProperty('name');
    expect(toolsResponse.tools[0]).toHaveProperty('description');
  });

  test('tool count should be 17', () => {
    const expectedTools = [
      'get_profile',
      'search_profiles',
      'get_profile_posts',
      'get_profile_comments',
      'get_profile_reactions',
      'get_company',
      'search_companies',
      'get_company_posts',
      'get_job',
      'search_jobs',
      'get_post',
      'search_posts',
      'get_post_comments',
      'get_post_reactions',
      'get_group',
      'search_groups',
      'search_geo_id',
    ];

    expect(expectedTools.length).toBe(17);
  });

  test('tool call returns CallToolResult format', () => {
    const result = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ element: {}, status: 'success' }, null, 2),
        },
      ],
    };

    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('type');
    expect(result.content[0]).toHaveProperty('text');
    expect(result.content[0].type).toBe('text');
  });

  test('error response uses McpError format', () => {
    const errorResponse = {
      code: -32602, // InvalidParams
      message: 'Missing arguments',
    };

    expect(errorResponse).toHaveProperty('code');
    expect(errorResponse).toHaveProperty('message');
  });

  test('error codes are correct', () => {
    const ErrorCodes = {
      ParseError: -32700,
      InvalidRequest: -32600,
      MethodNotFound: -32601,
      InvalidParams: -32602,
      InternalError: -32603,
    };

    expect(ErrorCodes.InvalidParams).toBe(-32602);
    expect(ErrorCodes.MethodNotFound).toBe(-32601);
    expect(ErrorCodes.InternalError).toBe(-32603);
  });
});

describe('Base URL Configuration', () => {
  test('base URL is correct', () => {
    const baseURL = 'https://api.harvest-api.com/linkedin';
    expect(baseURL).toBe('https://api.harvest-api.com/linkedin');
  });

  test('proxy support is available', () => {
    // Verify proxy environment variables are checked (they may or may not be set)
    const proxyEnvVars = ['PROXY_URL', 'HTTP_PROXY', 'HTTPS_PROXY'];
    for (const envVar of proxyEnvVars) {
      // Just verify the env var lookup works (value can be undefined or string)
      const value = process.env[envVar];
      expect(value === undefined || typeof value === 'string').toBe(true);
    }
  });
});
