from django.apps import AppConfig


class TaskEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'task_engine'

    def ready(self):
        import task_engine.signals
