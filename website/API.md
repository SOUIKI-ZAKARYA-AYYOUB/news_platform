# Newsly API Documentation

Complete API reference for the Newsly news recommendation system.

## Authentication Endpoints

### Sign Up User

**Endpoint**: `POST /api/auth/signup`

**Description**: Create a new user account with email, username, and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

**Response** (201 Created):
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "username": "john_doe"
  }
}
```

**Error** (400):
```json
{
  "error": "Email already in use"
}
```

**Validation Rules**:
- Email: valid email format
- Username: 3-100 characters, alphanumeric + underscores/hyphens
- Password: min 8 chars, 1 uppercase, 1 number

---

### Sign In User

**Endpoint**: `POST /api/auth/signin`

**Description**: Authenticate user and create session.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response** (200 OK):
```json
{
  "message": "Signed in successfully",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "username": "john_doe"
  }
}
```

**Error** (401):
```json
{
  "error": "Invalid email or password"
}
```

**Sets**: HTTP-only session cookie with JWT token

---

### Sign Out User

**Endpoint**: `POST /api/auth/logout`

**Description**: Clear user session and sign out.

**Request Body**: None

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

**Clears**: Session cookie

---

## Category Endpoints

### Get All Categories

**Endpoint**: `GET /api/categories`

**Description**: Retrieve all available news categories.

**Request Body**: None

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Politics",
      "description": "Political news and updates",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Technology",
      "description": "Technology and innovation news",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Available Categories**:
- Politics
- Economy
- Health
- Sports
- Technology
- Science
- Entertainment
- Education
- Environment
- World

---

## User Preferences Endpoints

### Get User Preferences

**Endpoint**: `GET /api/preferences`

**Description**: Get user's selected category preferences.

**Authentication**: Required (JWT session cookie)

**Request Body**: None

**Response** (200 OK):
```json
{
  "preferences": [1, 3, 5]
}
```

**Error** (401):
```json
{
  "error": "Unauthorized"
}
```

---

### Update User Preferences

**Endpoint**: `POST /api/preferences`

**Description**: Update user's selected categories.

**Authentication**: Required (JWT session cookie)

**Request Body**:
```json
{
  "categoryIds": [1, 3, 5, 7]
}
```

**Response** (200 OK):
```json
{
  "message": "Preferences updated successfully"
}
```

**Error** (400):
```json
{
  "error": "Please select at least one category"
}
```

**Validation Rules**:
- categoryIds must be a non-empty array of numbers
- Each category ID must exist in categories table

---

## Articles Endpoints

### Get User's Personalized Feed

**Endpoint**: `GET /api/articles`

**Description**: Get all articles from user's preferred categories.

**Authentication**: Required (JWT session cookie)

**Request Body**: None

**Query Parameters**:
- `limit` (optional): Max articles to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "articles": [
    {
      "id": 1,
      "category_id": 1,
      "title": "Breaking News: Political Updates",
      "description": "Latest political developments...",
      "content": "Full article content...",
      "author": "John Smith",
      "source_url": "https://news.example.com/article",
      "image_url": "https://example.com/image.jpg",
      "published_at": "2024-01-20T15:30:00Z",
      "created_at": "2024-01-20T16:00:00Z",
      "updated_at": "2024-01-20T16:00:00Z"
    }
  ]
}
```

**Error** (401):
```json
{
  "error": "Unauthorized"
}
```

**Error** (200 - No articles):
```json
{
  "articles": [],
  "message": "No category preferences selected"
}
```

**Notes**:
- Articles are pre-fetched by background job every 2 hours
- No real-time scraping happens on request
- Results ordered by published_at (newest first)

---

### Create Article (Testing)

**Endpoint**: `POST /api/articles`

**Description**: Manually create an article (for testing/admin).

**Authentication**: Not required (for testing)

**Request Body**:
```json
{
  "category_id": 1,
  "title": "News Article Title",
  "description": "Brief description of the article",
  "content": "Full article content",
  "author": "Author Name",
  "source_url": "https://example.com/article",
  "image_url": "https://example.com/image.jpg",
  "published_at": "2024-01-20T15:30:00Z"
}
```

**Response** (201 Created):
```json
{
  "article": {
    "id": 101,
    "category_id": 1,
    "title": "News Article Title",
    "created_at": "2024-01-20T16:00:00Z",
    "updated_at": "2024-01-20T16:00:00Z"
  }
}
```

**Error** (400):
```json
{
  "error": "Missing required fields"
}
```

---

## Background Job Endpoints

### Trigger Article Scraping

**Endpoint**: `GET /api/cron/scrape-articles`

**Description**: Manually trigger the background scraping job.

**Authentication**: Required (Bearer token)

**Headers**:
```
Authorization: Bearer your_cron_secret
```

**Request Body**: None

**Response** (200 OK):
```json
{
  "message": "Scraping job completed",
  "results": [
    {
      "category": "Politics",
      "articlesCount": 5,
      "status": "success"
    },
    {
      "category": "Technology",
      "articlesCount": 5,
      "status": "success"
    }
  ],
  "timestamp": "2024-01-20T16:00:00Z"
}
```

**Error** (401):
```json
{
  "error": "Unauthorized"
}
```

**Scheduled Execution**:
- Runs automatically every 2 hours via Vercel Cron
- Can be triggered manually with proper authorization

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input/validation error
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Rate Limiting

Currently no rate limiting is implemented. Production deployment should consider:
- API rate limits per user
- Signup rate limiting to prevent abuse
- Cron job frequency limits

---

## CORS Policy

- `origin`: Same-origin only
- `credentials`: Included
- `methods`: GET, POST, OPTIONS

---

## Example Usage

### Complete User Flow

```bash
# 1. Sign Up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "john_doe",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123"
  }'

# 2. Get Categories
curl http://localhost:3000/api/categories

# 3. Update Preferences (with session cookie from signup)
curl -X POST http://localhost:3000/api/preferences \
  -H "Content-Type: application/json" \
  -d '{"categoryIds": [1, 3, 5]}'

# 4. Get Articles Feed
curl http://localhost:3000/api/articles

# 5. Sign Out
curl -X POST http://localhost:3000/api/auth/logout
```

---

## Security Considerations

1. **Session Cookies**: JWT tokens stored in HTTP-only cookies
2. **Password Hashing**: bcrypt with 10 salt rounds
3. **Input Validation**: Zod schemas validate all inputs
4. **SQL Injection Protection**: Parameterized queries via Supabase
5. **CORS**: Restricted to same-origin
6. **HTTPS**: Enforced in production

---

## Versioning

Current API version: **v1** (implicit, no version prefix in URLs)

No breaking changes planned for near future.

---

## Support

For API issues:
1. Check request format and headers
2. Verify authentication token is valid
3. Review error message for details
4. Check database in Supabase console
5. Enable debug logging in development
