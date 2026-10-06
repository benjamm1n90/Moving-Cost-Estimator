from django.db import models
from django.contrib.auth.models import User

from .pricing import packing_choices, parking_choices


class Estimator(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='estimations')
    customer_name = models.CharField(max_length=100, default="Customer")
    move_date = models.DateField(null=True, blank=True)

    # Size of the move. If pound_estimate is blank, weight is derived from
    # square footage (see pricing.LBS_PER_SQFT).
    square_footage = models.PositiveIntegerField()
    pound_estimate = models.PositiveIntegerField(null=True, blank=True)

    # Blank = let the pricing engine recommend a crew size.
    crew_size = models.PositiveIntegerField(null=True, blank=True)

    packing = models.CharField(max_length=20, choices=packing_choices(), default="none")

    # Access at pickup
    origin_stairs = models.PositiveIntegerField(default=0, help_text="Flights of stairs")
    origin_elevator = models.BooleanField(default=False)
    origin_long_carry_ft = models.PositiveIntegerField(default=0, help_text="Walk from door to truck, in feet")
    origin_parking = models.CharField(max_length=20, choices=parking_choices(), default="driveway")

    # Access at drop-off
    dest_stairs = models.PositiveIntegerField(default=0, help_text="Flights of stairs")
    dest_elevator = models.BooleanField(default=False)
    dest_long_carry_ft = models.PositiveIntegerField(default=0, help_text="Walk from door to truck, in feet")
    dest_parking = models.CharField(max_length=20, choices=parking_choices(), default="driveway")

    drive_minutes = models.PositiveIntegerField(default=0, help_text="Drive time between locations")
    assembly_items = models.PositiveIntegerField(default=0, help_text="Furniture to take apart / put together")
    # {"upright_piano": 1, "gun_safe": 2, ...} - keys from pricing.SPECIAL_ITEMS
    special_items = models.JSONField(default=dict, blank=True)

    # Calculated by the pricing engine - never set directly by the client.
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    breakdown = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Estimate by {self.user.username} : {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"


class CompletedMove(models.Model):
    """What actually happened on the job, recorded after the move so
    estimates can be compared against reality."""
    estimate = models.OneToOneField(Estimator, on_delete=models.CASCADE, related_name='completion')
    completed_date = models.DateField()
    actual_hours = models.DecimalField(max_digits=6, decimal_places=2)
    actual_crew_size = models.PositiveIntegerField()
    final_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Completed: {self.estimate.customer_name} on {self.completed_date}"


class Note(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    # Notes are created via the "Add Notes" panel on a specific estimate.
    # Nullable so the migration adding this column doesn't require a default
    # for any pre-existing rows, but the app never creates a note without one.
    estimate = models.ForeignKey(
        Estimator, on_delete=models.CASCADE, related_name='notes', null=True, blank=True
    )

    def __str__(self):
        return self.title
