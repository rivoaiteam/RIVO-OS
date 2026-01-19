from django.apps import AppConfig


class ClientsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'clients'

    def ready(self):
        """
        Import signals when the app is ready.
        This registers the signal handlers for First Contact SLA tracking.
        """
        import clients.signals  # noqa: F401
