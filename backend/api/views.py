from decimal import Decimal

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CompletedMove, Estimator, Note
from .pricing import calculate_estimate, options
from .serializers import (
    ESTIMATE_INPUT_FIELDS,
    CompletedMoveSerializer,
    EstimatePreviewSerializer,
    EstimatorSerializer,
    NoteSerializer,
    UserSerializer,
)


def price_move(validated_data, instance=None):
    """Run the pricing engine on the move details. On a partial update,
    fields the client didn't send fall back to the saved values."""
    inputs = {}
    for field in ESTIMATE_INPUT_FIELDS:
        if field in validated_data:
            inputs[field] = validated_data[field]
        elif instance is not None:
            inputs[field] = getattr(instance, field)
    result = calculate_estimate(**inputs)
    price = result.pop("price")
    return {
        "price": price,
        "estimated_hours": Decimal(str(result["billable_hours"])),
        "breakdown": result,
    }


class NoteListCreate(generics.ListCreateAPIView):
    """List/create notes scoped to a single estimate, e.g.
    /api/estimates/<estimate_id>/notes/. Notes always belong to an estimate
    owned by the requesting user; 404s if the estimate doesn't exist or
    belongs to someone else, rather than leaking which estimate IDs exist."""
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_estimate(self):
        return get_object_or_404(
            Estimator, pk=self.kwargs['estimate_id'], user=self.request.user
        )

    def get_queryset(self):
        estimate = self.get_estimate()
        return Note.objects.filter(author=self.request.user, estimate=estimate)

    def perform_create(self, serializer):
        estimate = self.get_estimate()
        serializer.save(author=self.request.user, estimate=estimate)


class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(author=self.request.user)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class EstimateListCreate(generics.ListCreateAPIView):
    """GET /api/estimates/?status=open|completed (omit for all)."""
    serializer_class = EstimatorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Estimator.objects.filter(user=self.request.user)
            .select_related('completion')
            .prefetch_related('notes')
        )
        status_filter = self.request.query_params.get('status')
        if status_filter == 'open':
            qs = qs.filter(completion__isnull=True)
        elif status_filter == 'completed':
            return qs.filter(completion__isnull=False).order_by('-completion__completed_date', '-created_at')
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, **price_move(serializer.validated_data))


class EstimatePreview(APIView):
    """POST the move details, get the price breakdown back without saving.
    Powers the live quote on the estimate form."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EstimatePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        priced = price_move(serializer.validated_data)
        return Response(priced["breakdown"])


class PricingOptions(APIView):
    """Choice lists (parking, packing, special items) for the form."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(options())


class DeleteEstimate(generics.DestroyAPIView):
    serializer_class = EstimatorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Estimator.objects.filter(user=self.request.user)


class UpdateEstimate(generics.UpdateAPIView):
    serializer_class = EstimatorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Estimator.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(**price_move(serializer.validated_data, serializer.instance))


class EstimateCompletion(APIView):
    """/api/estimates/<id>/completion/
    GET    - the completion record (404 if not completed)
    PUT    - mark completed / update the actual results
    DELETE - un-complete (moves it back to open estimates)"""
    permission_classes = [IsAuthenticated]

    def get_estimate(self, pk):
        return get_object_or_404(Estimator, pk=pk, user=self.request.user)

    def get(self, request, pk):
        completion = get_object_or_404(CompletedMove, estimate=self.get_estimate(pk))
        return Response(CompletedMoveSerializer(completion).data)

    def put(self, request, pk):
        estimate = self.get_estimate(pk)
        existing = CompletedMove.objects.filter(estimate=estimate).first()
        serializer = CompletedMoveSerializer(existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(estimate=estimate)
        estimate.refresh_from_db()
        return Response(
            EstimatorSerializer(estimate).data,
            status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED,
        )

    def delete(self, request, pk):
        completion = get_object_or_404(CompletedMove, estimate=self.get_estimate(pk))
        completion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
