from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from datetime import date
from decimal import Decimal

from .models import CompletedMove, Estimator, Note
from .pricing import calculate_estimate


class UserRegistrationTests(APITestCase):
    def setUp(self):
        self.url = "/api/user/register/"

    def test_register_creates_user(self):
        response = self.client.post(
            self.url, {"username": "newuser", "password": "supersecret123"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_does_not_return_password(self):
        response = self.client.post(
            self.url, {"username": "newuser2", "password": "supersecret123"}
        )
        self.assertNotIn("password", response.data)

    def test_register_missing_fields_fails(self):
        response = self.client.post(self.url, {"username": "onlyusername"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TokenAuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tokenuser", password="pass12345")

    def test_obtain_token_pair_with_valid_credentials(self):
        response = self.client.post(
            "/api/token/", {"username": "tokenuser", "password": "pass12345"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_obtain_token_pair_with_invalid_credentials(self):
        response = self.client.post(
            "/api/token/", {"username": "tokenuser", "password": "wrongpassword"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token(self):
        refresh = RefreshToken.for_user(self.user)
        response = self.client.post("/api/token/refresh/", {"refresh": str(refresh)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)


class NoteApiTests(APITestCase):
    """Notes are always scoped to an estimate: /api/estimates/<id>/notes/."""

    def setUp(self):
        self.user = User.objects.create_user(username="noteuser", password="pass12345")
        self.other_user = User.objects.create_user(username="otheruser", password="pass12345")
        self.estimate = Estimator.objects.create(
            user=self.user, customer_name="Mine", square_footage=100,
            pound_estimate=100, crew_size=1, price=100,
        )
        self.other_estimate = Estimator.objects.create(
            user=self.other_user, customer_name="Not mine", square_footage=100,
            pound_estimate=100, crew_size=1, price=100,
        )
        self.list_url = f"/api/estimates/{self.estimate.id}/notes/"

    def test_unauthenticated_user_cannot_list_notes(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_create_note_on_own_estimate(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.list_url, {"title": "Move details", "content": "3 bedroom house"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        note = Note.objects.get(id=response.data["id"])
        self.assertEqual(note.author, self.user)
        self.assertEqual(note.estimate, self.estimate)

    def test_user_cannot_create_note_on_someone_elses_estimate(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f"/api/estimates/{self.other_estimate.id}/notes/",
            {"title": "Sneaky", "content": "nope"},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(Note.objects.filter(title="Sneaky").exists())

    def test_user_only_sees_notes_for_the_given_estimate(self):
        other_estimate_of_mine = Estimator.objects.create(
            user=self.user, customer_name="Also mine", square_footage=100,
            pound_estimate=100, crew_size=1, price=100,
        )
        Note.objects.create(title="On estimate 1", content="visible", author=self.user, estimate=self.estimate)
        Note.objects.create(title="On estimate 2", content="hidden", author=self.user, estimate=other_estimate_of_mine)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "On estimate 1")

    def test_notes_appear_nested_in_the_estimate_response(self):
        Note.objects.create(title="Fragile items", content="wrap the china", author=self.user, estimate=self.estimate)

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/estimates/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        matching = [e for e in response.data if e["id"] == self.estimate.id][0]
        self.assertEqual(len(matching["notes"]), 1)
        self.assertEqual(matching["notes"][0]["title"], "Fragile items")

    def test_user_can_delete_own_note(self):
        note = Note.objects.create(title="Delete me", content="bye", author=self.user, estimate=self.estimate)
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f"/api/notes/delete/{note.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Note.objects.filter(id=note.id).exists())

    def test_user_cannot_delete_other_users_note(self):
        note = Note.objects.create(title="Not yours", content="nope", author=self.other_user, estimate=self.other_estimate)
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f"/api/notes/delete/{note.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Note.objects.filter(id=note.id).exists())


class EstimateApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="estimateuser", password="pass12345")
        self.other_user = User.objects.create_user(username="otherestimator", password="pass12345")
        self.list_url = "/api/estimates/"

    def make_estimate(self, user=None, **kwargs):
        defaults = dict(customer_name="Mine", square_footage=100, pound_estimate=100, crew_size=1, price=100)
        defaults.update(kwargs)
        return Estimator.objects.create(user=user or self.user, **defaults)

    def test_unauthenticated_user_cannot_list_estimates(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_estimate_calculates_price_server_side(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "customer_name": "Jane Doe",
            "square_footage": 1000,
            "pound_estimate": 5000,
            "crew_size": 2,
            "origin_stairs": 1,
            "special_items": {"upright_piano": 1},
        }
        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        expected = calculate_estimate(
            square_footage=1000, pound_estimate=5000, crew_size=2,
            origin_stairs=1, special_items={"upright_piano": 1},
        )
        self.assertEqual(Decimal(response.data["price"]), expected["price"])
        self.assertEqual(response.data["breakdown"]["crew"], 2)
        self.assertEqual(Decimal(response.data["estimated_hours"]), Decimal(str(expected["billable_hours"])))
        self.assertEqual(response.data["user"], self.user.id)

    def test_create_with_only_square_footage_recommends_crew_and_weight(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.list_url, {"customer_name": "Min", "square_footage": 1200}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["crew_size"])
        self.assertEqual(response.data["breakdown"]["crew_source"], "recommended for weight")
        self.assertGreater(response.data["breakdown"]["weight"], 0)

    def test_create_estimate_ignores_client_supplied_price(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "customer_name": "Sneaky", "square_footage": 100, "pound_estimate": 100,
            "crew_size": 1, "price": 999999, "breakdown": {"total": 1},
        }
        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(Decimal(response.data["price"]), Decimal("999999"))
        self.assertNotEqual(response.data["breakdown"], {"total": 1})

    def test_unknown_special_item_is_rejected(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.list_url,
            {"customer_name": "X", "square_footage": 100, "special_items": {"spaceship": 1}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("special_items", response.data)

    def test_user_only_sees_own_estimates(self):
        self.make_estimate()
        self.make_estimate(user=self.other_user, customer_name="Not mine")

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["customer_name"], "Mine")

    def test_status_filter_splits_open_and_completed(self):
        self.make_estimate(customer_name="Open")
        done = self.make_estimate(customer_name="Done")
        CompletedMove.objects.create(estimate=done, completed_date=date(2026, 5, 1), actual_hours=5, actual_crew_size=3)

        self.client.force_authenticate(user=self.user)
        open_names = [e["customer_name"] for e in self.client.get(self.list_url + "?status=open").data]
        done_names = [e["customer_name"] for e in self.client.get(self.list_url + "?status=completed").data]

        self.assertEqual(open_names, ["Open"])
        self.assertEqual(done_names, ["Done"])
        self.assertEqual(len(self.client.get(self.list_url).data), 2)
        self.assertIsNotNone(self.client.get(self.list_url + "?status=completed").data[0]["completion"])
        self.assertIsNone(self.client.get(self.list_url + "?status=open").data[0]["completion"])

    def test_update_estimate_recalculates_price(self):
        self.client.force_authenticate(user=self.user)
        created = self.client.post(
            self.list_url,
            {"customer_name": "Jane", "square_footage": 1000, "pound_estimate": 5000, "crew_size": 2},
            format="json",
        ).data

        response = self.client.patch(
            f"/api/estimates/update/{created['id']}/", {"dest_stairs": 3}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected = calculate_estimate(square_footage=1000, pound_estimate=5000, crew_size=2, dest_stairs=3)
        self.assertEqual(Decimal(response.data["price"]), expected["price"])
        self.assertGreater(Decimal(response.data["price"]), Decimal(created["price"]))

    def test_user_can_delete_own_estimate(self):
        estimate = self.make_estimate(customer_name="Delete me")
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f"/api/estimates/delete/{estimate.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Estimator.objects.filter(id=estimate.id).exists())

    def test_user_cannot_delete_other_users_estimate(self):
        estimate = self.make_estimate(user=self.other_user, customer_name="Not yours")
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f"/api/estimates/delete/{estimate.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Estimator.objects.filter(id=estimate.id).exists())

    def test_preview_returns_breakdown_without_saving(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/estimates/preview/", {"square_footage": 800}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total", response.data)
        self.assertIn("hours", response.data)
        self.assertFalse(Estimator.objects.exists())

    def test_pricing_options_lists_special_items(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/pricing/options/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        values = [i["value"] for i in response.data["special_items"]]
        self.assertIn("upright_piano", values)


class CompletionApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="mover", password="pass12345")
        self.other_user = User.objects.create_user(username="rival", password="pass12345")
        self.estimate = Estimator.objects.create(
            user=self.user, customer_name="Mine", square_footage=1000, price=1000, estimated_hours=5,
        )
        self.url = f"/api/estimates/{self.estimate.id}/completion/"
        self.payload = {"completed_date": "2026-06-01", "actual_hours": "6.5", "actual_crew_size": 3, "final_price": "1500.00"}

    def test_mark_completed_then_update(self):
        self.client.force_authenticate(user=self.user)
        created = self.client.put(self.url, self.payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["completion"]["actual_hours"], "6.50")

        updated = self.client.put(self.url, {**self.payload, "actual_hours": "7"}, format="json")
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(CompletedMove.objects.count(), 1)
        self.assertEqual(CompletedMove.objects.get().actual_hours, Decimal("7"))

    def test_reopen_deletes_completion_but_keeps_estimate(self):
        CompletedMove.objects.create(estimate=self.estimate, completed_date=date(2026, 6, 1), actual_hours=6, actual_crew_size=3)
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CompletedMove.objects.exists())
        self.assertTrue(Estimator.objects.filter(id=self.estimate.id).exists())

    def test_invalid_hours_rejected(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put(self.url, {**self.payload, "actual_hours": "0"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_complete_someone_elses_estimate(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.put(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(CompletedMove.objects.exists())
