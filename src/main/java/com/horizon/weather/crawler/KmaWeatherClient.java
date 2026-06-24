package com.horizon.weather.crawler;

import com.horizon.weather.dto.AsosObservation;
import com.horizon.weather.dto.DaySolar;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * ASOS 시간자료 클라이언트.
 *
 * <p><b>기본(provider=apihub):</b> [기상청 API허브](https://apihub.kma.go.kr/) — {@code authKey}
 * · {@code kma_sfctm2.php}(기온 TA) + 일사 묶음형 {@code nph-sun_sfc_sts_pkg}(SI_HR)</p>
 *
 * <p><b>provider=portal:</b> 공공데이터포털 {@code getWthrDataList} JSON ({@code serviceKey})</p>
 *
 * <p>키 미설정·오류 시 빈 결과 → {@link com.horizon.weather.service.WeatherDataService} 샘플 폴백.</p>
 */
@Slf4j
@Component
public class KmaWeatherClient {

    private final RestClient apihubClient;
    private final RestClient portalClient;
    private final String apiKey;
    private final String provider;
    private final String tempPath;
    private final String solarPath;
    private final String portalDataPath;

    public KmaWeatherClient(
            RestClient.Builder restClientBuilder,
            @Value("${horizon.weather.kma.apihub-base-url}") String apihubBaseUrl,
            @Value("${horizon.weather.asos.base-url}") String portalBaseUrl,
            @Value("${horizon.weather.asos.data-path:/getWthrDataList}") String portalDataPath,
            @Value("${horizon.weather.asos.provider:apihub}") String provider,
            @Value("${horizon.weather.asos.temp-path:/api/typ01/url/kma_sfctm2.php}") String tempPath,
            @Value("${horizon.weather.asos.solar-path:/api/typ01/cgi-bin/url/nph-sun_sfc_sts_pkg}") String solarPath,
            @Value("${horizon.weather.kma.api-key:}") String apiKey
    ) {
        this.apihubClient = restClientBuilder.baseUrl(apihubBaseUrl).build();
        this.portalClient = restClientBuilder.baseUrl(portalBaseUrl).build();
        this.portalDataPath = portalDataPath;
        this.provider = provider == null ? "apihub" : provider.trim().toLowerCase();
        this.tempPath = tempPath;
        this.solarPath = solarPath;
        this.apiKey = apiKey;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String provider() {
        return provider;
    }

    /**
     * Fetches ASOS hourly rows for one calendar day and hour range (inclusive).
     */
    public List<AsosObservation> fetchHourly(String stationId, String date, int startHour, int endHour) {
        if (!isConfigured()) {
            return List.of();
        }
        if ("portal".equals(provider)) {
            return fetchHourlyPortal(stationId, date, startHour, endHour);
        }
        return fetchHourlyApihub(stationId, date, startHour, endHour);
    }

    public Optional<AsosObservation> fetchBaselineObservation(String stationId, String date, int upToHour) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        for (int back = 1; back <= 4; back++) {
            int hour = upToHour - back;
            if (hour < 0) {
                break;
            }
            List<AsosObservation> rows = fetchHourly(stationId, date, hour, hour);
            if (!rows.isEmpty()) {
                return Optional.of(rows.getFirst());
            }
        }
        return Optional.empty();
    }

    public List<AsosObservation> fetchTimelineHours(String stationId, String date, int[] hours) {
        if (hours.length == 0) {
            return List.of();
        }
        int min = hours[0];
        int max = hours[0];
        for (int h : hours) {
            min = Math.min(min, h);
            max = Math.max(max, h);
        }
        List<AsosObservation> all = fetchHourly(stationId, date, min, max);
        Set<Integer> wanted = new HashSet<>();
        for (int h : hours) {
            wanted.add(h);
        }
        return all.stream()
                .filter(r -> wanted.contains(r.hour()))
                .sorted(Comparator.comparingInt(AsosObservation::hour))
                .toList();
    }

    // --- API Hub (authKey) ---

    private List<AsosObservation> fetchHourlyApihub(String stationId, String date, int startHour, int endHour) {
        List<AsosObservation> rows = new ArrayList<>();
        for (int hour = startHour; hour <= endHour; hour++) {
            String tm = String.format("%s%02d00", date, hour);
            fetchApihubObservation(stationId, tm, hour).ifPresent(rows::add);
        }
        return rows;
    }

    private Optional<AsosObservation> fetchApihubObservation(String stationId, String tm, int hour) {
        Optional<Double> ta = fetchApihubTemperature(stationId, tm);
        if (ta.isEmpty()) {
            return Optional.empty();
        }
        double icsr = fetchApihubSolarHourly(stationId, tm);
        return Optional.of(new AsosObservation(hour, ta.get(), icsr));
    }

    private Optional<Double> fetchApihubTemperature(String stationId, String tm) {
        try {
            String body = apihubClient.get()
                    .uri(uri -> uri.path(tempPath)
                            .queryParam("tm", tm)
                            .queryParam("stn", stationId)
                            .queryParam("help", "0")
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return KmaResponseParser.parseAirTemperature(body);
        } catch (RestClientException ex) {
            log.warn("API허브 ASOS 기온 실패 (stn={}, tm={}): {}", stationId, tm, ex.getMessage());
            return Optional.empty();
        }
    }

    /** Hourly precipitation (mm) from ASOS {@code kma_sfctm2} RN column. */
    public Optional<Double> fetchPrecipitationMm(String stationId, String tm) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = apihubClient.get()
                    .uri(uri -> uri.path(tempPath)
                            .queryParam("tm", tm)
                            .queryParam("stn", stationId)
                            .queryParam("help", "0")
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return KmaResponseParser.parsePrecipitationMm(body);
        } catch (RestClientException ex) {
            log.warn("API허브 ASOS 강수 실패 (stn={}, tm={}): {}", stationId, tm, ex.getMessage());
            return Optional.empty();
        }
    }

    private double fetchApihubSolarHourly(String stationId, String tm) {
        try {
            String body = apihubClient.get()
                    .uri(uri -> uri.path(solarPath)
                            .queryParam("authKey", apiKey)
                            .queryParam("stn", stationId)
                            .queryParam("tm1", tm)
                            .queryParam("tm2", tm)
                            .queryParam("mode", "si")
                            .queryParam("disp", "1")
                            .queryParam("help", "0")
                            .build())
                    .retrieve()
                    .body(String.class);
            DaySolar solar = KmaResponseParser.parseDaySolar(body);
            if (solar.isEmpty()) {
                return 0.0;
            }
            int hour;
            try {
                hour = Integer.parseInt(tm.substring(8, 10));
            } catch (NumberFormatException ex) {
                hour = -1;
            }
            Double siHr = solar.hourlySi().get(hour);
            return siHr != null ? siHr : 0.0;
        } catch (RestClientException ex) {
            log.warn("API허브 일사 실패 (stn={}, tm={}): {}", stationId, tm, ex.getMessage());
            return 0.0;
        }
    }

    // --- 공공데이터포털 (serviceKey) ---

    private List<AsosObservation> fetchHourlyPortal(String stationId, String date, int startHour, int endHour) {
        try {
            String body = portalClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(portalDataPath)
                            .queryParam("serviceKey", apiKey)
                            .queryParam("pageNo", 1)
                            .queryParam("numOfRows", Math.max(1, endHour - startHour + 1))
                            .queryParam("dataType", "JSON")
                            .queryParam("dataCd", "ASOS")
                            .queryParam("dateCd", "HR")
                            .queryParam("stnIds", stationId)
                            .queryParam("startDt", date)
                            .queryParam("endDt", date)
                            .queryParam("startHh", String.format("%02d", startHour))
                            .queryParam("endHh", String.format("%02d", endHour))
                            .build())
                    .retrieve()
                    .body(String.class);
            return KmaResponseParser.parseAsosHourlyJson(body);
        } catch (RestClientException ex) {
            log.warn("공공데이터 ASOS 실패 (stn={}, date={} {}-{}h): {}",
                    stationId, date, startHour, endHour, ex.getMessage());
            return List.of();
        }
    }
}
