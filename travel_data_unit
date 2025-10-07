"""
travel_data_helper.py
Utility module for Nexus Evo Traveller project.
Provides functions for travel calculations, destination formatting, and trip summaries.
"""

import random
import datetime
from typing import List, Dict

# ----------------------------
# Destination Utilities
# ----------------------------

def format_destination(city: str, country: str) -> str:
    """Return a properly formatted destination name."""
    return f"{city.strip().title()}, {country.strip().upper()}"

def random_destination(destinations: List[Dict[str, str]]) -> Dict[str, str]:
    """Return a random destination from a list of dictionaries."""
    return random.choice(destinations)

# ----------------------------
# Travel Calculations
# ----------------------------

def calculate_travel_distance(speed_kmph: float, hours: float) -> float:
    """Return the distance traveled given speed and hours."""
    return round(speed_kmph * hours, 2)

def calculate_eta(start_time: datetime.datetime, distance_km: float, speed_kmph: float) -> datetime.datetime:
    """Estimate arrival time given start time, distance, and speed."""
    hours_needed = distance_km / speed_kmph
    return start_time + datetime.timedelta(hours=hours_needed)

def total_trip_time(distances: List[float], speeds: List[float]) -> float:
    """Calculate total trip time given lists of distances and speeds."""
    total_hours = 0.0
    for d, s in zip(distances, speeds):
        total_hours += d / s
    return round(total_hours, 2)

# ----------------------------
# Trip Summary
# ----------------------------

def generate_trip_summary(destination: str, distance_km: float, speed_kmph: float) -> str:
    """Generate a textual summary of the trip."""
    time_hours = distance_km / speed_kmph
    return f"Trip to {destination}: {distance_km} km at {speed_kmph} km/h (~{round(time_hours,2)} hours)."

def bulk_trip_summary(trips: List[Dict[str, float]]) -> List[str]:
    """Generate summaries for multiple trips."""
    summaries = []
    for trip in trips:
        summaries.append(
            generate_trip_summary(trip['destination'], trip['distance_km'], trip['speed_kmph'])
        )
    return summaries

# ----------------------------
# Data Validation
# ----------------------------

def validate_trip_data(trip: Dict[str, float]) -> bool:
    """Check if the trip dictionary has valid values."""
    required_keys = ['destination', 'distance_km', 'speed_kmph']
    for key in required_keys:
        if key not in trip:
            return False
        if isinstance(trip[key], (int, float)) and trip[key] <= 0:
            return False
        if key == 'destination' and not isinstance(trip[key], str):
            return False
    return True

def filter_valid_trips(trips: List[Dict[str, float]]) -> List[Dict[str, float]]:
    """Return only valid trips from a list."""
    return [trip for trip in trips if validate_trip_data(trip)]

# ----------------------------
# Random Test Data Generator
# ----------------------------

def generate_random_trips(n: int) -> List[Dict[str, float]]:
    """Generate n random trips for testing."""
    cities = ["Paris", "Tokyo", "New York", "Berlin", "Barcelona", "Sydney"]
    countries = ["France", "Japan", "USA", "Germany", "Spain", "Australia"]
    trips = []
    for _ in range(n):
        city = random.choice(cities)
        country = random.choice(countries)
        trips.append({
            'destination': format_destination(city, country),
            'distance_km': random.randint(50, 2000),
            'speed_kmph': random.randint(40, 120)
        })
    return trips

# ----------------------------
# Example Run (for testing)
# ----------------------------

if __name__ == "__main__":
    print("Generating 5 random trips...")
    trips = generate_random_trips(5)
    for summary in bulk_trip_summary(trips):
        print(summary)
