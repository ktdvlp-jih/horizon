package com.horizon.weather.crawler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.weather.dto.AsosObservation;
import com.horizon.weather.dto.DaySolar;
import com.horizon.weather.dto.LiveEarthquakeAlert;
import com.horizon.weather.dto.LiveTyphoon;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses KMA weather API responses: ASOS Open API JSON ({@code getWthrDataList}) and
 * legacy API Hub text endpoints (kept for reference / tests).
 */
@Slf4j
public final class KmaResponseParser {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final double MISSING = -9.0;

    private KmaResponseParser() {
    }

    /**
     * Parses ASOS hourly JSON from 공공데이터포털 {@code getWthrDataList}.
     * Reads {@code ta} (°C) and {@code icsr} (MJ/m²) from each item; skips missing values.
     */
    public static List<AsosObservation> parseAsosHourlyJson(String body) {
        if (body == null || body.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = MAPPER.readTree(body);
            JsonNode header = root.path("response").path("header");
            String resultCode = header.path("resultCode").asText("");
            if (!"00".equals(resultCode)) {
                log.debug("ASOS API non-success resultCode={} msg={}",
                        resultCode, header.path("resultMsg").asText(""));
                return List.of();
            }

            JsonNode items = root.path("response").path("body").path("items").path("item");
            if (items.isMissingNode() || items.isNull()) {
                return List.of();
            }

            List<AsosObservation> rows = new ArrayList<>();
            if (items.isArray()) {
                items.forEach(node -> parseAsosItem(node).ifPresent(rows::add));
            } else {
                parseAsosItem(items).ifPresent(rows::add);
            }
            return rows;
        } catch (Exception ex) {
            log.warn("ASOS JSON parse failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private static Optional<AsosObservation> parseAsosItem(JsonNode node) {
        Optional<Double> ta = parseNumericField(node, "ta");
        if (ta.isEmpty()) {
            return Optional.empty();
        }
        int hour = parseHour(node);
        double icsr = parseNumericField(node, "icsr").orElse(0.0);
        return Optional.of(new AsosObservation(hour, ta.get(), icsr));
    }

    private static int parseHour(JsonNode node) {
        String tm = node.path("tm").asText("");
        if (tm.length() >= 10) {
            try {
                return Integer.parseInt(tm.substring(8, 10));
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }
        String hh = node.path("hh").asText("");
        if (!hh.isBlank()) {
            try {
                return Integer.parseInt(hh);
            } catch (NumberFormatException ignored) {
                // fall through
            }
        }
        return 0;
    }

    private static Optional<Double> parseNumericField(JsonNode node, String field) {
        JsonNode raw = node.get(field);
        if (raw == null || raw.isNull()) {
            return Optional.empty();
        }
        String text = raw.asText("").trim();
        if (text.isEmpty()) {
            return Optional.empty();
        }
        try {
            double value = Double.parseDouble(text);
            if (value <= MISSING + 0.01) {
                return Optional.empty();
            }
            return Optional.of(value);
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }

    /**
     * Parses air temperature (TA) from an ASOS {@code kma_sfctm2} single-time row (legacy API Hub).
     */
    public static Optional<Double> parseAirTemperature(String body) {
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
                    if (ta > MISSING + 0.01) {
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
     * Parses the solar package ({@code nph-sun_sfc_sts_pkg}) CSV body (legacy API Hub).
     */
    public static DaySolar parseDaySolar(String body) {
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
            double siDay = parsePositive(cols.length > 4 ? cols[4] : null);
            if (siDay > dayTotal) {
                dayTotal = siDay;
            }
            int hour = Integer.parseInt(ts.substring(8, 10));
            double siHr = parsePositive(cols.length > 3 ? cols[3] : null);
            if (siHr >= 0) {
                hourly.put(hour, siHr);
            }
        }
        return new DaySolar(hourly, dayTotal);
    }

    /** Parses hourly precipitation (mm) from {@code kma_sfctm2} / {@code kma_sfctm3} row (RN column). */
    public static Optional<Double> parsePrecipitationMm(String body) {
        if (body == null || body.isBlank()) {
            return Optional.empty();
        }
        for (String line : body.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            String[] cols = trimmed.split("\\s+");
            if (cols.length > 15) {
                return parsePositiveOptional(cols[15]);
            }
        }
        return Optional.empty();
    }

    /** Parses PM10 hourly average from {@code dst_pm10_hr.php}. */
    public static Optional<Double> parsePm10Hourly(String body) {
        if (body == null || body.isBlank()) {
            return Optional.empty();
        }
        Pattern row = Pattern.compile(
                "\\d{4}\\.\\d{2}\\.\\d{2}\\.\\d{2}:\\d{2}\\s+\\S+\\s+\\d+\\s+(\\d+(?:\\.\\d+)?)");
        for (String line : body.split("\\R")) {
            if (line.isBlank() || line.startsWith("#")) {
                continue;
            }
            Matcher m = row.matcher(line.trim());
            if (m.find()) {
                return Optional.of(Double.parseDouble(m.group(1)));
            }
        }
        return Optional.empty();
    }

    /** Parses monthly normal mean temperature from {@code sun_sfc_norm.php} CSV row. */
    public static Optional<Double> parseSunSfcNormalTemp(String body) {
        if (body == null || body.isBlank()) {
            return Optional.empty();
        }
        for (String line : body.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            String[] cols = trimmed.split("\\s*,\\s*");
            if (cols.length >= 4) {
                return parsePositiveOptional(cols[3]);
            }
        }
        return Optional.empty();
    }

    public static List<LiveTyphoon> parseTyphoonList(String body, int year) {
        List<LiveTyphoon> rows = new ArrayList<>();
        if (body == null) {
            return rows;
        }
        for (String line : body.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            String[] cols = trimmed.split("\\s+");
            if (cols.length < 6) {
                continue;
            }
            try {
                int y = Integer.parseInt(cols[0]);
                if (y != year) {
                    continue;
                }
                int seq = Integer.parseInt(cols[1]);
                String start = cols[4];
                String end = cols.length > 5 ? cols[5] : "";
                String nameKo = cols.length > 6 ? cols[6] : "";
                String nameEn = cols.length > 7 ? cols[7] : "";
                rows.add(new LiveTyphoon(y, seq, nameKo, nameEn, start, end));
            } catch (NumberFormatException ignored) {
                // skip malformed
            }
        }
        return rows;
    }

    public static List<LiveEarthquakeAlert> parseEqkNow(String body) {
        List<LiveEarthquakeAlert> rows = new ArrayList<>();
        if (body == null) {
            return rows;
        }
        for (String line : body.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            String[] cols = trimmed.split("\\s+");
            if (cols.length < 7) {
                continue;
            }
            try {
                int type = Integer.parseInt(cols[0]);
                if (type != 2 && type != 3) {
                    continue;
                }
                String issued = cols[1];
                double magnitude = Double.parseDouble(cols[4]);
                double lat = Double.parseDouble(cols[5]);
                double lon = Double.parseDouble(cols[6]);
                String location = cols.length > 7 ? cols[7] : "";
                rows.add(new LiveEarthquakeAlert(type, issued, magnitude, lat, lon, location));
            } catch (NumberFormatException ignored) {
                // skip
            }
        }
        return rows;
    }

    public static Optional<Integer> parseLivingIndexH0(String json, String field) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode root = MAPPER.readTree(json);
            String code = root.path("response").path("header").path("resultCode").asText("");
            if (!"00".equals(code)) {
                return Optional.empty();
            }
            JsonNode item = root.path("response").path("body").path("items").path("item");
            if (item.isArray() && !item.isEmpty()) {
                item = item.get(0);
            }
            if (item.isMissingNode() || item.isNull()) {
                return Optional.empty();
            }
            String raw = item.path(field).asText(item.path("h0").asText(""));
            if (raw.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(Integer.parseInt(raw.trim()));
        } catch (Exception ex) {
            log.debug("Living weather JSON parse failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public static Optional<Double> parseSenTaValue(String json) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode root = MAPPER.readTree(json);
            if (!"00".equals(root.path("response").path("header").path("resultCode").asText(""))) {
                return Optional.empty();
            }
            JsonNode item = root.path("response").path("body").path("items").path("item");
            if (item.isArray() && !item.isEmpty()) {
                item = item.get(0);
            }
            for (String key : List.of("h0", "h3", "h6", "h9", "h12")) {
                String raw = item.path(key).asText("");
                if (!raw.isBlank()) {
                    double v = Double.parseDouble(raw.trim());
                    if (v > -90) {
                        return Optional.of(v);
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("SenTa parse failed: {}", ex.getMessage());
        }
        return Optional.empty();
    }

    private static Optional<Double> parsePositiveOptional(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        double v = parseDouble(raw);
        if (v <= MISSING + 0.01) {
            return Optional.empty();
        }
        return Optional.of(v);
    }

    private static double parsePositive(String raw) {
        double v = parseDouble(raw);
        return v <= MISSING + 0.01 ? -1.0 : v;
    }

    private static double parseDouble(String raw) {
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException ex) {
            return -1.0;
        }
    }
}
