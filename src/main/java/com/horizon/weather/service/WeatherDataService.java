package com.horizon.weather.service;

import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.settings.entity.RegionConfig;
import com.horizon.settings.repository.RegionConfigRepository;
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

@Slf4j
@Service
public class WeatherDataService {

    private static final int[] TIMELINE_HOURS = {6, 8, 10, 12, 14, 16, 18, 20};
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter HOUR_TM = DateTimeFormatter.ofPattern("yyyyMMddHH'00'");
    private static final long BASELINE_TTL_MS = 10 * 60 * 1000L;
    private static final double SOLAR_DAY_REF = 27.0;
    private static final double SOLAR_HOUR_REF = 3.0;

    private final KmaWeatherClient kmaWeatherClient;
    private final RegionConfigRepository regionConfigRepository;
    private final Map<String, CachedRegion> baselineCache = new ConcurrentHashMap<>();
    private final Map<String, List<HourlyObservation>> timelineCache = new ConcurrentHashMap<>();

    private record CachedRegion(RegionWeather region, long expiresAt) {
    }

    public WeatherDataService(KmaWeatherClient kmaWeatherClient, RegionConfigRepository regionConfigRepository) {
        this.kmaWeatherClient = kmaWeatherClient;
        this.regionConfigRepository = regionConfigRepository;
    }

    public List<RegionWeather> listRegions() {
        return regionConfigRepository.findByEnabledTrueOrderBySortOrderAsc().stream()
                .map(this::resolve)
                .toList();
    }

    public RegionWeather getRegion(String code) {
        return regionConfigRepository.findById(code)
                .filter(RegionConfig::isEnabled)
                .map(this::resolve)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "알 수 없는 지역: " + code));
    }

    public Optional<List<HourlyObservation>> getHourlySeries(String code, LocalDate day) {
        RegionConfig seed = regionConfigRepository.findById(code)
                .filter(RegionConfig::isEnabled)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "알 수 없는 지역: " + code));

        if (!kmaWeatherClient.isConfigured()) {
            return Optional.empty();
        }

        LocalDate target = day != null ? day : LocalDate.now(KST).minusDays(1);
        String date = target.format(DATE);
        String cacheKey = seed.getCode() + ":" + date;
        List<HourlyObservation> cached = timelineCache.get(cacheKey);
        if (cached != null) {
            return cached.isEmpty() ? Optional.empty() : Optional.of(cached);
        }

        List<HourlyObservation> series = buildSeries(seed, date);
        timelineCache.put(cacheKey, series);
        return series.isEmpty() ? Optional.empty() : Optional.of(series);
    }

    public void invalidateCache() {
        baselineCache.clear();
        timelineCache.clear();
        log.info("Weather baseline/timeline cache cleared");
    }

    private List<HourlyObservation> buildSeries(RegionConfig seed, String date) {
        Map<Integer, Double> temps = new ConcurrentHashMap<>();
        Map<Integer, Double> solars = new ConcurrentHashMap<>();
        java.util.Arrays.stream(TIMELINE_HOURS).parallel().forEach(hour -> {
            String tm = String.format("%s%02d00", date, hour);
            kmaWeatherClient.fetchAirTemperature(seed.getKmaStation(), tm)
                    .ifPresent(ta -> temps.put(hour, ta));
            kmaWeatherClient.fetchSolar(seed.getKmaStation(), tm)
                    .map(s -> s.hourlySi().get(hour))
                    .ifPresent(si -> solars.put(hour, si));
        });

        for (int hour : TIMELINE_HOURS) {
            if (!temps.containsKey(hour)) {
                log.info("Hourly series incomplete for {} {} (missing {}h); using modeled timeline.",
                        seed.getCode(), date, hour);
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
        log.info("Built observed hourly series for {} {} ({} frames).", seed.getCode(), date, series.size());
        return series;
    }

    private RegionWeather resolve(RegionConfig seed) {
        if (!kmaWeatherClient.isConfigured()) {
            return sample(seed);
        }
        CachedRegion cached = baselineCache.get(seed.getCode());
        if (cached != null && cached.expiresAt() > System.currentTimeMillis()) {
            return cached.region();
        }

        RegionWeather resolved = fetchBaseline(seed);
        baselineCache.put(seed.getCode(), new CachedRegion(resolved, System.currentTimeMillis() + BASELINE_TTL_MS));
        return resolved;
    }

    private RegionWeather fetchBaseline(RegionConfig seed) {
        LocalDateTime base = LocalDateTime.now(KST).withMinute(0).withSecond(0).withNano(0);
        Optional<Double> ta = Optional.empty();
        for (int back = 1; back <= 4 && ta.isEmpty(); back++) {
            ta = kmaWeatherClient.fetchAirTemperature(seed.getKmaStation(), base.minusHours(back).format(HOUR_TM));
        }
        if (ta.isEmpty()) {
            return sample(seed);
        }

        double solarLoad = seed.getSampleSolar();
        String yesterdayNoon = LocalDate.now(KST).minusDays(1).format(DATE) + "1200";
        Optional<DaySolar> solar = kmaWeatherClient.fetchSolar(seed.getKmaStation(), yesterdayNoon);
        if (solar.isPresent() && solar.get().dayTotal() >= 0) {
            solarLoad = round(clamp(solar.get().dayTotal() / SOLAR_DAY_REF, 0.3, 1.1));
        }
        return new RegionWeather(seed.getCode(), seed.getName(), round(ta.get()), solarLoad, "kma");
    }

    private RegionWeather sample(RegionConfig seed) {
        return new RegionWeather(seed.getCode(), seed.getName(), seed.getSampleTemp(), seed.getSampleSolar(), "sample");
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
