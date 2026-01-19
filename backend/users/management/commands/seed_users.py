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
                'username': 'manager1',
                'email': 'manager1@rivo.com',
                'name': 'Mike Manager',
                'role': UserRole.MANAGER,
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
                'username': 'executive1',
                'email': 'executive1@rivo.com',
                'name': 'Eric Executive',
                'role': UserRole.PE,
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
