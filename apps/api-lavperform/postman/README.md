# FoodCRM API - Postman Collection

This directory contains Postman automation files for testing the FoodCRM API.

## Files

- **FoodCRM-API.postman_collection.json** - The complete API collection with all endpoints
- **FoodCRM.postman_environment.json** - Environment variables for local development

## Quick Start

### 1. Import to Postman

1. Open Postman
2. Click **Import** button
3. Import both files:
   - `FoodCRM-API.postman_collection.json`
   - `FoodCRM.postman_environment.json`

### 2. Configure Environment

1. Select the **FoodCRM - Local** environment in the top-right dropdown
2. Update these variables if needed:
   - `baseUrl` - Default: `http://localhost:3000`
   - `userEmail` - Your test user email
   - `userPassword` - Your test user password

### 3. Start Testing

1. **Login First**: Execute the `Auth > Login` request
   - This will automatically save the `authToken`, `userId`, and `companyId` to your environment
   - All subsequent requests will use this token for authentication

2. **Browse Collections**: Explore endpoints organized by modules:
   - Application
   - Auth
   - Automatic Campaigns
   - Campaigns
   - Companies
   - Courses
   - Customers
   - Dashboard
   - Link Page
   - Metrics
   - Onboarding
   - Orders
   - Users
   - WhatsApp
   - Webhooks

## Features

### Automatic Token Management

The collection includes scripts that automatically:
- Save the JWT token after login
- Extract and save entity IDs (userId, companyId, customerId, campaignId, etc.)
- Use Bearer token authentication for all protected endpoints

### Pre-configured Test Scripts

- Global test script validates successful response codes (200, 201, 204)
- Specific requests have custom tests to extract and save IDs

### Request Variables

All requests use environment variables for dynamic values:
- `{{baseUrl}}` - API base URL
- `{{authToken}}` - JWT authentication token
- `{{companyId}}` - Current company ID
- `{{customerId}}` - Customer ID
- `{{campaignId}}` - Campaign ID
- And many more...

## Workflow Example

### Creating a Complete Campaign Flow

1. **Login**
   ```
   POST Auth > Login
   ```
   → Saves `authToken`, `userId`, `companyId`

2. **Create a Customer**
   ```
   POST Customers > Create Customer
   ```
   → Saves `customerId`

3. **Create a Campaign**
   ```
   POST Campaigns > Create Campaign
   ```
   → Saves `campaignId`

4. **Check Campaign Status**
   ```
   GET Campaigns > Get Campaign by ID
   ```

5. **View Metrics**
   ```
   GET Dashboard > Get Campaigns Summary
   ```

## Environment Variables Reference

### Auto-populated by Scripts
These are set automatically when you make requests:
- `authToken` - JWT token from login
- `userId` - Current user ID
- `companyId` - Current company ID
- `customerId` - Last created/retrieved customer
- `campaignId` - Last created/retrieved campaign
- `courseId` - Last created/retrieved course

### Manual Configuration Required
- `userEmail` - Email for login
- `userPassword` - Password for login
- `phoneNumber` - For testing phone-based lookups
- `slug` - For link page endpoints

## Testing Different Environments

### Production Environment

1. Duplicate the environment: Right-click **FoodCRM - Local** → Duplicate
2. Rename to **FoodCRM - Production**
3. Update `baseUrl` to your production URL
4. Update credentials if different

### Staging Environment

Follow the same process with staging URL and credentials.

## Advanced Usage

### Running Collections with Newman

You can run the collection via CLI using Newman:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run FoodCRM-API.postman_collection.json \
  -e FoodCRM.postman_environment.json

# Run with specific folder
newman run FoodCRM-API.postman_collection.json \
  -e FoodCRM.postman_environment.json \
  --folder "Customers"

# Generate HTML report
newman run FoodCRM-API.postman_collection.json \
  -e FoodCRM.postman_environment.json \
  -r html --reporter-html-export report.html
```

### CI/CD Integration

Add to your CI pipeline (e.g., GitHub Actions):

```yaml
- name: Run API Tests
  run: |
    npm install -g newman
    newman run postman/FoodCRM-API.postman_collection.json \
      -e postman/FoodCRM.postman_environment.json \
      --bail
```

## API Modules Overview

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Application** | 2 | App preload and debug |
| **Auth** | 3 | Login, password recovery |
| **Automatic Campaigns** | 8 | Birthday/anniversary campaigns |
| **Campaigns** | 6 | Marketing campaigns |
| **Companies** | 15 | Company management |
| **Courses** | 13 | Educational content |
| **Customers** | 8 | Customer management |
| **Dashboard** | 2 | Analytics summaries |
| **Link Page** | 4 | Bio link pages |
| **Metrics** | 1 | Interaction tracking |
| **Onboarding** | 7 | User/company registration |
| **Orders** | 2 | Order management |
| **Users** | 5 | User management |
| **WhatsApp** | 4 | WhatsApp integration |
| **Webhooks** | 2 | External integrations |

## Troubleshooting

### Authentication Issues
- Make sure to run the Login request first
- Check that `authToken` is saved in environment variables
- Verify the token hasn't expired

### Missing Variables
- Check environment is selected in top-right dropdown
- Verify variables are populated after running prerequisite requests
- Manually set variables if needed in environment settings

### Request Failures
- Verify API server is running on `baseUrl`
- Check request body format matches API expectations
- Review API documentation for required fields

## Contributing

When adding new endpoints:
1. Add request to appropriate folder
2. Use environment variables for dynamic values
3. Add test scripts to extract important IDs
4. Update this README if needed

## Support

For API documentation, see:
- [API Reference](../docs/03-API-REFERENCE.md)
- [Testing Guide](../docs/guides/testing-guide.md)
