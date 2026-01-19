# Tech Stack

## Overview

Rivo OS uses a modern, decoupled architecture with React on the frontend, Django on the backend, and Supabase as the database and authentication layer.

## Frontend

| Component | Technology | Notes |
|-----------|------------|-------|
| Framework | React | Component-based UI with hooks for state management |
| Language | TypeScript | Type safety across the frontend codebase |
| Build Tool | Vite | Fast development server and optimized production builds |
| Styling | Tailwind CSS | Utility-first CSS for consistent, maintainable styles |
| UI Components | shadcn/ui | Accessible, customizable component library built on Radix |
| State Management | React Query | Server state synchronization with caching and optimistic updates |
| Routing | React Router | Client-side routing for SPA navigation |
| Forms | React Hook Form | Performant form handling with validation |

## Backend

| Component | Technology | Notes |
|-----------|------------|-------|
| Framework | Django | Python web framework with batteries included |
| Language | Python 3.11+ | Modern Python with type hints |
| API Layer | Django REST Framework | RESTful API with serialization, authentication, permissions |
| Linting | Ruff | Fast Python linter and formatter |

## Database & Storage

| Component | Technology | Notes |
|-----------|------------|-------|
| Database | Supabase (PostgreSQL) | Managed PostgreSQL with real-time subscriptions |
| ORM | Django ORM | Native Django models with Supabase PostgreSQL |
| Migrations | Django Migrations | Schema versioning and migration management |
| File Storage | Supabase Storage | Document uploads with signed URLs and access policies |

## Authentication & Authorization

| Component | Technology | Notes |
|-----------|------------|-------|
| Authentication | Supabase Auth | JWT-based auth with social providers and magic links |
| Authorization | Django Permissions | Role-based access control at API layer |
| Session Management | JWT + Refresh Tokens | Stateless auth with token refresh flow |

## Infrastructure & Deployment

| Component | Technology | Notes |
|-----------|------------|-------|
| CI/CD | GitHub Actions | Automated linting and deployment |
| Hosting | Render | Managed hosting for both API and frontend |
| Monitoring | Sentry | Error tracking and performance monitoring |

## Third-Party Services

| Component | Technology | Notes |
|-----------|------------|-------|
| WhatsApp | Twilio | Client communication channels (v1.5) |

## Development Tools

| Component | Technology | Notes |
|-----------|------------|-------|
| Version Control | Git + GitHub | Source control with pull request workflow |
| Package Manager (Python) | pip + pip-tools | Dependency management with pinned versions |
| Package Manager (JS) | pnpm | Fast, disk-efficient package management |
| API Documentation | drf-spectacular | OpenAPI schema generation from Django REST Framework |

## Architecture Decisions

### Why Django + React (Decoupled)
- **Separation of Concerns:** Frontend and backend evolve independently
- **API-First:** Enables future mobile apps and integrations
- **Team Scaling:** Frontend and backend specialists can work in parallel

### Why Supabase
- **Managed PostgreSQL:** Enterprise-grade database without DevOps overhead
- **Built-in Auth:** Reduces custom authentication code
- **Real-time:** Native WebSocket subscriptions for live updates (dashboards, notifications)
- **Storage:** Integrated file storage with access policies for document management

### Why Django over FastAPI
- **Mature Ecosystem:** Admin panel, ORM, migrations, permissions out of the box
- **Battle-Tested:** Proven at scale for complex business applications
- **DRF:** Industry-standard REST API tooling with serialization and viewsets
