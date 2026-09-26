import os
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve

FRONTEND_PUBLIC_DIR = os.path.abspath(os.path.join(settings.BASE_DIR, '..', '..', 'frontend', 'public'))

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('home.urls')),
    re_path(r'^(?P<path>(manifest\.json|sw\.js|icons/.*))$', serve, {'document_root': FRONTEND_PUBLIC_DIR}),
]




