"""
Hours-based moving estimate engine.

How an estimate is built:

    1. Weight      - use the pound estimate if given, otherwise square footage
                     x LBS_PER_SQFT.
    2. Crew        - use the crew size if given, otherwise pick one from
                     CREW_BY_WEIGHT.
    3. Hours       - load + unload time (weight / crew speed, slowed down by
                     stairs, long carries and parking at each end), plus
                     packing, furniture assembly, special items, drive time
                     and shop travel time.
    4. Billable    - round up to BILLING_INCREMENT_HOURS, never below
                     MINIMUM_HOURS.
    5. Price       - billable hours x (crew x per-mover rate + truck rate),
                     plus trip fee, packing materials and special item fees.

=========================================================================
EVERY NUMBER YOU'LL WANT TO TUNE LIVES IN `PRICING` BELOW.
The values are placeholders - adjust them to match real jobs. Changing
them affects new estimates and estimates you edit; saved estimates keep
the breakdown they were priced with until they're edited.
=========================================================================
"""

from decimal import Decimal, ROUND_HALF_UP
import math

PRICING = {
    # --- Rates -------------------------------------------------------------
    "HOURLY_RATE_PER_MOVER": Decimal("70.00"),
    "TRUCK_HOURLY_RATE": Decimal("40.00"),
    "TRIP_FEE": Decimal("100.00"),  # flat charge per job (fuel, truck prep)

    # --- Billing rules -----------------------------------------------------
    "MINIMUM_HOURS": 3.0,
    "BILLING_INCREMENT_HOURS": 0.25,  # round billable time up to this
    "SHOP_TRAVEL_HOURS": 0.5,  # shop -> origin + destination -> shop
    "ESTIMATE_RANGE_PCT": 0.10,  # quote shown as total +/- this %

    # --- Weight ------------------------------------------------------------
    # Used when no pound estimate is entered.
    "LBS_PER_SQFT": 7,

    # --- Crew --------------------------------------------------------------
    # (max weight in lbs, crew size). First row the weight fits under wins.
    "CREW_BY_WEIGHT": [
        (3000, 2),
        (7000, 3),
        (12000, 4),
        (float("inf"), 5),
    ],

    # --- Work speed (ideal conditions: ground floor, truck at the door) -----
    "LBS_PER_MOVER_HOUR_LOAD": 1000,
    "LBS_PER_MOVER_HOUR_UNLOAD": 1250,

    # --- Access: each adds a % to load time (origin) or unload time (dest) --
    "STAIRS_PCT_PER_FLIGHT": 0.10,
    "ELEVATOR_PCT": 0.15,  # used instead of stairs when there's an elevator
    "LONG_CARRY_FREE_FT": 50,  # carry distance included at no extra time
    "LONG_CARRY_PCT_PER_50FT": 0.05,  # per 50 ft (or part) beyond the free ft
    "PARKING": {
        # key: (label, % added)
        "dock": ("Loading dock", -0.10),
        "driveway": ("Driveway / at the door", 0.0),
        "street": ("Street parking", 0.05),
        "far": ("Far / no parking (shuttle or long walk)", 0.20),
    },

    # --- Packing -----------------------------------------------------------
    # key: (label, mover-hours per 1,000 lbs, materials $ per 1,000 lbs)
    "PACKING": {
        "none": ("No packing (customer packs)", 0.0, Decimal("0")),
        "partial": ("Partial packing (kitchen, fragiles)", 0.75, Decimal("25")),
        "full": ("Full packing", 2.0, Decimal("60")),
    },

    # --- Furniture disassembly / reassembly --------------------------------
    "ASSEMBLY_MINUTES_PER_ITEM": 20,  # mover-minutes per item (both ends)

    # --- Special items -----------------------------------------------------
    # key: (label, extra crew minutes each, flat fee each)
    "SPECIAL_ITEMS": {
        "upright_piano": ("Upright piano", 30, Decimal("150")),
        "grand_piano": ("Grand piano", 60, Decimal("350")),
        "gun_safe": ("Gun safe / heavy safe", 30, Decimal("150")),
        "pool_table": ("Pool table", 60, Decimal("200")),
        "hot_tub": ("Hot tub", 60, Decimal("300")),
        "heavy_item": ("Other heavy item (300+ lbs)", 15, Decimal("50")),
        "high_value": ("High-value / fragile item (art, antiques)", 15, Decimal("25")),
        "appliance": ("Large appliance (washer, fridge)", 10, Decimal("0")),
    },
}


# ---------------------------------------------------------------------------
# Helpers to expose choices to models / API
# ---------------------------------------------------------------------------

def parking_choices():
    return [(k, v[0]) for k, v in PRICING["PARKING"].items()]


def packing_choices():
    return [(k, v[0]) for k, v in PRICING["PACKING"].items()]


def options():
    """Choice lists for the frontend form, so labels live only here."""
    return {
        "parking": [{"value": k, "label": v[0]} for k, v in PRICING["PARKING"].items()],
        "packing": [{"value": k, "label": v[0]} for k, v in PRICING["PACKING"].items()],
        "special_items": [
            {"value": k, "label": v[0], "fee": float(v[2]), "minutes": v[1]}
            for k, v in PRICING["SPECIAL_ITEMS"].items()
        ],
        "hourly_rate_per_mover": float(PRICING["HOURLY_RATE_PER_MOVER"]),
        "truck_hourly_rate": float(PRICING["TRUCK_HOURLY_RATE"]),
        "minimum_hours": PRICING["MINIMUM_HOURS"],
    }


# ---------------------------------------------------------------------------
# Calculation
# ---------------------------------------------------------------------------

def _money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _round_hours(value):
    return round(value, 2)


def recommended_crew(weight):
    for max_weight, crew in PRICING["CREW_BY_WEIGHT"]:
        if weight <= max_weight:
            return crew
    return PRICING["CREW_BY_WEIGHT"][-1][1]


def access_factor(stairs=0, elevator=False, long_carry_ft=0, parking="driveway"):
    """Returns (pct, [explanations]) - the extra % of time for one end."""
    pct = 0.0
    reasons = []
    if elevator:
        pct += PRICING["ELEVATOR_PCT"]
        reasons.append(f"elevator +{PRICING['ELEVATOR_PCT']:.0%}")
    elif stairs:
        stairs_pct = PRICING["STAIRS_PCT_PER_FLIGHT"] * stairs
        pct += stairs_pct
        reasons.append(f"{stairs} flight(s) of stairs +{stairs_pct:.0%}")

    extra_ft = max(0, (long_carry_ft or 0) - PRICING["LONG_CARRY_FREE_FT"])
    if extra_ft:
        carry_pct = math.ceil(extra_ft / 50) * PRICING["LONG_CARRY_PCT_PER_50FT"]
        pct += carry_pct
        reasons.append(f"{long_carry_ft} ft carry +{carry_pct:.0%}")

    parking_label, parking_pct = PRICING["PARKING"].get(parking, PRICING["PARKING"]["driveway"])
    if parking_pct:
        pct += parking_pct
        reasons.append(f"{parking_label.lower()} {parking_pct:+.0%}")

    return pct, reasons


def calculate_estimate(
    square_footage,
    pound_estimate=None,
    crew_size=None,
    packing="none",
    origin_stairs=0,
    origin_elevator=False,
    origin_long_carry_ft=0,
    origin_parking="driveway",
    dest_stairs=0,
    dest_elevator=False,
    dest_long_carry_ft=0,
    dest_parking="driveway",
    drive_minutes=0,
    assembly_items=0,
    special_items=None,
):
    """Price a move. Returns a JSON-serialisable breakdown dict, plus
    Decimal `price` and float `billable_hours` keys for saving."""
    special_items = special_items or {}

    # 1. Weight
    if pound_estimate:
        weight = int(pound_estimate)
        weight_source = "entered"
    else:
        weight = int(round((square_footage or 0) * PRICING["LBS_PER_SQFT"]))
        weight_source = f"{square_footage} sq ft x {PRICING['LBS_PER_SQFT']} lbs/sq ft"

    # 2. Crew
    if crew_size:
        crew = int(crew_size)
        crew_source = "entered"
    else:
        crew = recommended_crew(weight)
        crew_source = "recommended for weight"

    # 3. Hours
    hours = []  # list of {label, hours, detail}

    origin_pct, origin_reasons = access_factor(
        origin_stairs, origin_elevator, origin_long_carry_ft, origin_parking
    )
    base_load = weight / PRICING["LBS_PER_MOVER_HOUR_LOAD"] / crew
    load = base_load * max(0.0, 1 + origin_pct)
    hours.append({
        "label": "Loading",
        "hours": _round_hours(load),
        "detail": ", ".join(origin_reasons) or "standard access",
    })

    dest_pct, dest_reasons = access_factor(
        dest_stairs, dest_elevator, dest_long_carry_ft, dest_parking
    )
    base_unload = weight / PRICING["LBS_PER_MOVER_HOUR_UNLOAD"] / crew
    unload = base_unload * max(0.0, 1 + dest_pct)
    hours.append({
        "label": "Unloading",
        "hours": _round_hours(unload),
        "detail": ", ".join(dest_reasons) or "standard access",
    })

    packing_label, packing_hrs_per_k, packing_materials_per_k = PRICING["PACKING"].get(
        packing, PRICING["PACKING"]["none"]
    )
    packing_hours = (weight / 1000) * packing_hrs_per_k / crew
    if packing_hours:
        hours.append({"label": "Packing", "hours": _round_hours(packing_hours), "detail": packing_label})

    assembly_hours = (assembly_items or 0) * PRICING["ASSEMBLY_MINUTES_PER_ITEM"] / 60 / crew
    if assembly_hours:
        hours.append({
            "label": "Disassembly / reassembly",
            "hours": _round_hours(assembly_hours),
            "detail": f"{assembly_items} item(s)",
        })

    special_minutes = 0
    special_fee_total = Decimal("0")
    special_lines = []
    for key, count in special_items.items():
        if key not in PRICING["SPECIAL_ITEMS"] or not count:
            continue
        label, minutes, fee = PRICING["SPECIAL_ITEMS"][key]
        special_minutes += minutes * count
        special_fee_total += fee * count
        special_lines.append({"label": f"{label} x{count}", "amount": float(_money(fee * count))})
    if special_minutes:
        hours.append({
            "label": "Special items",
            "hours": _round_hours(special_minutes / 60),
            "detail": ", ".join(line["label"] for line in special_lines),
        })

    drive_hours = (drive_minutes or 0) / 60
    if drive_hours:
        hours.append({"label": "Drive between locations", "hours": _round_hours(drive_hours), "detail": f"{drive_minutes} min"})

    if PRICING["SHOP_TRAVEL_HOURS"]:
        hours.append({"label": "Shop travel time", "hours": _round_hours(PRICING["SHOP_TRAVEL_HOURS"]), "detail": "to and from the job"})

    total_hours = load + unload + packing_hours + assembly_hours + special_minutes / 60 + drive_hours + PRICING["SHOP_TRAVEL_HOURS"]

    # 4. Billable hours
    increment = PRICING["BILLING_INCREMENT_HOURS"]
    billable = math.ceil(round(total_hours / increment, 6)) * increment
    minimum_applied = billable < PRICING["MINIMUM_HOURS"]
    billable = max(billable, PRICING["MINIMUM_HOURS"])

    # 5. Price
    hourly_rate = PRICING["HOURLY_RATE_PER_MOVER"] * crew + PRICING["TRUCK_HOURLY_RATE"]
    labor = _money(hourly_rate * Decimal(str(billable)))
    materials = _money(packing_materials_per_k * Decimal(weight) / 1000)

    costs = [{
        "label": f"Labor: {billable:g} hrs x ${hourly_rate:,.2f}/hr ({crew} movers + truck)",
        "amount": float(labor),
    }]
    if PRICING["TRIP_FEE"]:
        costs.append({"label": "Trip fee", "amount": float(_money(PRICING["TRIP_FEE"]))})
    if materials:
        costs.append({"label": "Packing materials", "amount": float(materials)})
    costs.extend(special_lines)

    total = _money(labor + PRICING["TRIP_FEE"] + materials + special_fee_total)
    range_pct = Decimal(str(PRICING["ESTIMATE_RANGE_PCT"]))

    return {
        "weight": weight,
        "weight_source": weight_source,
        "crew": crew,
        "crew_source": crew_source,
        "hours": hours,
        "total_hours": _round_hours(total_hours),
        "billable_hours": billable,
        "minimum_applied": minimum_applied,
        "hourly_rate": float(_money(hourly_rate)),
        "costs": costs,
        "total": float(total),
        "low": float(_money(total * (1 - range_pct))),
        "high": float(_money(total * (1 + range_pct))),
        "price": total,  # Decimal, removed before storing as JSON
    }
