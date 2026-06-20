package com.horizon.weather.crawler;

import com.horizon.weather.dto.DaySolar;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Parses the fixed-width / CSV-ish text returned by KMA API Hub text endpoints.
 * Isolated for testability; tolerant of unexpected formats and missing values.
 */
final class KmaResponseParser {

    private KmaResponseParser() {
    }

    /**
     * Parses air temperature (TA) from an ASOS {@code kma_sfctm2} single-time row.
     * TA is the 12th column (0-based index 11) and sits before any free-text
     * column, so whitespace splitting is safe for it.
     */
    static Optional<Double> parseAirTemperature(String body) {
        if (body == null || body.isBlank()) {
            return Optional.empty();
        }
        for (String line : body.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            String[] cols = trimmed.split("\\s*,\\s*|\\s+");
            if (cols.length > 11) {
                try {
                    double ta = Double.parseDouble(cols[11]);
                    if (ta > -90.0) {
                        return Optional.of(ta);
                    }
                } catch (NumberFormatException ignored) {
                    // try next line
                }
            }
        }
        return Optional.empty();
    }

    /**
     * Parses the solar package ({@code nph-sun_sfc_sts_pkg}) CSV body.
     *
     * <p>Each minute row is {@code YYYYMMDDHHMI,STN,SI_MI,SI_HR,SI_DAY,...}.
     * We keep SI_HR for rows at minute "00" (hourly insolation) and track the
     * maximum SI_DAY (cumulative daily total).</p>
     */
    static DaySolar parseDaySolar(String body) {
        Map<Integer, Double> hourly = new HashMap<>();
        double dayTotal = -1.0;
        if (body == null || body.isBlank()) {
            return new DaySolar(hourly, dayTotal);
        }
        for (String line : body.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            String[] cols = trimmed.split("\\s*,\\s*");
            if (cols.length < 5) {
                continue;
            }
            String ts = cols[0].trim();
            if (ts.length() < 12 || !ts.chars().limit(12).allMatch(Character::isDigit)) {
                continue;
            }
            double siDay = parseDouble(cols[4]);
            if (siDay >= 0 && siDay > dayTotal) {
                dayTotal = siDay;
            }
            if ("00".equals(ts.substring(10, 12))) {
                int hour = Integer.parseInt(ts.substring(8, 10));
                double siHr = parseDouble(cols[3]);
                if (siHr >= 0) {
                    hourly.put(hour, siHr);
                }
            }
        }
        return new DaySolar(hourly, dayTotal);
    }

    private static double parseDouble(String raw) {
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException ex) {
            return -1.0;
        }
    }
}
