"""
Client and CoApplicant models for Rivo OS Mortgage Management.

Clients represent qualified prospects with verified identity and calculated eligibility.
They are created either directly from trusted channels or converted from Leads.
"""

import uuid
from datetime import timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.db import models
from django.utils import timezone

from audit.models import AuditableModel
from channels.models import SubSource


class ClientStatus(models.TextChoices):
    """Status choices for clients."""
    ACTIVE = 'active', 'Active'
    CONVERTED = 'converted', 'Converted'
    DECLINED = 'declined', 'Declined'
    NOT_PROCEEDING = 'not_proceeding', 'Not Proceeding'


class ResidencyType(models.TextChoices):
    """Residency type choices."""
    UAE_RESIDENT = 'uae_resident', 'UAE Resident'
    NON_RESIDENT = 'non_resident', 'Non-Resident'


class VisaType(models.TextChoices):
    """Visa type choices."""
    EMPLOYMENT = 'employment', 'Employment'
    INVESTOR = 'investor', 'Investor'
    GOLDEN = 'golden', 'Golden'
    RETIREMENT = 'retirement', 'Retirement'
    OTHER = 'other', 'Other'


class ApplicationType(models.TextChoices):
    """Application type choices."""
    SINGLE = 'single', 'Single'
    JOINT = 'joint', 'Joint'


class EmploymentType(models.TextChoices):
    """Employment type choices."""
    SALARIED = 'salaried', 'Salaried'
    SELF_EMPLOYED = 'self_employed', 'Self Employed'


class PropertyType(models.TextChoices):
    """Property type choices."""
    READY = 'ready', 'Ready'
    OFF_PLAN = 'off_plan', 'Off-Plan'


class TransactionType(models.TextChoices):
    """Transaction type choices."""
    PRIMARY_PURCHASE = 'primary_purchase', 'Primary Purchase'
    RESALE = 'resale', 'Resale'
    BUYOUT_EQUITY = 'buyout_equity', 'Buyout + Equity'
    BUYOUT = 'buyout', 'Buyout'
    EQUITY = 'equity', 'Equity'


class Timeline(models.TextChoices):
    """Timeline choices for client intent."""
    IMMEDIATE = 'immediate', 'Immediate'
    ONE_THREE_MONTHS = '1_3_months', '1-3 Months'
    THREE_SIX_MONTHS = '3_6_months', '3-6 Months'
    EXPLORING = 'exploring', 'Exploring'


class Client(AuditableModel):
    """
    Client model representing qualified mortgage prospects.

    Contains identity, income, liabilities, and property interest information
    needed to calculate eligibility and create cases.
    """

    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the client'
    )

    # Identity Fields
    name = models.CharField(
        max_length=255,
        help_text='Full name of the client'
    )

    phone = models.CharField(
        max_length=20,
        help_text='Phone number'
    )

    email = models.EmailField(
        max_length=255,
        blank=True,
        default='',
        validators=[EmailValidator(message='Enter a valid email address.')],
        help_text='Email address (optional)'
    )

    date_of_birth = models.DateField(
        null=True,
        blank=True,
        help_text='Date of birth'
    )

    nationality = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Nationality'
    )

    emirates_id = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Emirates ID number (optional)'
    )

    residency = models.CharField(
        max_length=20,
        choices=ResidencyType.choices,
        default=ResidencyType.UAE_RESIDENT,
        help_text='Residency status'
    )

    visa_type = models.CharField(
        max_length=20,
        choices=VisaType.choices,
        blank=True,
        default='',
        help_text='Visa type (optional)'
    )

    # Application Type
    application_type = models.CharField(
        max_length=10,
        choices=ApplicationType.choices,
        default=ApplicationType.SINGLE,
        help_text='Single or joint application'
    )

    # Income Fields
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.SALARIED,
        help_text='Employment type'
    )

    monthly_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Monthly salary amount'
    )

    total_addbacks = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Total addbacks (rental income, bonuses, etc.)'
    )

    company_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Employer company name (optional)'
    )

    # Liabilities - Credit Cards
    cc_1_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 1 limit (optional)'
    )

    cc_2_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 2 limit (optional)'
    )

    cc_3_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 3 limit (optional)'
    )

    cc_4_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 4 limit (optional)'
    )

    cc_5_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 5 limit (optional)'
    )

    # Liabilities - Loans
    auto_loan_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Auto loan EMI (optional)'
    )

    personal_loan_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Personal loan EMI (optional)'
    )

    existing_mortgage_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Existing mortgage EMI (optional)'
    )

    # Intent
    notes = models.TextField(
        blank=True,
        default='',
        help_text='Additional notes about the client'
    )

    timeline = models.CharField(
        max_length=20,
        choices=Timeline.choices,
        blank=True,
        default='',
        help_text='Timeline for property purchase'
    )

    # Status & Source
    status = models.CharField(
        max_length=20,
        choices=ClientStatus.choices,
        default=ClientStatus.ACTIVE,
        help_text='Current status of the client'
    )

    sub_source = models.ForeignKey(
        SubSource,
        on_delete=models.PROTECT,
        related_name='clients',
        help_text='Sub-source where client originated'
    )

    converted_from_lead = models.ForeignKey(
        'leads.Lead',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='converted_clients',
        help_text='Lead this client was converted from (if any)'
    )

    # Owner assignment for SLA tracking
    assigned_to = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_clients',
        help_text='User assigned to this client'
    )

    # First Contact SLA tracking
    first_contact_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When First Contact SLA was satisfied (document upload, note, state change, or case created)'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the client was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the client was last updated'
    )

    class Meta:
        db_table = 'clients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status'], name='clients_status_idx'),
            models.Index(fields=['sub_source'], name='clients_sub_source_idx'),
            models.Index(fields=['created_at'], name='clients_created_at_idx'),
            models.Index(fields=['assigned_to'], name='clients_assigned_to_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"

    @property
    def effective_sla_minutes(self):
        """Get effective SLA in minutes from the channel cascade."""
        if self.sub_source:
            return self.sub_source.effective_sla_minutes
        return None

    @property
    def sla_deadline(self):
        """Calculate SLA deadline based on created_at and effective SLA."""
        sla_minutes = self.effective_sla_minutes
        if sla_minutes is None:
            return None
        return self.created_at + timedelta(minutes=sla_minutes)

    @property
    def sla_timer(self) -> dict:
        """
        Calculate SLA timer status.

        Returns:
            dict with keys:
                - effective_sla_minutes: The SLA configuration
                - elapsed_minutes: Minutes since creation
                - remaining_minutes: Minutes until deadline (negative if overdue)
                - is_overdue: Boolean indicating if SLA is breached
                - display: Human-readable string
        """
        deadline = self.sla_deadline
        sla_minutes = self.effective_sla_minutes

        if deadline is None:
            return {
                'effective_sla_minutes': None,
                'elapsed_minutes': 0,
                'remaining_minutes': None,
                'is_overdue': False,
                'display': 'No SLA'
            }

        now = timezone.now()
        elapsed = now - self.created_at
        elapsed_minutes = int(elapsed.total_seconds() / 60)

        remaining = deadline - now
        remaining_minutes = int(remaining.total_seconds() / 60)
        is_overdue = remaining_minutes < 0

        if is_overdue:
            overdue_minutes = abs(remaining_minutes)
            if overdue_minutes >= 1440:  # 24 hours
                days = overdue_minutes // 1440
                display = f"Overdue {days} day{'s' if days > 1 else ''}"
            elif overdue_minutes >= 60:
                hours = overdue_minutes // 60
                display = f"Overdue {hours} hr{'s' if hours > 1 else ''}"
            else:
                display = f"Overdue {overdue_minutes} min{'s' if overdue_minutes > 1 else ''}"
        else:
            if remaining_minutes >= 1440:  # 24 hours
                days = remaining_minutes // 1440
                display = f"{days} day{'s' if days > 1 else ''} left"
            elif remaining_minutes >= 60:
                hours = remaining_minutes // 60
                display = f"{hours} hr{'s' if hours > 1 else ''} left"
            else:
                display = f"{remaining_minutes} min left"

        return {
            'effective_sla_minutes': sla_minutes,
            'elapsed_minutes': elapsed_minutes,
            'remaining_minutes': remaining_minutes,
            'is_overdue': is_overdue,
            'display': display
        }

    @property
    def first_contact_sla_status(self) -> dict:
        """
        Calculate First Contact SLA status.

        Uses the existing sla_timer logic from Channel/Source/SubSource configuration.

        Returns:
            dict with keys:
                - status: 'ok' | 'warning' | 'overdue'
                - remaining_hours: int (negative if overdue)
                - display: Human-readable string (e.g., "12h remaining", "2d overdue")
        """
        # If first contact is already completed, show completed status
        if self.first_contact_completed_at:
            return {
                'status': 'completed',
                'remaining_hours': 0,
                'display': 'Completed'
            }

        sla_minutes = self.effective_sla_minutes
        if sla_minutes is None:
            return {
                'status': 'ok',
                'remaining_hours': None,
                'display': 'No SLA configured'
            }

        deadline = self.sla_deadline
        now = timezone.now()
        remaining = deadline - now
        remaining_minutes = int(remaining.total_seconds() / 60)
        remaining_hours = remaining_minutes // 60

        # Determine status based on thresholds
        if remaining_minutes < 0:
            status = 'overdue'
            overdue_minutes = abs(remaining_minutes)
            if overdue_minutes >= 1440:  # 24 hours
                days = overdue_minutes // 1440
                display = f"{days}d overdue"
            else:
                hours = overdue_minutes // 60
                display = f"{hours}h overdue" if hours > 0 else f"{overdue_minutes}m overdue"
        elif remaining_minutes < (sla_minutes * 0.5):  # Less than 50% remaining
            status = 'warning'
            if remaining_minutes >= 1440:
                days = remaining_minutes // 1440
                display = f"{days}d remaining"
            else:
                hours = remaining_minutes // 60
                display = f"{hours}h remaining" if hours > 0 else f"{remaining_minutes}m remaining"
        else:
            status = 'ok'
            if remaining_minutes >= 1440:
                days = remaining_minutes // 1440
                display = f"{days}d remaining"
            else:
                hours = remaining_minutes // 60
                display = f"{hours}h remaining" if hours > 0 else f"{remaining_minutes}m remaining"

        return {
            'status': status,
            'remaining_hours': remaining_hours,
            'display': display
        }

    @property
    def client_to_case_sla_status(self) -> dict:
        """
        Calculate Client-to-Case SLA status.

        Only computes if first_contact_completed_at is set.
        Uses ClientToCaseSLAConfig for SLA hours (default 168h = 7 days).

        Returns:
            dict with keys:
                - status: 'ok' | 'warning' | 'overdue' | 'not_started'
                - remaining_hours: int (negative if overdue), None if not started
                - display: Human-readable string
        """
        # Only compute if first contact is completed
        if not self.first_contact_completed_at:
            return {
                'status': 'not_started',
                'remaining_hours': None,
                'display': 'Awaiting first contact'
            }

        # Check if a case already exists for this client
        if self.cases.exists():
            return {
                'status': 'completed',
                'remaining_hours': 0,
                'display': 'Case created'
            }

        # Get SLA configuration
        from cases.models import ClientToCaseSLAConfig
        config = ClientToCaseSLAConfig.get_config()
        sla_hours = config.sla_hours

        # Calculate deadline from first_contact_completed_at
        deadline = self.first_contact_completed_at + timedelta(hours=sla_hours)
        now = timezone.now()
        remaining = deadline - now
        remaining_minutes = int(remaining.total_seconds() / 60)
        remaining_hours = remaining_minutes // 60
        sla_minutes = sla_hours * 60

        # Determine status based on thresholds
        if remaining_minutes < 0:
            status = 'overdue'
            overdue_minutes = abs(remaining_minutes)
            if overdue_minutes >= 1440:  # 24 hours
                days = overdue_minutes // 1440
                display = f"{days}d overdue"
            else:
                hours = overdue_minutes // 60
                display = f"{hours}h overdue" if hours > 0 else f"{overdue_minutes}m overdue"
        elif remaining_minutes < (sla_minutes * 0.5):  # Less than 50% remaining
            status = 'warning'
            if remaining_minutes >= 1440:
                days = remaining_minutes // 1440
                display = f"{days}d remaining"
            else:
                hours = remaining_minutes // 60
                display = f"{hours}h remaining" if hours > 0 else f"{remaining_minutes}m remaining"
        else:
            status = 'ok'
            if remaining_minutes >= 1440:
                days = remaining_minutes // 1440
                display = f"{days}d remaining"
            else:
                hours = remaining_minutes // 60
                display = f"{hours}h remaining" if hours > 0 else f"{remaining_minutes}m remaining"

        return {
            'status': status,
            'remaining_hours': remaining_hours,
            'display': display
        }

    def clean(self) -> None:
        """Validate model fields."""
        super().clean()

        # Validate sub_source belongs to trusted channel OR client was converted from lead
        if self.sub_source_id:
            try:
                sub_source = SubSource.objects.select_related(
                    'source__channel'
                ).get(pk=self.sub_source_id)

                if not sub_source.source.channel.is_trusted and not self.converted_from_lead_id:
                    raise ValidationError({
                        'sub_source': 'Clients can only be created from trusted channels or converted from leads.'
                    })
            except SubSource.DoesNotExist:
                raise ValidationError({
                    'sub_source': 'Invalid sub_source.'
                })

    def save(self, *args, **kwargs) -> None:
        """Run full clean before saving and set assigned_to default."""
        # Set assigned_to to created_by if not provided (for new records)
        if self._state.adding and not self.assigned_to_id:
            # Try to get created_by from AuditableModel context
            from audit.models import get_audit_user
            user_id = get_audit_user()
            if user_id:
                self.assigned_to_id = user_id

        self.full_clean()
        super().save(*args, **kwargs)

    # Computed Properties

    @property
    def total_cc_liability(self) -> Decimal:
        """Calculate total credit card liability (5% of each limit)."""
        cc_limits = [
            self.cc_1_limit,
            self.cc_2_limit,
            self.cc_3_limit,
            self.cc_4_limit,
            self.cc_5_limit,
        ]
        total = Decimal('0.00')
        for limit in cc_limits:
            if limit:
                total += limit * Decimal('0.05')
        return total

    @property
    def total_loan_emis(self) -> Decimal:
        """Calculate total loan EMIs."""
        emis = [
            self.auto_loan_emi,
            self.personal_loan_emi,
            self.existing_mortgage_emi,
        ]
        total = Decimal('0.00')
        for emi in emis:
            if emi:
                total += emi
        return total

    @property
    def total_monthly_liabilities(self) -> Decimal:
        """Calculate total monthly liabilities."""
        return self.total_cc_liability + self.total_loan_emis

    def _get_combined_salary(self) -> Decimal:
        """Get combined salary for single or joint application."""
        total = self.monthly_salary or Decimal('0.00')
        if self.application_type == ApplicationType.JOINT:
            try:
                co_applicant = self.co_applicant
                if co_applicant and co_applicant.monthly_salary:
                    total += co_applicant.monthly_salary
            except CoApplicant.DoesNotExist:
                pass
        return total

    def _get_combined_liabilities(self) -> Decimal:
        """Get combined liabilities for single or joint application."""
        total = self.total_monthly_liabilities
        if self.application_type == ApplicationType.JOINT:
            try:
                co_applicant = self.co_applicant
                if co_applicant:
                    total += co_applicant.total_monthly_liabilities
            except CoApplicant.DoesNotExist:
                pass
        return total

    @property
    def dbr_available(self) -> Decimal:
        """
        Calculate DBR (Debt Burden Ratio) available.
        Formula: (Combined Salary / 2) - Combined Liabilities
        For joint applications, combines both applicants' financials.
        """
        combined_salary = self._get_combined_salary()
        if not combined_salary or combined_salary <= 0:
            return Decimal('0.00')

        combined_liabilities = self._get_combined_liabilities()
        half_salary = combined_salary / Decimal('2')
        return half_salary - combined_liabilities

    @property
    def max_loan_amount(self) -> Decimal:
        """
        Calculate maximum loan amount.
        Formula: Combined Monthly Salary * 68
        For joint applications, uses combined salary.
        """
        combined_salary = self._get_combined_salary()
        if not combined_salary:
            return Decimal('0.00')
        return combined_salary * Decimal('68')

    @property
    def can_create_case(self) -> bool:
        """
        Check if client can create a case.
        Simple check: must have positive DBR.
        """
        return self.dbr_available > 0

    def mark_first_contact_complete(self) -> None:
        """
        Mark first contact as completed if not already set.
        Called by signals when qualifying events occur.
        """
        if not self.first_contact_completed_at:
            self.first_contact_completed_at = timezone.now()
            self.save(update_fields=['first_contact_completed_at', 'updated_at'])


class CoApplicant(AuditableModel):
    """
    Co-applicant model for joint mortgage applications.

    Contains identity, income, and liability information for the
    co-applicant. Each client can have at most one co-applicant.
    """

    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the co-applicant'
    )

    # Link to client (OneToOne ensures only one co-applicant per client)
    client = models.OneToOneField(
        Client,
        on_delete=models.CASCADE,
        related_name='co_applicant',
        help_text='The primary client this co-applicant is associated with'
    )

    # Identity Fields
    name = models.CharField(
        max_length=255,
        help_text='Full name of the co-applicant'
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Phone number'
    )

    email = models.EmailField(
        max_length=255,
        blank=True,
        default='',
        validators=[EmailValidator(message='Enter a valid email address.')],
        help_text='Email address (optional)'
    )

    emirates_id = models.CharField(
        max_length=20,
        blank=True,
        default='',
        help_text='Emirates ID number (optional)'
    )

    residency = models.CharField(
        max_length=20,
        choices=ResidencyType.choices,
        default=ResidencyType.UAE_RESIDENT,
        help_text='Residency status'
    )

    visa_type = models.CharField(
        max_length=20,
        choices=VisaType.choices,
        blank=True,
        default='',
        help_text='Visa type (optional)'
    )

    # Income Fields
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.SALARIED,
        help_text='Employment type'
    )

    monthly_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Monthly salary amount'
    )

    company_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Employer company name (optional)'
    )

    # Liabilities - Credit Cards
    cc_1_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 1 limit (optional)'
    )

    cc_2_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 2 limit (optional)'
    )

    cc_3_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 3 limit (optional)'
    )

    cc_4_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 4 limit (optional)'
    )

    cc_5_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Credit card 5 limit (optional)'
    )

    # Liabilities - Loans
    auto_loan_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Auto loan EMI (optional)'
    )

    personal_loan_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Personal loan EMI (optional)'
    )

    existing_mortgage_emi = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Existing mortgage EMI (optional)'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the co-applicant was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the co-applicant was last updated'
    )

    class Meta:
        db_table = 'co_applicants'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Co-applicant: {self.name} (for {self.client.name})"

    # Computed Properties

    @property
    def total_cc_liability(self) -> Decimal:
        """Calculate total credit card liability (5% of each limit)."""
        cc_limits = [
            self.cc_1_limit,
            self.cc_2_limit,
            self.cc_3_limit,
            self.cc_4_limit,
            self.cc_5_limit,
        ]
        total = Decimal('0.00')
        for limit in cc_limits:
            if limit:
                total += limit * Decimal('0.05')
        return total

    @property
    def total_loan_emis(self) -> Decimal:
        """Calculate total loan EMIs."""
        emis = [
            self.auto_loan_emi,
            self.personal_loan_emi,
            self.existing_mortgage_emi,
        ]
        total = Decimal('0.00')
        for emi in emis:
            if emi:
                total += emi
        return total

    @property
    def total_monthly_liabilities(self) -> Decimal:
        """Calculate total monthly liabilities."""
        return self.total_cc_liability + self.total_loan_emis
