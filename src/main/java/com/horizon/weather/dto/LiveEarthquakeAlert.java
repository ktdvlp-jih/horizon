package com.horizon.weather.dto;

/**
 * One row from KMA {@code eqk_now.php} (TP=2 지진통보, TP=3 지진해일통보).
 */
public record LiveEarthquakeAlert(
        int type,
        String issuedAt,
        double magnitude,
        double latitude,
        double longitude,
        String location
) {
    public boolean tsunami() {
        return type == 3;
    }
}
