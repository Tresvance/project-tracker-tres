import os
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve

from urllib.parse import quote
from django.http import HttpResponseRedirect
from home.views import CustomAdminLoginView

FRONTEND_PUBLIC_DIR = os.path.abspath(os.path.join(settings.BASE_DIR, '..', '..', 'frontend', 'public'))

# Gatekeeper: If a PM Dashboard user navigates to /admin/, redirect them to the PM dashboard
_original_admin_index = admin.site.index

def _gated_admin_index(request, extra_context=None):
    if request.user.is_authenticated and not request.user.is_superuser:
        user_name = request.user.first_name or request.user.username
        host = request.get_host()
        referer = request.META.get('HTTP_REFERER', '')
        if '8000' in host and '5173' not in referer and '5173' not in host:
            frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            return HttpResponseRedirect(f"{frontend_base}/?view=dashboard&auth=1&name={quote(user_name)}")
        return HttpResponseRedirect(f"/?view=dashboard&auth=1&name={quote(user_name)}")
    return _original_admin_index(request, extra_context=extra_context)

admin.site.index = _gated_admin_index

urlpatterns = [
    path('admin/login/', CustomAdminLoginView.as_view(), name='admin_login'),
    path('admin/', admin.site.urls),
    path('api/', include('home.urls')),
    re_path(r'^(?P<path>(manifest\.json|sw\.js|icons/.*))$', serve, {'document_root': FRONTEND_PUBLIC_DIR}),
]




