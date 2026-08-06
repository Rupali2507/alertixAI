"""
IP -> geolocation -> "impossible travel" signal.

Resolves ip_address to (lat, lon, country) and compares against the
user's last known login location + timestamp. If the implied speed
between the two logins exceeds what's physically plausible (commercial
flight speed, with buffer), that's a strong account-takeover signal —
much stronger than "new IP" alone, which fires constantly for mobile
users on carrier NAT.

Geolocation itself is pluggable: `resolve_ip` below is a thin interface
so you can swap in MaxMind GeoLite2 (offline mmdb, fastest + no per-request
cost), ipapi.co / ipinfo.io (hosted, good default for a hackathon demo),
or your cloud provider's IP intelligence service. Swap the implementation,
not the call sites.
"""

from __future__ import annotations
import math
from datetime import datetime
from dataclasses import dataclass

# Generous upper bound for "a human plausibly traveled this fast"
# (commercial flight ~900 km/h; buffer to ~1000 km/h to absorb
# geolocation database imprecision).
MAX_PLAUSIBLE_KMH = 1000.0

# Below this distance, don't even bother with the velocity check — two
# points that are this close are within normal GeoIP jitter for the same
# city/ISP and would produce noisy "impossible travel" false positives.
MIN_DISTANCE_KM_FOR_CHECK = 100.0


@dataclass
class GeoPoint:
    lat: float
    lon: float
    country: str | None
    city: str | None = None


def resolve_ip(ip_address: str) -> GeoPoint | None:
    """
    Resolve an IP to a GeoPoint. Swap this implementation for a real
    provider (MaxMind GeoLite2 City .mmdb via `geoip2`, or a hosted API).
    Returns None for unresolvable/private/reserved IPs — callers must
    treat that as "unknown", not "safe".

    Example MaxMind swap:
        import geoip2.database
        _reader = geoip2.database.Reader("GeoLite2-City.mmdb")
        def resolve_ip(ip_address):
            try:
                r = _reader.city(ip_address)
                return GeoPoint(r.location.latitude, r.location.longitude,
                                 r.country.iso_code, r.city.name)
            except Exception:
                return None
    """
    raise NotImplementedError(
        "Wire resolve_ip() to MaxMind GeoLite2 / your IP intelligence provider "
        "before enabling geo_velocity in production."
    )


def _haversine_km(a: GeoPoint, b: GeoPoint) -> float:
    r = 6371.0  # Earth radius, km
    lat1, lon1, lat2, lon2 = map(math.radians, [a.lat, a.lon, b.lat, b.lon])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


class LoginLocationHistory:
    """Per-user last-known login location, for the impossible-travel check."""

    def __init__(self):
        self._last: dict[str, tuple[GeoPoint, datetime]] = {}

    def observe(self, user_id: str, point: GeoPoint, ts: datetime) -> None:
        self._last[user_id] = (point, ts)

    def last(self, user_id: str) -> tuple[GeoPoint, datetime] | None:
        return self._last.get(user_id)


def score_geo_velocity(
    user_id: str,
    ip_address: str | None,
    ts: datetime,
    history: LoginLocationHistory,
    geo_lookup=resolve_ip,
) -> tuple[float, list[str], GeoPoint | None]:
    """Returns (risk_contribution in [0,1], reason_codes, resolved_point)."""
    if not ip_address:
        return 0.0, [], None

    point = geo_lookup(ip_address)
    if point is None:
        return 0.0, [], None  # can't resolve -> don't penalize, but caller should note low confidence

    prev = history.last(user_id)
    if prev is None:
        return 0.0, [], point  # first observed login location for this user

    prev_point, prev_ts = prev
    hours = max((ts - prev_ts).total_seconds() / 3600.0, 1e-6)
    distance_km = _haversine_km(prev_point, point)

    reasons: list[str] = []
    risk = 0.0

    if point.country and prev_point.country and point.country != prev_point.country:
        risk += 0.15
        reasons.append("new_country_login")

    if distance_km >= MIN_DISTANCE_KM_FOR_CHECK:
        implied_kmh = distance_km / hours
        if implied_kmh > MAX_PLAUSIBLE_KMH:
            risk += 0.55
            reasons.append("impossible_travel_velocity")

    return min(risk, 1.0), reasons, point
