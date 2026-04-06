# 🤝 Contributing to MedMeet

Thank you for your interest in contributing to MedMeet - Hospital Case Meeting Scheduler! This document provides guidelines for contributing to the project.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Coding Standards](#coding-standards)
7. [Testing](#testing)
8. [Pull Request Process](#pull-request-process)
9. [Reporting Issues](#reporting-issues)

---

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Prioritize patient data security and privacy
- Follow HIPAA guidelines for healthcare data

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** (Backend)
- **Node.js 18+** (Frontend)
- **MongoDB 7.0+** (Database)
- **Docker & Docker Compose** (Optional, recommended)
- **Git** (Version control)

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/hospital-meeting-scheduler.git
cd hospital-meeting-scheduler

# Add upstream remote
git remote add upstream https://github.com/original/hospital-meeting-scheduler.git
```

---

## 💻 Development Setup

### Option 1: Docker Setup (Recommended)

```bash
# Start all services
./start-docker.sh

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

### Option 2: Manual Setup

**Backend Setup:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB (if not using Docker)
# See docs/MONGODB_SETUP.md

# Run backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**Frontend Setup:**
```bash
cd frontend

# Install dependencies
yarn install

# Copy environment file
cp .env.example .env
# Edit .env: REACT_APP_BACKEND_URL=http://localhost:8001

# Start frontend
yarn start
```

---

## 📁 Project Structure

```
/app/
├── backend/                    # FastAPI backend
│   ├── server.py              # Main API (⚠️ 1,690 lines - needs refactoring)
│   ├── scheduler.py           # Background tasks
│   ├── requirements.txt       # Python dependencies
│   ├── utils/                 # Utilities
│   │   ├── email.py          # Email functions
│   │   └── pdf_generator.py  # PDF generation
│   ├── templates/             # Email templates
│   └── tests/                # Backend tests
│
├── frontend/                  # React application
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   └── MeetingDetailPage.js  # ⚠️ 2,100+ lines - needs refactoring
│   │   ├── components/       # Reusable components
│   │   ├── context/          # React Context
│   │   └── lib/              # Utilities
│   ├── package.json
│   └── tailwind.config.js
│
├── docs/                     # Documentation
│   ├── FEATURES.md
│   ├── API_REFERENCE.md
│   ├── DEPLOYMENT.md
│   └── ...
│
├── test_reports/            # Test results
├── docker-compose.yml       # Docker configuration
└── README.md               # Main documentation
```

---

## 🔄 Development Workflow

### 1. Create a Branch

```bash
# Update your local main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/updates

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed
- Add tests for new features

### 3. Commit Changes

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: Add calendar integration feature"
```

**Commit Message Format:**
```
type: Brief description

Detailed explanation (if needed)

Fixes #issue-number
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Tests
- `style`: Formatting
- `chore`: Maintenance

### 4. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

---

## 📝 Coding Standards

### Python (Backend)

**Style Guide:** PEP 8

```python
# Use type hints
def create_meeting(title: str, date: datetime) -> dict:
    """Create a new meeting.
    
    Args:
        title: Meeting title
        date: Meeting date and time
        
    Returns:
        Created meeting dictionary
    """
    pass

# Use Pydantic models for validation
class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    meeting_date: str
    
# Async/await for database operations
async def get_meeting(meeting_id: str) -> dict:
    return await db.meetings.find_one({"id": meeting_id}, {"_id": 0})

# Environment variables
DATABASE_URL = os.environ.get('MONGO_URL')

# Error handling
try:
    result = await db.meetings.insert_one(meeting_data)
except Exception as e:
    logger.error(f"Failed to create meeting: {str(e)}")
    raise HTTPException(status_code=500, detail="Failed to create meeting")
```

**Important Backend Rules:**
- Always exclude `_id` from MongoDB responses: `{"_id": 0}`
- Use `datetime.now(timezone.utc)` not `datetime.utcnow()`
- Never hardcode credentials (use environment variables)
- Add proper error handling
- Log important operations

### JavaScript/React (Frontend)

**Style Guide:** Airbnb JavaScript Style Guide

```javascript
// Use functional components with hooks
const MeetingCard = ({ meeting }) => {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.createMeeting(meeting);
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg">
      {/* Component JSX */}
    </div>
  );
};

// Use environment variables
const API_URL = process.env.REACT_APP_BACKEND_URL;

// Proper prop types
MeetingCard.propTypes = {
  meeting: PropTypes.object.isRequired
};
```

**Important Frontend Rules:**
- Use `REACT_APP_BACKEND_URL` for API calls (never hardcode URLs)
- Use Tailwind CSS classes (avoid inline styles)
- Follow Shadcn UI component patterns
- Use React Context for global state
- Add loading states for async operations

### Tailwind CSS

```jsx
{/* Follow Clinical Zen color scheme */}
<div className="bg-teal-50 border-l-4 border-l-teal-600 p-6">
  <h2 className="text-lg font-semibold text-teal-900">
    Meeting Title
  </h2>
</div>

{/* Spacing: 32px between cards */}
<div className="space-y-8">
  <Card>...</Card>
  <Card>...</Card>
</div>

{/* Responsive text sizes */}
<h1 className="text-4xl sm:text-5xl lg:text-6xl">
  Main Heading
</h1>
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_meetings.py

# Run with coverage
pytest --cov=. --cov-report=html
```

### Frontend Tests

```bash
cd frontend

# Run tests
yarn test

# Run tests with coverage
yarn test --coverage
```

### Manual Testing Checklist

- [ ] Feature works on Chrome, Firefox, Safari
- [ ] Mobile responsive (test on different screen sizes)
- [ ] All API endpoints return correct status codes
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly
- [ ] Authentication works properly
- [ ] No console errors

---

## 📤 Pull Request Process

### Before Submitting

1. **Update Documentation**
   - Update README.md if adding features
   - Add API docs for new endpoints
   - Update FEATURES.md

2. **Test Thoroughly**
   - Run all tests
   - Test manually in browser
   - Check for edge cases

3. **Code Quality**
   - Run linting: `yarn lint` (frontend), `ruff check .` (backend)
   - Fix all linting errors
   - Remove console.logs and debugging code

4. **Clean Commit History**
   ```bash
   # Squash commits if needed
   git rebase -i HEAD~3
   ```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Manual testing completed
- [ ] Tested on multiple browsers

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No console errors
- [ ] Tests added/updated

## Related Issues
Fixes #123
```

### Review Process

1. Submit PR with clear description
2. Wait for automated checks to pass
3. Address reviewer feedback
4. Make requested changes
5. Get approval from maintainer
6. PR will be merged by maintainer

---

## 🐛 Reporting Issues

### Bug Reports

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Screenshots**
If applicable

**Environment**
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 2.0.0]

**Additional Context**
Any other information
```

### Feature Requests

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why this feature is needed

**Proposed Solution**
How it could work

**Alternatives Considered**
Other approaches

**Additional Context**
Any other information
```

---

## 🎯 Current Priority Areas

### High Priority (Help Needed!)

1. **Code Refactoring**
   - Break down `server.py` (1,690 lines) into modules
   - Split `MeetingDetailPage.js` (2,100 lines) into components
   - Create `/backend/routes/` folder structure
   - Extract Pydantic models to `/backend/models/`

2. **Testing**
   - Add frontend unit tests
   - Add integration tests
   - Increase test coverage to 80%+

3. **Performance**
   - Optimize database queries
   - Add pagination to list endpoints
   - Implement caching

### Medium Priority

4. **Features**
   - Real-time updates with WebSockets
   - Calendar integration (Google, Outlook)
   - Mobile app (React Native)
   - Advanced search and filtering

5. **Documentation**
   - Add more code comments
   - Create video tutorials
   - Write deployment guides

---

## 💡 Tips for Contributors

### For First-Time Contributors

- Start with issues labeled `good first issue`
- Read all documentation first
- Ask questions in issues/discussions
- Don't hesitate to request help

### Best Practices

- **Keep PRs Small** - Focus on one feature/fix at a time
- **Write Tests** - Add tests for new code
- **Update Docs** - Keep documentation current
- **Be Patient** - Review process may take time
- **Stay Responsive** - Address feedback promptly

### Getting Help

- Comment on the issue you're working on
- Ask questions in PR comments
- Check existing documentation
- Look at similar code for examples

---

## 📞 Contact

- **Issues:** [GitHub Issues](https://github.com/yourusername/repo/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/repo/discussions)
- **Email:** Niraj.K.Vishwakarma@gmail.com

---

## 🙏 Thank You!

Your contributions make MedMeet better for healthcare professionals worldwide. Every contribution, no matter how small, is valued and appreciated!

---

**Last Updated:** April 6, 2026 | MedMeet v2.0.0
