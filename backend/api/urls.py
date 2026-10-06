from django.urls import path
from . import views

urlpatterns = [
    path("estimates/", views.EstimateListCreate.as_view(), name="create-estimate"),
    path("estimates/preview/", views.EstimatePreview.as_view(), name="preview-estimate"),
    path("estimates/delete/<int:pk>/", views.DeleteEstimate.as_view(), name="delete-estimate"),
    path("estimates/update/<int:pk>/", views.UpdateEstimate.as_view(), name="update-estimate"),
    path("estimates/<int:pk>/completion/", views.EstimateCompletion.as_view(), name="estimate-completion"),
    path("estimates/<int:estimate_id>/notes/", views.NoteListCreate.as_view(), name="estimate-notes"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"),
    path("pricing/options/", views.PricingOptions.as_view(), name="pricing-options"),
]
