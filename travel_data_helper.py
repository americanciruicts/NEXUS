# utils/travel_data_helper.py

"""
Utility functions for processing travel data in the Nexus Evo Traveller project.
These are placeholder functions for demonstration purposes.
"""

def calculate_travel_distance(speed_kmph: float, time_hours: float) -> float:
    """Calculate total travel distance."""
    return round(speed_kmph * time_hours, 2)


def format_destination_name(city: str, country: str) -> str:
    """Format destination names consistently."""
    return f"{city.strip().title()}, {country.strip().upper()}"


def get_trip_summary(destination: str, distance_km: float) -> str:
    """Return a short trip summary message."""
    return f"Trip to {destination}: {distance_km} km covered successfully!"
    

if __name__ == "__main__":
    # Example usage for testing
    dest = format_destination_name("barcelona", "spain")
    dist = calculate_travel_distance(90, 4.5)
    print(get_trip_summary(dest, dist))

