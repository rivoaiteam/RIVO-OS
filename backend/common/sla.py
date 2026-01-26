"""
Common SLA utility functions.

Provides consistent SLA duration formatting across leads, clients, and cases.
"""


def format_sla_duration(minutes: int, suffix: str = 'remaining') -> str:
    """
    Format SLA duration in human-readable format.

    Args:
        minutes: Total minutes (positive for remaining, use abs() for overdue)
        suffix: 'remaining' or 'overdue'

    Returns:
        Formatted string like "2h remaining", "1d 12h remaining", "2w overdue", "1mo remaining"
    """
    if minutes < 60:
        return f"{minutes}mins {suffix}"
    elif minutes < 1440:  # Less than 24 hours
        hours = minutes // 60
        remaining_mins = minutes % 60
        if remaining_mins > 0:
            return f"{hours}hrs {remaining_mins}mins {suffix}"
        return f"{hours}hrs {suffix}"
    elif minutes < 10080:  # Less than 7 days
        days = minutes // 1440
        remaining_hours = (minutes % 1440) // 60
        if remaining_hours > 0:
            return f"{days}d {remaining_hours}h {suffix}"
        return f"{days}d {suffix}"
    elif minutes < 43200:  # Less than 30 days
        weeks = minutes // 10080
        remaining_days = (minutes % 10080) // 1440
        if remaining_days > 0:
            return f"{weeks}w {remaining_days}d {suffix}"
        return f"{weeks}w {suffix}"
    else:  # 30+ days
        months = minutes // 43200
        remaining_weeks = (minutes % 43200) // 10080
        if remaining_weeks > 0:
            return f"{months}mo {remaining_weeks}w {suffix}"
        return f"{months}mo {suffix}"
