# Task Breakdown: Channels Management

## Overview
Total Tasks: 3 Task Groups

This spec implements Channel, Source, and Sub-source management for Rivo OS v1.0, including:
- Three-level hierarchy: Channel > Source > Sub-source
- Trust-based categorization (Trusted/Untrusted)
- SLA inheritance cascade
- Inline editing UI (no side panels)

## Task List

### Backend Layer

#### Task Group 1: Database Models
**Dependencies:** None

- [x] 1.0 Complete database models
  - [x] 1.1 Create Channel model
    - Fields: id (UUID), name, description, is_trusted, default_sla_minutes (nullable), is_active, created_at, updated_at
    - Add index on is_trusted for filtering
  - [x] 1.2 Create Source model
    - Fields: id (UUID), channel_id (FK), name, sla_minutes (nullable), is_active, created_at, updated_at
    - Add effective_sla_minutes property (cascades from channel if null)
  - [x] 1.3 Create SubSource model
    - Fields: id (UUID), source_id (FK), name, sla_minutes (nullable), status, linked_user_id (FK, nullable), created_at, updated_at
    - Status choices: active, inactive, incubation, live, paused
    - Add effective_sla_minutes property (cascades from source > channel)
  - [x] 1.4 Create migrations
    - Initial migration for all three models
    - Add status field migration
    - Add sla_minutes to Source migration

**Acceptance Criteria:**
- Three-level hierarchy properly related via foreign keys
- SLA cascade works: SubSource > Source > Channel
- Status field supports 5 values for different trust contexts

---

#### Task Group 2: API Endpoints
**Dependencies:** Task Group 1

- [x] 2.0 Complete API layer
  - [x] 2.1 Create ChannelViewSet
    - GET /channels - List all channels with source counts
    - POST /channels - Create channel
    - GET /channels/{id} - Get channel with nested sources and sub-sources
    - PATCH /channels/{id} - Update channel (name, is_trusted, default_sla_minutes, is_active)
    - DELETE /channels/{id} - Delete channel
    - POST /channels/{id}/add_source - Add source to channel
  - [x] 2.2 Create SourceViewSet
    - GET /sources - List all sources
    - GET /sources/{id} - Get source with sub-sources
    - PATCH /sources/{id} - Update source (name, sla_minutes, is_active)
    - DELETE /sources/{id} - Delete source
    - POST /sources/{id}/add_sub_source - Add sub-source to source
  - [x] 2.3 Create SubSourceViewSet
    - GET /sub-sources/{id} - Get sub-source details
    - PATCH /sub-sources/{id} - Update sub-source (name, sla_minutes, status)
    - DELETE /sub-sources/{id} - Delete sub-source
    - GET /sub-sources/ms_users - Get MS users for linking (deferred)
  - [x] 2.4 Create serializers
    - ChannelSerializer, ChannelListSerializer, ChannelCreateSerializer, ChannelUpdateSerializer
    - SourceSerializer, SourceListSerializer, SourceCreateSerializer
    - SubSourceSerializer, SubSourceCreateSerializer
    - Include effective_sla in responses
  - [x] 2.5 Apply Admin-only permissions
    - Use IsAdminRole permission class on all viewsets

**Acceptance Criteria:**
- Full CRUD operations for all three entity types
- Nested data returned correctly (channel includes sources includes sub-sources)
- SLA inheritance reflected in effective_sla field
- Admin-only authorization enforced

---

### Frontend Layer

#### Task Group 3: Channels Settings Page
**Dependencies:** Task Group 2

- [x] 3.0 Complete Channels admin page with inline editing
  - [x] 3.1 Create Channels page layout
    - Page header: "Channels" title with description
    - Add Channel button (+ icon, top right)
    - Search input and Type filter dropdown
    - Pagination controls
  - [x] 3.2 Build expandable table structure
    - Table columns: Arrow, Name, Type, SLA, Status, Actions
    - Fixed column widths with table-fixed
    - Channel rows expandable to show sources
    - Source rows expandable to show sub-sources
    - Background colors differentiate levels
  - [x] 3.3 Implement inline add rows
    - Add Channel: Inline row with name input, type dropdown, SLA input
    - Add Source: + icon in arrow column, name input in name column
    - Add Sub-source: + icon in arrow column, name input only (status defaults)
    - Checkmark to save, X to cancel
  - [x] 3.4 Implement inline editing
    - InlineNameEdit: Click name to edit, Enter/blur to save
    - InlineSlaEdit: Click SLA value to edit, shows inherited value if not set
    - TrustDropdown: Immediate save on change (Trusted/Untrusted)
    - SubSourceStatusDropdown: Conditional options based on trust level
  - [x] 3.5 Implement sub-source status rules
    - Trusted channels: Active/Inactive options
    - Untrusted channels: Incubation/Live/Paused options
    - Default on create: Active (trusted) or Incubation (untrusted)
  - [x] 3.6 Add React Query hooks
    - useChannels - Fetch channel list
    - useChannel - Fetch single channel with nested data
    - useCreateChannel, useUpdateChannel, useDeleteChannel
    - useAddSource, useUpdateSource, useDeleteSource
    - useAddSubSource, useUpdateSubSource, useDeleteSubSource
    - Use refetchQueries for immediate SLA cascade updates

**Acceptance Criteria:**
- Expandable hierarchy displays correctly
- All inline editing works (name, SLA, type, status)
- SLA changes cascade to nested levels immediately
- Status options change based on channel trust level
- UI matches Users page design exactly (fonts, colors, spacing)

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: Database Models**
   - Establishes data foundation
   - No dependencies, can start immediately

2. **Task Group 2: API Endpoints**
   - Depends on Task Group 1 for models
   - Provides backend functionality for frontend

3. **Task Group 3: Channels Settings Page**
   - Depends on Task Group 2 for API
   - Requires auth flow from IAM spec

---

## Technical Notes

**Tech Stack:**
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Django + Django REST Framework
- Database: SQLite (development) / PostgreSQL (production)
- State Management: React Query
- Auth: JWT tokens (from IAM spec)

**API Endpoint Summary:**
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /channels | List all channels | Admin only |
| POST | /channels | Create channel | Admin only |
| GET | /channels/{id} | Get channel with sources | Admin only |
| PATCH | /channels/{id} | Update channel | Admin only |
| DELETE | /channels/{id} | Delete channel | Admin only |
| POST | /channels/{id}/add_source | Add source | Admin only |
| PATCH | /sources/{id} | Update source | Admin only |
| DELETE | /sources/{id} | Delete source | Admin only |
| POST | /sources/{id}/add_sub_source | Add sub-source | Admin only |
| PATCH | /sub-sources/{id} | Update sub-source | Admin only |
| DELETE | /sub-sources/{id} | Delete sub-source | Admin only |

**SLA Cascade Priority:**
1. Sub-source sla_minutes (if set)
2. Source sla_minutes (if set)
3. Channel default_sla_minutes (fallback)

**Sub-source Status Options:**
| Trust Level | Status Options |
|-------------|----------------|
| Trusted | Active, Inactive |
| Untrusted | Incubation, Live, Paused |

**Design Consistency with Users Page:**
- Same font sizes: text-xs, font-medium for names
- Same dropdown heights: h-6
- Same delete icon sizes: h-3.5 w-3.5
- Same hover/transition effects
- Same table column styling
- Same pagination controls
