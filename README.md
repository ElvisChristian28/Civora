# SmartCity Dash

**A Real-Time Urban Hazard Detection and Reporting Platform**

SmartCity Dash is a comprehensive application for detecting, reporting, and tracking urban hazards in real-time using mobile technology and AI-powered image analysis. Drivers can report hazards like potholes, broken streetlights, waterlogging, traffic congestion, accidents, and road debris. The system uses geospatial indexing to find nearby hazards and helps city authorities prioritize infrastructure maintenance.

---

## Project Overview

### Architecture

The application follows a **client-server architecture** with two main components:

- **Backend**: FastAPI-based REST API with Supabase database integration
- **Frontend**: React Native/Expo mobile application with Zustand state management

### Tech Stack

#### Backend
- **Framework**: FastAPI 0.115.6
- **Server**: Uvicorn
- **Database**: Supabase (PostgreSQL with PostGIS for geospatial queries)
- **Authentication**: Supabase Auth
- **Configuration**: Pydantic Settings
- **HTTP Client**: HTTPX

#### Frontend
- **Framework**: React Native 0.81.5 with Expo 54.0.33
- **Router**: Expo Router 6.0.23
- **State Management**: Zustand 4.4.0
- **HTTP Client**: Axios 1.6.2
- **Native Features**: Expo Camera, Location, Sensors
- **Navigation**: React Native Gesture Handler & Reanimated

---

## Features

### Core Features
1. **Real-Time Hazard Reporting**
   - Capture hazards with photos via camera
   - Automatic AI analysis of reported hazards
   - Report with geolocation data
   - Hazard type and severity classification

2. **Geospatial Hazard Discovery**
   - Find hazards within a specified radius
   - PostGIS-powered spatial queries
   - Real-time hazard proximity alerts

3. **Driver Profile & History**
   - Maintain driver profiles with vehicle information
   - Access complete hazard reporting history
   - Customize driver settings and preferences

4. **Settings Management**
   - Auto-reporting toggle
   - High-resolution image capture settings
   - Sound alerts for nearby hazards

### Supported Hazard Types
- `pothole` - Road surface damage
- `broken_streetlight` - Non-functional street lighting
- `waterlogging` - Water accumulation on roads
- `traffic_congestion` - Heavy traffic conditions
- `accident` - Traffic accidents
- `road_debris` - Objects on road surface

### Severity Levels
- `low` - Minor inconvenience
- `medium` - Moderate safety concern
- `high` - Significant safety risk
- `critical` - Immediate danger

---

## Project Structure

```
Civora/
├── backend/                      # FastAPI application
│   ├── main.py                  # Entry point
│   ├── requirements.txt          # Python dependencies
│   ├── supabase_setup.sql        # Database schema
│   ├── verify_setup.py           # Database verification script
│   └── app/
│       ├── __init__.py
│       ├── main.py              # FastAPI app & endpoints
│       ├── config.py            # Configuration management
│       ├── models.py            # Pydantic request/response models
│       ├── database.py          # Supabase database operations
│       └── ai_gateway.py        # AI hazard analysis integration
│
└── smartcity-dash/              # React Native/Expo mobile app
    ├── package.json             # Node dependencies
    ├── babel.config.js
    ├── tsconfig.json
    ├── index.js                 # Expo entry point
    ├── app.json                 # Expo configuration
    └── app/
        ├── _layout.js           # Root navigation layout
        ├── index.js             # Welcome/auth screen
        ├── (main)/              # Main app screens
        │   ├── _layout.js       # Main layout
        │   ├── history.js       # Hazard history screen
        │   ├── index.js         # Main dashboard
        │   └── settings.js      # Driver settings screen
        ├── hooks/               # Custom React hooks
        │   ├── api.js          # API integration hook
        │   └── useStore.js     # Zustand state management
        └── assets/              # Images, fonts, etc.
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.9+
- **Supabase Account** (free tier available at https://supabase.com)
- **Git**

### Backend Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Civora/backend
```

#### 2. Create Python Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Configure Supabase

##### Step 4a: Create Supabase Project
1. Go to https://supabase.com and create a new project
2. Copy your **Project URL** and **API Key** (anon key)
3. Enable PostGIS extension in your Supabase project:
   - Go to SQL Editor
   - Click "New Query"
   - Paste: `CREATE EXTENSION IF NOT EXISTS postgis;`
   - Click "Run"

##### Step 4b: Setup Database Schema

1. In Supabase SQL Editor, import the schema:
   ```sql
   -- Run the entire script from backend/supabase_setup.sql
   ```
   Or manually:
   - Copy entire contents of `backend/supabase_setup.sql`
   - Paste into Supabase SQL Editor
   - Click "Run"

2. This creates:
   - `drivers` table (linked to Supabase Auth)
   - `hazards` table (with PostGIS location data)
   - RLS (Row Level Security) policies
   - Geospatial indexes for fast queries
   - Database functions for safe operations

#### 4c: Create Application in Supabase

1. Go to **Authentication > Providers** in Supabase Dashboard
2. Enable **Email** provider (enabled by default)
3. Go to **SQL Editor** and verify tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

#### 5. Create `.env` File

Create `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here

# API Server
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# Mock AI Settings (until YOLO model is deployed)
MOCK_AI_CONFIDENCE_MIN=0.75
MOCK_AI_CONFIDENCE_MAX=0.98

# CORS Configuration
CORS_ORIGINS=["http://localhost:8081","http://localhost:3000","*"]
```

**Where to find credentials:**
- **SUPABASE_URL**: Supabase Dashboard > Project Settings > API
- **SUPABASE_KEY**: Supabase Dashboard > Project Settings > API > anon public key

#### 6. Verify Setup

```bash
python verify_setup.py
```

Expected output:
```
✓ Supabase connection successful
✓ Database tables exist
✓ PostGIS extension enabled
✓ Drivers table ready
✓ Hazards table ready
```

#### 7. Start Backend Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at: **http://localhost:8000**

API Documentation: **http://localhost:8000/docs** (Swagger UI)

---

### Frontend Setup

#### 1. Navigate to Frontend Directory

```bash
cd smartcity-dash
```

#### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

#### 3. Create `.env` File

Create `smartcity-dash/.env`:

```env
EXPO_PUBLIC_API_URL=http://your-backend-ip:8000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_anon_key_here
```

**Note**: On Android/iOS simulator:
- Replace `http://localhost:8000` with your machine's local IP (e.g., `http://192.168.1.100:8000`)
- Find IP: Run `ipconfig` (Windows) or `ifconfig` (macOS/Linux)

#### 4. Start Development Server

```bash
npm start
```

Or run on specific platforms:

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

Expo Go app will launch. Scan the QR code with your phone or use an emulator.

---

## API Endpoints

### Base URL
```
http://localhost:8000
```

### Endpoints

#### 1. Health Check
```
GET /
```
**Response**: `{ "status": "ok" }`

---

#### 2. Report a Hazard
```
POST /api/report-hazard
```

**Request Body**:
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "hazard_type": "pothole"
}
```

**Response** (201 Created):
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "hazard_type": "pothole",
  "severity_level": "high",
  "confidence_score": 0.87,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "description": "Large pothole detected on road",
  "created_at": "2026-02-23T10:30:00Z"
}
```

---

#### 3. Get Nearby Hazards
```
POST /api/nearby-hazards
```

**Request Body**:
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius_km": 5.0
}
```

**Response**:
```json
{
  "center": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "radius_km": 5.0,
  "count": 3,
  "hazards": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "hazard_type": "pothole",
      "severity_level": "high",
      "confidence_score": 0.87,
      "latitude": 40.7140,
      "longitude": -74.0050,
      "distance_km": 1.2,
      "created_at": "2026-02-23T10:30:00Z"
    }
  ]
}
```

---

#### 4. Get Driver History
```
GET /api/driver/{driver_id}/history?limit=10&offset=0
```

**Response**:
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_hazards": 25,
  "limit": 10,
  "offset": 0,
  "hazards": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "hazard_type": "pothole",
      "severity_level": "high",
      "confidence_score": 0.87,
      "latitude": 40.7128,
      "longitude": -74.0060,
      "created_at": "2026-02-23T10:30:00Z"
    }
  ]
}
```

---

#### 5. Get Driver Settings
```
GET /api/driver/{driver_id}/settings
```

**Response**:
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "John Doe",
  "vehicle_type": "SUV",
  "auto_reporting": true,
  "high_resolution": true,
  "sound_alerts": true,
  "email": "john@example.com"
}
```

---

#### 6. Update Driver Settings
```
PUT /api/driver/{driver_id}/settings
```

**Request Body**:
```json
{
  "full_name": "John Doe",
  "vehicle_type": "Sedan",
  "auto_reporting": true,
  "high_resolution": false,
  "sound_alerts": true
}
```

**Response**: Updated driver settings object

---

## Database Schema

### Drivers Table
```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  vehicle_type TEXT,
  license_plate TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
```

### Hazards Table
```sql
CREATE TABLE hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  hazard_type TEXT NOT NULL,
  severity_level TEXT NOT NULL,
  confidence_score DECIMAL(3, 3),
  location GEOGRAPHY(POINT, 4326),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes for Performance
- **Geospatial**: GIST index on `location` column for fast spatial queries
- **Lookups**: Index on `driver_id` for driver-specific queries
- **Filtering**: Indexes on `severity_level`, `hazard_type`, `created_at`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_KEY` | Supabase anon public key | `eyJhbGc...` |
| `API_HOST` | Server bind address | `0.0.0.0` |
| `API_PORT` | Server port | `8000` |
| `ENVIRONMENT` | Environment mode | `development` or `production` |
| `MOCK_AI_CONFIDENCE_MIN` | Min AI confidence | `0.75` |
| `MOCK_AI_CONFIDENCE_MAX` | Max AI confidence | `0.98` |
| `CORS_ORIGINS` | Allowed CORS origins (JSON) | `["*"]` or `["http://localhost:3000"]` |

### Frontend (`smartcity-dash/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `http://192.168.1.100:8000` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase URL | `https://abc123.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_KEY` | Supabase anon key | `eyJhbGc...` |

---

## Running the Full Stack

### Terminal 1: Backend
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

### Terminal 2: Frontend
```bash
cd smartcity-dash
npm start
```

### Terminal 3: File Watcher (Optional)
```bash
# Watch for file changes in backend
# Uvicorn with --reload already does this
```

The application will be accessible via Expo Go on your mobile device or emulator.

---

## Testing the API

### Using Swagger UI
Navigate to: **http://localhost:8000/docs**

Interactive API documentation with built-in request/response testing.

### Using cURL (Command Line)

**Report a Hazard**:
```bash
curl -X POST http://localhost:8000/api/report-hazard \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "hazard_type": "pothole"
  }'
```

**Get Nearby Hazards**:
```bash
curl -X POST http://localhost:8000/api/nearby-hazards \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius_km": 5.0
  }'
```

### Using Postman
1. Create new POST request to `http://localhost:8000/api/report-hazard`
2. Set body to JSON
3. Add required fields
4. Click Send

---

## Development Workflow

### Backend Development

#### Adding New Endpoints

1. **Define Models** in `app/models.py`
2. **Add Database Functions** in `app/database.py`
3. **Implement Endpoints** in `app/main.py`
4. **Test with Swagger UI** at `http://localhost:8000/docs`

#### File Structure
```
app/
├── main.py          # FastAPI app instance & routes
├── config.py        # Settings & configuration
├── models.py        # Request/response schemas
├── database.py      # Supabase queries
├── ai_gateway.py    # AI integration (YOLO, etc.)
└── __init__.py
```

### Frontend Development

#### Screen Hierarchy
```
_layout.js (Root)
├── index.js (Welcome/Auth)
└── (main) (Protected)
    ├── _layout.js
    ├── index.js (Dashboard)
    ├── history.js (History)
    └── settings.js (Settings)
```

#### State Management (Zustand)
Located in: `app/hooks/useStore.js`

```javascript
// Example
import { useStore } from './hooks/useStore';
const { hazards, addHazard } = useStore();
```

#### API Integration
Located in: `app/hooks/api.js`

```javascript
import { useAPI } from './hooks/api';
const { reportHazard, getNearbyHazards } = useAPI();
```

---

## Deployment

### Backend Deployment (to Production Server)

#### Using Docker (Recommended)

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t smartcity-backend .
docker run -p 8000:8000 --env-file .env smartcity-backend
```

#### Using Gunicorn

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -b 0.0.0.0:8000
```

### Frontend Deployment (EAS Build & Submit)

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

---

## Troubleshooting

### Common Issues

#### Backend Connection Failed
```
Error: Failed to connect to Supabase
```
**Solution**:
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Check internet connection
- Ensure Supabase project is active
- Test endpoint manually: `curl https://your-project.supabase.co`

#### Database Tables Don't Exist
```
Error: relation "hazards" does not exist
```
**Solution**:
- Run `backend/supabase_setup.sql` in Supabase SQL Editor
- Verify schema with: `python verify_setup.py`
- Check RLS policies are enabled

#### Frontend Can't Connect to Backend
```
Error: Cannot connect to http://localhost:8000
```
**Solution**:
- On physical device/emulator, use machine's IP instead of `localhost`
- Find IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Update `EXPO_PUBLIC_API_URL` in `.env`
- Ensure backend is running and port is accessible

#### CORS Errors
```
Error: CORS policy: No 'Access-Control-Allow-Origin'
```
**Solution**:
- Update `CORS_ORIGINS` in `backend/.env`:
  ```env
  CORS_ORIGINS=["http://localhost:3000","http://192.168.1.100:8000"]
  ```
- Restart backend server

#### PostGIS Extension Not Found
```
Error: function ST_DWithin does not exist
```
**Solution**:
- Enable PostGIS in Supabase:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  SELECT postgis_version();
  ```

---

## Performance Optimization

### Database Query Optimization
- Geospatial indexes allow radius queries in O(log n) time
- Row-level security ensures data isolation
- Pagination with limit/offset for history queries

### Caching Strategy
- Frontend: Zustand store for state caching
- Backend: None (use Redis for large deployments)

### Network Optimization
- Compress images before upload (frontend)
- Paginate large hazard lists
- Use CDN for static assets

---

## Security Considerations

### Authentication & Authorization
- ✓ Supabase Auth for user authentication
- ✓ Row-Level Security (RLS) policies on tables
- ✓ Drivers can only access their own data
- ✓ Hazard data public, but drivers verified via RLS

### API Security
- ✓ CORS configured for trusted origins
- ✓ Input validation with Pydantic models
- ✓ Geospatial coordinates validated (-90 to 90 latitude, -180 to 180 longitude)
- ✓ Hazard types and severity levels validated against whitelist

### Data Protection
- ✓ All coordinates stored with 8 decimal precision (1.1mm accuracy)
- ✓ Sensitive data (license plates) handled securely
- ✓ Photo URLs managed via Supabase Storage

### Best Practices
- Rotate API keys regularly
- Use environment variables for secrets (never commit `.env`)
- Enable HTTPS in production
- Monitor API rate limits and implement throttling
- Keep dependencies updated: `pip install --upgrade -r requirements.txt`

---

## Contributing

### Code Style
- **Python**: PEP 8 compliant (4-space indentation)
- **JavaScript**: ES6+ with proper formatting
- **Naming**: camelCase for JS, snake_case for Python

### Commit Conventions
```
feat: Add new hazard reporting feature
fix: Correct geospatial query logic
docs: Update README with deployment steps
refactor: Simplify database connection logic
test: Add unit tests for hazard model
```

### Branch Naming
```
feature/hazard-detection
bugfix/cors-issue
hotfix/database-connection
docs/update-readme
```

---

## Roadmap

### Phase 1: MVP (Current)
- ✓ Core hazard reporting
- ✓ Geospatial queries
- ✓ Driver profiles
- ✓ Basic API

### Phase 2: AI Integration
- [ ] YOLO v8 model for image analysis
- [ ] Real-time object detection
- [ ] Automatic hazard severity classification
- [ ] Mock AI confidence scoring

### Phase 3: Advanced Features
- [ ] Real-time notifications
- [ ] Hazard clustering
- [ ] Mobile push notifications
- [ ] Data visualization dashboard
- [ ] Analytics for city planners

### Phase 4: Production Ready
- [ ] Performance optimization
- [ ] Advanced caching
- [ ] Rate limiting
- [ ] Admin dashboard
- [ ] Hazard lifecycle management (resolution tracking)

---

## License

[Add your license information here]

---

## Support & Contact

For questions or issues:
- Open an issue on GitHub
- Contact the development team
- Check documentation at [docs-url]

---

## Acknowledgments

- FastAPI framework
- Supabase backend-as-a-service
- PostGIS for geospatial capabilities
- React Native & Expo for cross-platform mobile
- Zustand for state management

---

**Last Updated**: February 23, 2026
**Version**: 1.0.0
