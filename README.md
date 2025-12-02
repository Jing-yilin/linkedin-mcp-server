# LinkedIn MCP Server

An MCP (Model Context Protocol) server that provides access to LinkedIn data through the [HarvestAPI](https://harvest-api.com) service.

## Features

This MCP server provides comprehensive access to LinkedIn data including:

### Profile Operations
- **get_profile** - Get LinkedIn profile by URL, public identifier, or profile ID
- **search_profiles** - Search profiles by name, company, location, and other criteria
- **get_profile_posts** - Get posts from a LinkedIn profile
- **get_profile_comments** - Get comments made by a LinkedIn profile
- **get_profile_reactions** - Get reactions from a LinkedIn profile

### Company Operations
- **get_company** - Get company information by URL, universal name, or search
- **search_companies** - Search companies by keywords and filters
- **get_company_posts** - Get posts from a company page

### Job Operations
- **get_job** - Get job details by ID or URL
- **search_jobs** - Search jobs with various filters (location, salary, experience level, etc.)

### Post Operations
- **get_post** - Get post details by URL
- **search_posts** - Search posts by keywords and filters
- **get_post_comments** - Get comments on a post
- **get_post_reactions** - Get reactions on a post

### Group Operations
- **get_group** - Get group information by URL or ID
- **search_groups** - Search groups by keywords

### Utility Operations
- **search_geo_id** - Search LinkedIn Geo ID by location (useful for location-based filtering)

## Installation

```bash
npm install
npm run build
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `HARVESTAPI_API_KEY` or `LINKEDIN_API_KEY` | Your HarvestAPI API key (required) |
| `PROXY_URL` | HTTP/HTTPS proxy URL (optional) |

### Claude Desktop Configuration

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/path/to/linkedin-mcp/build/index.js"],
      "env": {
        "HARVESTAPI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Usage Examples

### Get a LinkedIn Profile

```
Get the LinkedIn profile for https://www.linkedin.com/in/satyanadella/
```

### Search for Profiles

```
Search for software engineers at Google in San Francisco
```

### Search Jobs

```
Find remote software engineering jobs at Microsoft with salary 150k+
```

### Get Company Information

```
Get information about Apple's LinkedIn company page
```

### Search Posts

```
Search for posts about AI from the last 24 hours
```

## API Reference

### Profile Endpoints

#### get_profile
Get LinkedIn profile information.

Parameters:
- `url` (string, optional): LinkedIn profile URL
- `publicIdentifier` (string, optional): Public identifier from URL
- `profileId` (string, optional): LinkedIn profile ID
- `findEmail` (boolean, optional): Find email address
- `includeAboutProfile` (boolean, optional): Include detailed about section

#### search_profiles
Search LinkedIn profiles.

Parameters:
- `search` (string, required): Search query
- `currentCompany` (string, optional): Filter by current company
- `pastCompany` (string, optional): Filter by past company
- `school` (string, optional): Filter by school
- `firstName` (string, optional): Filter by first name
- `lastName` (string, optional): Filter by last name
- `title` (string, optional): Filter by job title
- `location` (string, optional): Filter by location
- `geoId` (string, optional): Filter by LinkedIn Geo ID
- `industryId` (string, optional): Filter by industry
- `page` (integer, optional): Page number

### Company Endpoints

#### get_company
Get LinkedIn company information.

Parameters:
- `url` (string, optional): Company URL
- `universalName` (string, optional): Company universal name
- `search` (string, optional): Company name to search

#### search_companies
Search LinkedIn companies.

Parameters:
- `search` (string, required): Search keywords
- `location` (string, optional): Filter by location
- `geoId` (string, optional): Filter by Geo ID
- `companySize` (string, optional): Filter by size (1-10, 11-50, etc.)
- `page` (integer, optional): Page number

### Job Endpoints

#### get_job
Get job details.

Parameters:
- `jobId` (string, optional): Job ID
- `url` (string, optional): Job URL

#### search_jobs
Search jobs with filters.

Parameters:
- `search` (string, optional): Job title search
- `companyId` (string, optional): Filter by company
- `location` (string, optional): Filter by location
- `geoId` (string, optional): Filter by Geo ID
- `sortBy` (string, optional): Sort by 'relevance' or 'date'
- `workplaceType` (string, optional): 'office', 'hybrid', 'remote'
- `employmentType` (string, optional): 'full-time', 'part-time', etc.
- `salary` (string, optional): '40k+', '60k+', '80k+', etc.
- `postedLimit` (string, optional): '24h', 'week', 'month'
- `experienceLevel` (string, optional): 'internship', 'entry', 'mid-senior', etc.
- `easyApply` (boolean, optional): Filter Easy Apply jobs
- `page` (integer, optional): Page number

### Post Endpoints

#### get_post
Get post details by URL.

Parameters:
- `url` (string, required): LinkedIn post URL

#### search_posts
Search posts.

Parameters:
- `search` (string, optional): Keywords to search
- `profile` (string, optional): Filter by author profile URL
- `profileId` (string, optional): Filter by author profile ID
- `company` (string, optional): Filter by company
- `postedLimit` (string, optional): '24h', 'week', 'month'
- `sortBy` (string, optional): 'relevance' or 'date'
- `page` (integer, optional): Page number

### Group Endpoints

#### get_group
Get group information.

Parameters:
- `url` (string, optional): Group URL
- `groupId` (string, optional): Group ID

#### search_groups
Search groups.

Parameters:
- `search` (string, required): Keywords to search
- `page` (integer, optional): Page number

### Utility Endpoints

#### search_geo_id
Search for LinkedIn Geo ID by location name.

Parameters:
- `search` (string, required): Location text to search

## License

MIT

## Credits

- Uses [HarvestAPI](https://harvest-api.com) for LinkedIn data access
- Built with [Model Context Protocol SDK](https://github.com/anthropics/mcp)
