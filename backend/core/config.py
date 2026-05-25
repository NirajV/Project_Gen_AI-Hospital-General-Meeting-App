"""
Configuration and Environment Variables
"""
from pathlib import Path
from dotenv import load_dotenv
import os

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'hospital_meeting_scheduler_secret_key_2025')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

# MongoDB Configuration
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# File Upload Configuration
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/app/uploads'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Frontend URL for email links.
# Priority: explicit FRONTEND_URL env var > REACT_APP_BACKEND_URL fallback > localhost.
# Production deployments MUST set FRONTEND_URL (e.g. https://biomedmeet.com) in .env
# so that meeting Accept/Decline/View links in invitation emails resolve correctly.
FRONTEND_URL = (
    os.environ.get('FRONTEND_URL')
    or os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').replace(':8001', ':3000')
)

# CORS Configuration
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
