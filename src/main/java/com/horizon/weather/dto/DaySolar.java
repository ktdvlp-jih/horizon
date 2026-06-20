package com.horizon.weather.dto;

import java.util.Map;

/**
 * Parsed result of the KMA solar package (nph-sun_sfc_sts_pkg) for one day.
 *
 * @param hourlySi  hour-of-day -> hourly insolation SI_HR (MJ/m^2) at HH:00 rows
 * @param dayTotal  daily cumulative insolation SI_DAY (MJ/m^2), -1 when unknown
 */
public record DaySolar(
        Map<Integer, Double> hourlySi,
        double dayTotal
) {
    public boolean isEmpty() {
        return hourlySi.isEmpty() && dayTotal < 0;
    }
}
