package com.horizon.weather.service;

import com.horizon.disaster.crawler.KmaDisasterClient;
import com.horizon.weather.AsosStationIds;
import com.horizon.weather.KmaAreaCodes;
import com.horizon.weather.crawler.KmaClimateNormalsClient;
import com.horizon.weather.crawler.KmaLivingWeatherClient;
import com.horizon.weather.crawler.KmaPm10Client;
import com.horizon.weather.crawler.KmaWeatherClient;
import com.horizon.weather.dto.ClimateContext;
import com.horizon.weather.dto.LiveEarthquakeAlert;
import com.horizon.weather.dto.LiveTyphoon;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Aggregates live KMA feeds (PM10, 강수, 평년, 생활기상, 태풍·지진) per region.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClimateDataService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter TM12 = DateTimeFormatter.ofPattern("yyyyMMddHHmm");
    private static final DateTimeFormatter TM10 = DateTimeFormatter.ofPattern("yyyyMMddHH");
    private static final long TTL_MS = 10 * 60 * 1000L;

    private final KmaWeatherClient weatherClient;
    private final KmaPm10Client pm10Client;
    private final KmaClimateNormalsClient normalsClient;
    private final KmaLivingWeatherClient livingWeatherClient;
    private final KmaDisasterClient disasterClient;

    private final Map<String, CachedClimate> regionCache = new ConcurrentHashMap<>();
    private volatile CachedDisaster disasterCache;

    private record CachedClimate(ClimateContext context, long expiresAt) {
    }

    private record CachedDisaster(List<LiveTyphoon> typhoons, List<LiveEarthquakeAlert> alerts, long expiresAt) {
    }

    public ClimateContext resolve(String regionCode, String stationId) {
        String key = regionCode + ":" + stationId;
        CachedClimate hit = regionCache.get(key);
        if (hit != null && hit.expiresAt() > System.currentTimeMillis()) {
            return hit.context();
        }
        ClimateContext built = fetchRegionClimate(regionCode, stationId);
        regionCache.put(key, new CachedClimate(built, System.currentTimeMillis() + TTL_MS));
        return built;
    }

    public List<LiveTyphoon> typhoonsForYear(int year) {
        ensureDisasterCache();
        return disasterCache.typhoons().stream().filter(t -> t.year() == year).toList();
    }

    public List<LiveEarthquakeAlert> earthquakeAlerts() {
        ensureDisasterCache();
        return disasterCache.alerts();
    }

    public void invalidateCache() {
        regionCache.clear();
        disasterCache = null;
    }

    public boolean isDisasterApiConfigured() {
        return disasterClient.isConfigured();
    }

    private void ensureDisasterCache() {
        if (disasterCache != null && disasterCache.expiresAt() > System.currentTimeMillis()) {
            return;
        }
        int year = LocalDateTime.now(KST).getYear();
        List<LiveTyphoon> typhoons = disasterClient.isConfigured()
                ? disasterClient.fetchTyphoonList(year)
                : List.of();
        List<LiveEarthquakeAlert> alerts = disasterClient.isConfigured()
                ? disasterClient.fetchEarthquakeAlerts()
                : List.of();
        disasterCache = new CachedDisaster(typhoons, alerts, System.currentTimeMillis() + TTL_MS);
    }

    private ClimateContext fetchRegionClimate(String regionCode, String stationId) {
        LocalDateTime now = LocalDateTime.now(KST).withMinute(0).withSecond(0).withNano(0);
        String tm12 = now.format(TM12);
        String tm10 = now.format(TM10);
        String stn = stationId != null && !stationId.isBlank()
                ? stationId
                : AsosStationIds.forRegion(regionCode).orElse("108");
        Optional<String> areaNo = KmaAreaCodes.forRegion(regionCode);

        Double pm10 = null;
        String pm10Source = null;
        if (pm10Client.isConfigured()) {
            Optional<Double> live = pm10Client.fetchHourlyPm10(stn, tm12);
            if (live.isPresent()) {
                pm10 = live.get();
                pm10Source = "kma";
            }
        }

        Double rainfall = null;
        String rainfallSource = null;
        if (weatherClient.isConfigured()) {
            Optional<Double> rn = weatherClient.fetchPrecipitationMm(stn, tm12);
            if (rn.isPresent()) {
                rainfall = rn.get();
                rainfallSource = "kma";
            }
        }

        Double normalTemp = null;
        String normalSource = null;
        if (normalsClient.isConfigured()) {
            int month = now.getMonthValue();
            int day = Math.min(now.getDayOfMonth(), 28);
            Optional<Double> norm = normalsClient.fetchMonthlyNormalTemp(stn, month, day);
            if (norm.isPresent()) {
                normalTemp = norm.get();
                normalSource = "kma";
            }
        }

        Integer uv = null;
        String uvSource = null;
        Integer air = null;
        String airSource = null;
        Double senTa = null;
        String senTaSource = null;
        if (livingWeatherClient.isConfigured() && areaNo.isPresent()) {
            String area = areaNo.get();
            Optional<Integer> uvOpt = livingWeatherClient.fetchUvIndex(area, tm10);
            if (uvOpt.isPresent()) {
                uv = uvOpt.get();
                uvSource = "kma";
            }
            Optional<Integer> airOpt = livingWeatherClient.fetchAirStagnationIndex(area, tm10);
            if (airOpt.isPresent()) {
                air = airOpt.get();
                airSource = "kma";
            }
            Optional<Double> senOpt = livingWeatherClient.fetchSensibleTempC(area, tm10);
            if (senOpt.isPresent()) {
                senTa = senOpt.get();
                senTaSource = "kma";
            }
        }

        ensureDisasterCache();

        return new ClimateContext(
                pm10, pm10Source,
                rainfall, rainfallSource,
                normalTemp, normalSource,
                uv, uvSource,
                air, airSource,
                senTa, senTaSource,
                disasterCache.typhoons(),
                disasterCache.alerts()
        );
    }
}
