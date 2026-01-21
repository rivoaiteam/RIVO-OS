"""
Constants for lead tracking and campaign status management.

TAG_PRIORITY defines the priority order for YCloud tags.
Higher numbers mean higher priority for determining campaign status.
"""

from leads.models import CampaignStatus


# Tag priority mapping - higher number = higher priority
TAG_PRIORITY = {
    # Priority 1 (lowest) - Initial state
    'subscriber_pending': 1,

    # Priority 2 - Segment tags
    'segment_mortgaged': 2,
    'segment_renting': 2,
    'segment_own': 2,
    'segment_family': 2,
    'segment_other': 2,

    # Priority 3 - Locale tags
    'locale_dubai': 3,
    'locale_abudhabi': 3,
    'locale_sharjah': 3,
    'locale_ajman': 3,
    'locale_other': 3,

    # Priority 4 - Qualification
    'qualified': 4,
    'disqualified': 4,

    # Priority 5 (highest) - Conversion
    'converted': 5,
}


# Map tags to CampaignStatus enum values
TAG_TO_STATUS_MAP = {
    'subscriber_pending': CampaignStatus.SUBSCRIBER_PENDING,
    'segment_mortgaged': CampaignStatus.SEGMENT_MORTGAGED,
    'segment_renting': CampaignStatus.SEGMENT_RENTING,
    'segment_own': CampaignStatus.SEGMENT_OTHER,
    'segment_family': CampaignStatus.SEGMENT_OTHER,
    'segment_other': CampaignStatus.SEGMENT_OTHER,
    'locale_dubai': CampaignStatus.LOCALE_DUBAI,
    'locale_abudhabi': CampaignStatus.LOCALE_ABU_DHABI,
    'locale_sharjah': CampaignStatus.LOCALE_OTHER,
    'locale_ajman': CampaignStatus.LOCALE_OTHER,
    'locale_other': CampaignStatus.LOCALE_OTHER,
    'qualified': CampaignStatus.QUALIFIED,
    'disqualified': CampaignStatus.DISQUALIFIED,
    'converted': CampaignStatus.CONVERTED,
}
