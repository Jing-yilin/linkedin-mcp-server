/**
 * Direct API Integration Tests for HarvestAPI LinkedIn endpoints
 *
 * These tests make real API calls to verify the LinkedIn API works correctly.
 * Requires HARVESTAPI_API_KEY or LINKEDIN_API_KEY environment variable to be set.
 *
 * Run with: HARVESTAPI_API_KEY=your_key bun test src/api.test.ts
 */

import { describe, test, expect, beforeAll, setDefaultTimeout } from 'bun:test';
import axios, { AxiosInstance } from 'axios';

// Set default timeout for all tests in this file to 30 seconds
setDefaultTimeout(30000);

const API_KEY = process.env.HARVESTAPI_API_KEY || process.env.LINKEDIN_API_KEY || '';

// Skip all tests if no API key is provided
const describeWithApiKey = API_KEY ? describe : describe.skip;

describeWithApiKey('HarvestAPI Direct Integration Tests', () => {
  let apiClient: AxiosInstance;

  beforeAll(() => {
    apiClient = axios.create({
      baseURL: 'https://api.harvest-api.com/linkedin',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });
  });

  describe('Profile Endpoints', () => {
    test('get_profile by publicIdentifier', async () => {
      const response = await apiClient.get('/profile', {
        params: { publicIdentifier: 'satyanadella' },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('element');
      // status can be 'success' or HTTP status code
      expect(response.data.status === 'success' || response.data.status === 200).toBe(true);
      console.log('Profile:', response.data.element?.name);
    });

    test('search_profiles', async () => {
      const response = await apiClient.get('/profile-search', {
        params: { search: 'software engineer', page: 1 },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      expect(response.data.elements).toBeInstanceOf(Array);
      expect(response.data).toHaveProperty('pagination');
      console.log('Found profiles:', response.data.elements?.length);
    });
  });

  describe('Company Endpoints', () => {
    test('get_company by universalName', async () => {
      const response = await apiClient.get('/company', {
        params: { universalName: 'google' },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('element');
      expect(response.data.element?.name).toBeDefined();
      console.log('Company:', response.data.element?.name);
    });

    test('search_companies', async () => {
      const response = await apiClient.get('/company-search', {
        params: { search: 'technology', page: 1 },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      expect(response.data.elements).toBeInstanceOf(Array);
      console.log('Found companies:', response.data.elements?.length);
    });

    test('get_company_posts', async () => {
      const response = await apiClient.get('/company-posts', {
        params: { companyUniversalName: 'google', page: 1 },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      console.log('Company posts:', response.data.elements?.length);
    });
  });

  describe('Job Endpoints', () => {
    test('search_jobs', async () => {
      const response = await apiClient.get('/job-search', {
        params: {
          search: 'software engineer',
          workplaceType: 'remote',
          page: 1,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      expect(response.data.elements).toBeInstanceOf(Array);
      console.log('Found jobs:', response.data.elements?.length);
    });

    test('search_jobs with filters', async () => {
      const response = await apiClient.get('/job-search', {
        params: {
          search: 'data scientist',
          employmentType: 'full-time',
          experienceLevel: 'mid-senior',
          postedLimit: 'week',
          page: 1,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      console.log('Filtered jobs:', response.data.elements?.length);
    });

    test('search_jobs with salary filter', async () => {
      const response = await apiClient.get('/job-search', {
        params: {
          search: 'engineer',
          salary: '100k+',
          easyApply: 'true',
          page: 1,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      console.log('High salary jobs:', response.data.elements?.length);
    }, 30000);
  });

  describe('Post Endpoints', () => {
    test('search_posts', async () => {
      const response = await apiClient.get('/post-search', {
        params: {
          search: 'artificial intelligence',
          postedLimit: 'week',
          page: 1,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      expect(response.data.elements).toBeInstanceOf(Array);
      console.log('Found posts:', response.data.elements?.length);
    });

    test('search_posts by company', async () => {
      const response = await apiClient.get('/post-search', {
        params: {
          authorsCompanyId: '1441', // Google
          postedLimit: 'month',
          page: 1,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      console.log('Company author posts:', response.data.elements?.length);
    });
  });

  describe('Group Endpoints', () => {
    test('search_groups', async () => {
      const response = await apiClient.get('/group-search', {
        params: { search: 'Sales', page: 1 },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      expect(response.data.elements).toBeInstanceOf(Array);
      console.log('Found groups:', response.data.elements?.length);
    });
  });

  describe('Geo ID Endpoint', () => {
    test('search_geo_id for San Francisco', async () => {
      const response = await apiClient.get('/geo-id-search', {
        params: { search: 'San Francisco' },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      expect(response.data.elements).toBeInstanceOf(Array);
      if (response.data.elements.length > 0) {
        expect(response.data.elements[0]).toHaveProperty('geoId');
        expect(response.data.elements[0]).toHaveProperty('title');
        console.log('Geo IDs:', response.data.elements.map((e: any) => `${e.title}: ${e.geoId}`).join(', '));
      }
    });

    test('search_geo_id for New York', async () => {
      const response = await apiClient.get('/geo-id-search', {
        params: { search: 'New York' },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('elements');
      console.log('NY Geo IDs:', response.data.elements?.length);
    });
  });

  describe('Combined Workflow Tests', () => {
    test('search geo id then search jobs in that location', async () => {
      // First get geo ID
      const geoResponse = await apiClient.get('/geo-id-search', {
        params: { search: 'Seattle' },
      });

      expect(geoResponse.status).toBe(200);
      const geoId = geoResponse.data.elements?.[0]?.geoId;

      if (geoId) {
        // Then search jobs with that geo ID
        const jobsResponse = await apiClient.get('/job-search', {
          params: {
            search: 'software engineer',
            geoId: geoId,
            page: 1,
          },
        });

        expect(jobsResponse.status).toBe(200);
        expect(jobsResponse.data).toHaveProperty('elements');
        console.log(`Jobs in Seattle (geoId: ${geoId}):`, jobsResponse.data.elements?.length);
      }
    }, 60000); // Increase timeout for combined workflow

    test('get company then get company posts', async () => {
      // First get company
      const companyResponse = await apiClient.get('/company', {
        params: { universalName: 'microsoft' },
      });

      expect(companyResponse.status).toBe(200);
      const companyId = companyResponse.data.element?.id;
      console.log('Microsoft ID:', companyId);

      if (companyId) {
        // Then get company posts
        const postsResponse = await apiClient.get('/company-posts', {
          params: { companyId: companyId, page: 1 },
        });

        expect(postsResponse.status).toBe(200);
        console.log('Microsoft posts:', postsResponse.data.elements?.length);
      }
    }, 60000); // Increase timeout for this combined test
  });
});

// Test that runs without API key - just validates test file loads
describe('API Test File Validation', () => {
  test('API_KEY environment check', () => {
    if (!API_KEY) {
      console.log('No API key provided - skipping direct API tests');
      console.log('Set HARVESTAPI_API_KEY or LINKEDIN_API_KEY to run full integration tests');
    } else {
      console.log('API key found - running full integration tests');
    }
    expect(true).toBe(true);
  });
});
