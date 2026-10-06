from django.contrib.auth.models import User
from rest_framework import serializers
from .models import CompletedMove, Estimator, Note
from .pricing import PRICING


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ['id', 'title', 'content', 'created_at', 'author', 'estimate']
        extra_kwargs = {'author': {'read_only': True}, 'estimate': {'read_only': True}}


class CompletedMoveSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompletedMove
        fields = [
            'id', 'completed_date', 'actual_hours', 'actual_crew_size',
            'final_price', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_actual_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError("Must be greater than 0.")
        return value

    def validate_actual_crew_size(self, value):
        if value < 1:
            raise serializers.ValidationError("Must be at least 1.")
        return value


# Fields the client sends to describe a move. Used by both the saved
# estimate serializer and the unsaved preview.
ESTIMATE_INPUT_FIELDS = [
    'square_footage', 'pound_estimate', 'crew_size', 'packing',
    'origin_stairs', 'origin_elevator', 'origin_long_carry_ft', 'origin_parking',
    'dest_stairs', 'dest_elevator', 'dest_long_carry_ft', 'dest_parking',
    'drive_minutes', 'assembly_items', 'special_items',
]


class EstimatorSerializer(serializers.ModelSerializer):
    notes = NoteSerializer(many=True, read_only=True)
    completion = CompletedMoveSerializer(read_only=True)

    class Meta:
        model = Estimator
        fields = [
            'id', 'user', 'customer_name', 'move_date', *ESTIMATE_INPUT_FIELDS,
            'estimated_hours', 'price', 'breakdown',
            'created_at', 'updated_at', 'notes', 'completion',
        ]
        read_only_fields = [
            'user', 'estimated_hours', 'price', 'breakdown', 'created_at', 'updated_at',
        ]

    def validate_square_footage(self, value):
        if value < 1:
            raise serializers.ValidationError("Must be at least 1.")
        return value

    def validate_crew_size(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError("Must be at least 1.")
        return value or None  # 0 means "recommend for me"

    def validate_pound_estimate(self, value):
        return value or None  # 0 means "work it out from square footage"

    def validate_special_items(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object of {item: count}.")
        cleaned = {}
        for key, count in value.items():
            if key not in PRICING["SPECIAL_ITEMS"]:
                raise serializers.ValidationError(f"Unknown special item '{key}'.")
            try:
                count = int(count)
            except (TypeError, ValueError):
                raise serializers.ValidationError(f"Count for '{key}' must be a whole number.")
            if count < 0:
                raise serializers.ValidationError(f"Count for '{key}' can't be negative.")
            if count:
                cleaned[key] = count
        return cleaned


class EstimatePreviewSerializer(EstimatorSerializer):
    """Same validation as a saved estimate, but customer name isn't needed."""
    class Meta(EstimatorSerializer.Meta):
        extra_kwargs = {'customer_name': {'required': False}}
