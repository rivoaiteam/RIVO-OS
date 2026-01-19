# Channel Specification - Rivo OS

## Overview

Channels are the entry points for leads into Rivo OS. Each channel represents a distinct source of business with different trust levels, context quality, and handling requirements.

**Core Principle:** Trust level determines entry point. Trusted channels create Clients directly (bypassing Lead verification). Untrusted channels create Leads that require verification before becoming Clients.

## Channel Hierarchy

Three levels of attribution:
1. **Channel** - Top level (e.g., Performance Marketing, Partner Hub)
2. **Source** - Mid level within channel (e.g., Google Search, Meta)
3. **Sub-source** - Granular level (e.g., specific campaigns, partners, agents)

## Trust Categories

### Trusted Channels
Leads have verified intent. Bypass verification → Create Clients directly.
- Partner Hub
- Freelance Network
- BH Mortgage Team
- AskRivo

### Untrusted Channels
Leads have unverified intent. Require verification before becoming Clients.
- Performance Marketing

## Channel Specifications

### 1. Performance Marketing (Untrusted)
- **Sources:** Google Search, Meta, WhatsApp, Email
- **Sub-sources:** Campaigns (e.g., Refinance_Jan26)
- **Default SLA:** 240 mins

### 2. Partner Hub (Trusted)
- **Sources:** Partner agencies (e.g., AEON)
- **Sub-sources:** Specific partners (e.g., Azizi, DAMAC, Emaar)
- **Default SLA:** 30 mins

### 3. Freelance Network (Trusted)
- **Sources:** Agency groupings (e.g., Saqib)
- **Sub-sources:** Individual freelance agents
- **Default SLA:** 30 mins

### 4. BH Mortgage Team (Trusted)
- **Sources:** Internal only
- **Sub-sources:** Linked to MS users (dropdown selection)
- **Default SLA:** N/A
- **Special:** Auto-assigns to creating MS

### 5. AskRivo (Trusted)
- **Sources:** Direct only
- **Sub-sources:** None
- **Default SLA:** 10 mins

## Data Model

### Channel
| Field | Type |
|-------|------|
| id | UUID |
| name | String |
| description | Text |
| is_trusted | Boolean |
| default_sla_minutes | Integer (nullable) |
| is_active | Boolean |

### Source
| Field | Type |
|-------|------|
| id | UUID |
| channel_id | FK → Channel |
| name | String |
| sla_minutes | Integer (nullable, overrides channel default) |
| is_active | Boolean |

### Sub-source
| Field | Type |
|-------|------|
| id | UUID |
| source_id | FK → Source |
| name | String |
| sla_minutes | Integer (nullable, overrides source/channel default) |
| linked_user_id | FK → User (nullable, for BH Mortgage Team - deferred) |
| status | Enum - Trusted: active/inactive, Untrusted: incubation/live/paused |

## SLA Inheritance Cascade

SLA values cascade through the hierarchy with override priority:
1. **Sub-source SLA** (if set) - highest priority
2. **Source SLA** (if set) - mid priority
3. **Channel Default SLA** - lowest priority (fallback)

When editing SLA at any level, all nested levels immediately reflect the inherited value unless they have their own override.

## Admin UI Requirements

### Channel List Page (Expandable Table)
- Table with columns: Arrow, Name, SLA, Actions
- **No Status column** - trust type filtering handled by tabs
- Expandable rows - click arrow to show nested sources
- Search bar and Type tabs (All/Trusted/Untrusted) on same row
- Pagination with prev/next controls

### Filtering
- **Type Tabs:** All | Trusted | Untrusted (inline with search bar)
- Tabs styled with bottom border indicator on active tab
- No dropdown filters - tabs provide cleaner UX

### Add/Edit Patterns

**Channels:**
- **Add Channel:** "New Channel" button (prominent, filled background `bg-[#1e3a5f]`) opens side panel
- **Edit Channel:** Click pencil icon → opens side panel with Name, Type dropdown, Default SLA fields
- **Channel Side Panel:** Only shows channel details (no sources management)

**Sources:**
- **Add Source:** Inline row in expanded channel view with name input and checkmark/X buttons
- **Edit Source:** Click pencil icon → opens dedicated Source Edit Panel with Name and SLA fields
- Source Edit Panel is a separate 350px slide-in panel (not in channel side panel)

**Sub-sources:**
- **Add Sub-source:** Inline row in expanded source view with name input (status defaults based on trust)
- **Edit Sub-source:** Click pencil icon → opens dedicated Sub-source Edit Panel with Name, SLA, Status fields
- Sub-source Edit Panel is a separate 350px slide-in panel

### SLA Validation
- All SLA inputs have `min="0"` attribute
- JavaScript validation prevents negative values (only allow non-negative integers)
- Placeholder shows inherited SLA value when field is empty

### Sub-source Status Rules
- **Trusted Channels:** Active / Inactive options
- **Untrusted Channels:** Incubation / Live / Paused options
- Default on create: Active (trusted) or Incubation (untrusted)
- Status shown as colored badge in table rows

### Design Consistency
- Match Users and Clients page design tokens exactly
- Same font sizes (text-xs for table content, font-medium for names)
- Same button styles: filled primary buttons `bg-[#1e3a5f]`
- Same icon sizes (h-3.5 w-3.5)
- Same tab styling with border-b-2 indicator
- Nested rows have subtle background colors:
  - Sources: `bg-blue-50/30`
  - Sub-sources: `bg-gray-50`

## Initial Data (via Django shell)

### Channels
1. Performance Marketing (Untrusted, SLA: 240)
2. Partner Hub (Trusted, SLA: 30)
3. Freelance Network (Trusted, SLA: 30)
4. BH Mortgage Team (Trusted, SLA: null)
5. AskRivo (Trusted, SLA: 10)

### Sources & Sub-sources
See detailed configuration in original spec document.
