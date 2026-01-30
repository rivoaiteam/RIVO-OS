"""
Management command to seed default users for development.
"""

from django.core.management.base import BaseCommand
from users.models import User, UserRole


class Command(BaseCommand):
    help = 'Seed default users for development'

    def handle(self, *args, **options):
        users_data = [
            {
                'username': 'sanjana',
                'email': 'sanjana@rivo.com',
                'name': 'Sanjana Admin',
                'role': UserRole.ADMIN,
                'password': 'rivo26',
            },
            {
                'username': 'channelowner1',
                'email': 'channelowner1@rivo.com',
                'name': 'Chris Owner',
                'role': UserRole.CHANNEL_OWNER,
                'password': 'rivo26',
            },
            {
                'username': 'teamlead1',
                'email': 'teamlead1@rivo.com',
                'name': 'Tina Leader',
                'role': UserRole.TEAM_LEADER,
                'password': 'rivo26',
            },
            {
                'username': 'specialist1',
                'email': 'specialist1@rivo.com',
                'name': 'Sara Specialist',
                'role': UserRole.MS,
                'password': 'rivo26',
            },
            {
                'username': 'officer1',
                'email': 'officer1@rivo.com',
                'name': 'Omar Officer',
                'role': UserRole.PO,
                'password': 'rivo26',
            },
            {
                'username': 'specialist2',
                'email': 'specialist2@rivo.com',
                'name': 'Sam Specialist',
                'role': UserRole.MS,
                'password': 'rivo26',
            },
        ]

        for data in users_data:
            password = data.pop('password')
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults=data
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Created user: {user.username} ({user.role})')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'User already exists: {user.username}')
                )

        self.stdout.write(self.style.SUCCESS('Seeding complete!'))
