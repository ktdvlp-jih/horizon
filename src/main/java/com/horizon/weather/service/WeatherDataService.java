package com.horizon.weather.service;

import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.weather.crawler.KmaWeatherClient;
import com.horizon.weather.dto.DaySolar;
import com.horizon.weather.dto.HourlyObservation;
import com.horizon.weather.dto.RegionWeather;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Provides per-region baseline weather and observed day-cycle series.
 *
 * <p>Uses live KMA (API허브) data when an API key is configured, otherwise serves
 * built-in summer sample values so the experience always works. Live results are
 * cached to avoid hammering the API on every (debounced) simulation request.</p>
 */
@Slf4j
@Service
public class WeatherDataService {

    private record RegionSeed(String code, String name, String kmaStation, double sampleTemp, double sampleSolar) {
    }

    private static final List<RegionSeed> REGIONS = List.of(
            new RegionSeed("seoul", "서울", "108", 33.5, 0.86),
            new RegionSeed("busan", "부산", "159", 30.8, 0.80),
            new RegionSeed("daegu", "대구", "143", 35.2, 0.90),
            new RegionSeed("incheon", "인천", "112", 31.9, 0.78),
            new RegionSeed("gwangju", "광주", "156", 33.1, 0.84),
            new RegionSeed("daejeon", "대전", "133", 33.8, 0.85),
            new RegionSeed("jeju", "제주", "184", 31.0, 0.74)
    );

    /** Daytime hours sampled for the animation timeline. */
    private static final int[] TIMELINE_HOURS = {6, 8, 10, 12, 14, 16, 18, 20};
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter HOUR_TM = DateTimeFormatter.ofPattern("yyyyMMddHH'00'");
    private static final long BASELINE_TTL_MS = 10 * 60 * 1000L;
    /** Reference insolation for normalizing daily/hourly SI into a 0..1-ish solar load. */
    private static final double SOLAR_DAY_REF = 27.0;
    private static final double SOLAR_HOUR_REF = 3.0;

    private final KmaWeatherClient kmaWeatherClient;
    private final Map<String, CachedRegion> baselineCache = new ConcurrentHashMap<>();
    private final Map<String, List<HourlyObservation>> timelineCache = new ConcurrentHashMap<>();

    private record CachedRegion(RegionWeather region, long expiresAt) {
    }

    public WeatherDataService(KmaWeatherClient kmaWeatherClient) {
        this.kmaWeatherClient = kmaWeatherClient;
    }

    public List<RegionWeather> listRegions() {
        return REGIONS.stream().map(this::resolve).toList();
    }

    public RegionWeather getRegion(String code) {
        return REGIONS.stream()
                .filter(r -> r.code().equals(code))
                .findFirst()
                .map(this::resolve)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "알 수 없는 지역: " + code));
    }

    /**
     * Returns the previous day's observed hourly series for the animation when
     * live data is available, otherwise empty (caller uses the synthetic model).
     */
    public Optional<List<HourlyObservation>> getHourlySeries(String code, LocalDate day) {
        RegionSeed seed = REGIONS.stream()
                .filter(r -> r.code().equals(code))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "알 수 없는 지역: " + code));

        if (!kmaWeatherClient.isConfigured()) {
            return Optional.empty();
        }

        LocalDate target = day != null ? day : LocalDate.now(KST).minusDays(1);
        String date = target.format(DATE);
        String cacheKey = seed.code() + ":" + date;
        List<HourlyObservation> cached = timelineCache.get(cacheKey);
        if (cached != null) {
            return cached.isEmpty() ? Optional.empty() : Optional.of(cached);
        }

        List<HourlyObservation> series = buildSeries(seed, date);
        timelineCache.put(cacheKey, series);
        return series.isEmpty() ? Optional.empty() : Optional.of(series);
    }

    private List<HourlyObservation> buildSeries(RegionSeed seed, String date) {
        Map<Integer, Double> temps = new ConcurrentHashMap<>();
        Map<Integer, Double> solars = new ConcurrentHashMap<>();
        // Fetch each sampled hour individually (temp + solar). Per-hour solar is
        // required because a full-day solar query is truncated by the API.
        java.util.Arrays.stream(TIMELINE_HOURS).parallel().forEach(hour -> {
            String tm = String.format("%s%02d00", date, hour);
            kmaWeatherClient.fetchAirTemperature(seed.kmaStation(), tm)
                    .ifPresent(ta -> temps.put(hour, ta));
            kmaWeatherClient.fetchSolar(seed.kmaStation(), tm)
                    .map(s -> s.hourlySi().get(hour))
                    .ifPresent(si -> solars.put(hour, si));
        });

        // Require every sampled hour's temperature; otherwise fall back to the model.
        for (int hour : TIMELINE_HOURS) {
            if (!temps.containsKey(hour)) {
                log.info("Hourly series incomplete for {} {} (missing {}h); using modeled timeline.",
                        seed.code(), date, hour);
                return List.of();
            }
        }

        List<HourlyObservation> series = new java.util.ArrayList<>(TIMELINE_HOURS.length);
        for (int hour : TIMELINE_HOURS) {
            double ta = round(temps.get(hour));
            double siHr = solars.getOrDefault(hour, 0.0);
            double solarLoad = clamp(siHr / SOLAR_HOUR_REF, 0.0, 1.3);
            series.add(new HourlyObservation(hour, ta, round(siHr), round(solarLoad)));
        }
        log.info("Built observed hourly series for {} {} ({} frames).", seed.code(), date, series.size());
        return series;
    }

    private RegionWeather resolve(RegionSeed seed) {
        if (!kmaWeatherClient.isConfigured()) {
            return sample(seed);
        }
        CachedRegion cached = baselineCache.get(seed.code());
        if (cached != null && cached.expiresAt() > System.currentTimeMillis()) {
            return cached.region();
        }

        RegionWeather resolved = fetchBaseline(seed);
        baselineCache.put(seed.code(), new CachedRegion(resolved, System.currentTimeMillis() + BASELINE_TTL_MS));
        return resolved;
    }

    private RegionWeather fetchBaseline(RegionSeed seed) {
        LocalDateTime base = LocalDateTime.now(KST).withMinute(0).withSecond(0).withNano(0);
        Optional<Double> ta = Optional.empty();
        for (int back = 1; back <= 4 && ta.isEmpty(); back++) {
            ta = kmaWeatherClient.fetchAirTemperature(seed.kmaStation(), base.minusHours(back).format(HOUR_TM));
        }
        if (ta.isEmpty()) {
            return sample(seed);
        }

        // Use the previous (complete) day's total insolation for a stable,
        // daytime-representative solar load even when queried at night.
        double solarLoad = seed.sampleSolar();
        String yesterdayNoon = LocalDate.now(KST).minusDays(1).format(DATE) + "1200";
        Optional<DaySolar> solar = kmaWeatherClient.fetchSolar(seed.kmaStation(), yesterdayNoon);
        if (solar.isPresent() && solar.get().dayTotal() >= 0) {
            solarLoad = round(clamp(solar.get().dayTotal() / SOLAR_DAY_REF, 0.3, 1.1));
        }
        return new RegionWeather(seed.code(), seed.name(), round(ta.get()), solarLoad, "kma");
    }

    private RegionWeather sample(RegionSeed seed) {
        return new RegionWeather(seed.code(), seed.name(), seed.sampleTemp(), seed.sampleSolar(), "sample");
    }

    private double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    public Map<String, String> sourceInfo() {
        return Map.of("kmaConfigured", String.valueOf(kmaWeatherClient.isConfigured()));
    }
}
