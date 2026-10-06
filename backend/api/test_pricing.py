"""Unit tests for the pricing engine.

These run against a frozen copy of the config (TEST_PRICING) so you can
tune the real numbers in pricing.py without breaking tests. The
"relationship" tests (stairs cost more than no stairs, etc.) should hold
for any sensible config.
"""
import copy
from decimal import Decimal
from unittest.mock import patch

from django.test import SimpleTestCase

from . import pricing
from .pricing import calculate_estimate, recommended_crew

TEST_PRICING = {
    "HOURLY_RATE_PER_MOVER": Decimal("70.00"),
    "TRUCK_HOURLY_RATE": Decimal("40.00"),
    "TRIP_FEE": Decimal("100.00"),
    "MINIMUM_HOURS": 3.0,
    "BILLING_INCREMENT_HOURS": 0.25,
    "SHOP_TRAVEL_HOURS": 0.5,
    "ESTIMATE_RANGE_PCT": 0.10,
    "LBS_PER_SQFT": 7,
    "CREW_BY_WEIGHT": [(3000, 2), (7000, 3), (12000, 4), (float("inf"), 5)],
    "LBS_PER_MOVER_HOUR_LOAD": 1000,
    "LBS_PER_MOVER_HOUR_UNLOAD": 1250,
    "STAIRS_PCT_PER_FLIGHT": 0.10,
    "ELEVATOR_PCT": 0.15,
    "LONG_CARRY_FREE_FT": 50,
    "LONG_CARRY_PCT_PER_50FT": 0.05,
    "PARKING": {
        "dock": ("Loading dock", -0.10),
        "driveway": ("Driveway / at the door", 0.0),
        "street": ("Street parking", 0.05),
        "far": ("Far / no parking", 0.20),
    },
    "PACKING": {
        "none": ("No packing", 0.0, Decimal("0")),
        "partial": ("Partial packing", 0.75, Decimal("25")),
        "full": ("Full packing", 2.0, Decimal("60")),
    },
    "ASSEMBLY_MINUTES_PER_ITEM": 20,
    "SPECIAL_ITEMS": {
        "upright_piano": ("Upright piano", 30, Decimal("150")),
        "gun_safe": ("Gun safe", 30, Decimal("150")),
    },
}


class PricingEngineTests(SimpleTestCase):
    def setUp(self):
        patcher = patch.object(pricing, "PRICING", copy.deepcopy(TEST_PRICING))
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_known_values_square_footage_only(self):
        # 1000 sqft x 7 = 7000 lbs -> 3 movers
        # load 7000/1000/3 = 2.333, unload 7000/1250/3 = 1.867, travel 0.5
        # = 4.7 hrs -> 4.75 billable x (3x70 + 40 = $250/hr) = 1187.50 + 100 trip
        result = calculate_estimate(square_footage=1000)
        self.assertEqual(result["weight"], 7000)
        self.assertEqual(result["crew"], 3)
        self.assertEqual(result["billable_hours"], 4.75)
        self.assertEqual(result["hourly_rate"], 250.0)
        self.assertEqual(result["price"], Decimal("1287.50"))
        self.assertEqual(result["low"], 1158.75)
        self.assertEqual(result["high"], 1416.25)

    def test_entered_weight_and_crew_override_defaults(self):
        result = calculate_estimate(square_footage=1000, pound_estimate=2000, crew_size=5)
        self.assertEqual(result["weight"], 2000)
        self.assertEqual(result["weight_source"], "entered")
        self.assertEqual(result["crew"], 5)

    def test_minimum_hours_applied_to_small_jobs(self):
        result = calculate_estimate(square_footage=100)
        self.assertTrue(result["minimum_applied"])
        self.assertEqual(result["billable_hours"], 3.0)

    def test_billable_hours_round_up_to_increment(self):
        result = calculate_estimate(square_footage=1000)
        self.assertGreaterEqual(result["billable_hours"], result["total_hours"])
        self.assertEqual(result["billable_hours"] % 0.25, 0)

    def test_recommended_crew_thresholds(self):
        self.assertEqual(recommended_crew(2500), 2)
        self.assertEqual(recommended_crew(3000), 2)
        self.assertEqual(recommended_crew(3001), 3)
        self.assertEqual(recommended_crew(50000), 5)

    def test_stairs_add_time(self):
        flat = calculate_estimate(square_footage=2000, origin_stairs=0)
        stairs = calculate_estimate(square_footage=2000, origin_stairs=3)
        self.assertGreater(stairs["total_hours"], flat["total_hours"])

    def test_elevator_replaces_stairs(self):
        elevator = calculate_estimate(square_footage=2000, dest_stairs=5, dest_elevator=True)
        elevator_only = calculate_estimate(square_footage=2000, dest_elevator=True)
        self.assertEqual(elevator["total_hours"], elevator_only["total_hours"])

    def test_long_carry_free_distance_then_per_50ft(self):
        base = calculate_estimate(square_footage=2000, pound_estimate=10000, crew_size=4)
        within_free = calculate_estimate(square_footage=2000, pound_estimate=10000, crew_size=4, origin_long_carry_ft=50)
        just_over = calculate_estimate(square_footage=2000, pound_estimate=10000, crew_size=4, origin_long_carry_ft=60)
        self.assertEqual(base["total_hours"], within_free["total_hours"])
        # 10000/1000/4 = 2.5 hrs load, +5% = 0.125 hrs
        self.assertAlmostEqual(just_over["total_hours"] - base["total_hours"], 0.125, places=2)

    def test_loading_dock_is_faster_than_far_parking(self):
        dock = calculate_estimate(square_footage=2000, origin_parking="dock")
        far = calculate_estimate(square_footage=2000, origin_parking="far")
        self.assertLess(dock["total_hours"], far["total_hours"])

    def test_special_items_add_time_and_fees(self):
        base = calculate_estimate(square_footage=2000)
        piano = calculate_estimate(square_footage=2000, special_items={"upright_piano": 2})
        self.assertAlmostEqual(piano["total_hours"] - base["total_hours"], 1.0, places=2)
        fee_lines = [c for c in piano["costs"] if "Upright piano" in c["label"]]
        self.assertEqual(fee_lines[0]["amount"], 300.0)

    def test_unknown_special_items_are_ignored(self):
        base = calculate_estimate(square_footage=2000)
        weird = calculate_estimate(square_footage=2000, special_items={"spaceship": 1})
        self.assertEqual(base["price"], weird["price"])

    def test_packing_adds_hours_and_materials(self):
        result = calculate_estimate(square_footage=1000, packing="full")
        labels = [c["label"] for c in result["costs"]]
        self.assertIn("Packing materials", labels)
        self.assertIn("Packing", [h["label"] for h in result["hours"]])

    def test_drive_time_is_billed(self):
        base = calculate_estimate(square_footage=2000)
        drive = calculate_estimate(square_footage=2000, drive_minutes=45)
        self.assertAlmostEqual(drive["total_hours"] - base["total_hours"], 0.75, places=2)

    def test_breakdown_is_json_serialisable_without_price(self):
        import json
        result = calculate_estimate(square_footage=1500, special_items={"gun_safe": 1})
        result.pop("price")
        json.dumps(result)
