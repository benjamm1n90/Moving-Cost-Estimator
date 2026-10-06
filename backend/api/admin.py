from django.contrib import admin
from .models import CompletedMove, Note, Estimator


class NoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'created_at')
    search_fields = ('title', 'content', 'author__username')


class EstimatorAdmin(admin.ModelAdmin):
    list_display = ('customer_name', 'user', 'move_date', 'square_footage', 'estimated_hours', 'price', 'created_at')
    search_fields = ('customer_name', 'user__username')
    readonly_fields = ('estimated_hours', 'price', 'breakdown')


class CompletedMoveAdmin(admin.ModelAdmin):
    list_display = ('estimate', 'completed_date', 'actual_hours', 'actual_crew_size', 'final_price')


admin.site.register(Note, NoteAdmin)
admin.site.register(Estimator, EstimatorAdmin)
admin.site.register(CompletedMove, CompletedMoveAdmin)
