from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db import models
from .models import AdminLogin

class DualAdminAuthBackend(ModelBackend):
    """
    Custom authentication backend that supports:
    1. PM Dashboard users defined in AdminLogin (email or name + password).
       Maps them to a Django User with is_staff=True, is_superuser=False.
    2. Django Superusers / system Users defined in auth_user (like 'admin').
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        # 1. Check AdminLogin table for PM Dashboard accounts
        pm_user = AdminLogin.objects.filter(
            models.Q(email__iexact=username) | models.Q(name__iexact=username)
        ).first()

        if pm_user and pm_user.password == password:
            User = get_user_model()
            django_user, created = User.objects.get_or_create(
                username=pm_user.email,
                defaults={
                    'email': pm_user.email,
                    'first_name': pm_user.name,
                    'is_staff': True,
                    'is_superuser': False,
                }
            )

            needs_save = False
            if not django_user.is_staff:
                django_user.is_staff = True
                needs_save = True
            if django_user.is_superuser:
                django_user.is_superuser = False
                needs_save = True
            if django_user.first_name != pm_user.name:
                django_user.first_name = pm_user.name
                needs_save = True
            if django_user.email != pm_user.email:
                django_user.email = pm_user.email
                needs_save = True
            if not django_user.check_password(password):
                django_user.set_password(password)
                needs_save = True

            if needs_save:
                django_user.save()

            return django_user

        # 2. Fall back to standard ModelBackend for superusers
        return super().authenticate(request, username=username, password=password, **kwargs)
