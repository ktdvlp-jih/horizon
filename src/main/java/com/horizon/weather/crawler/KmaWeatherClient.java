package com.horizon.weather.crawler;

import com.horizon.weather.dto.DaySolar;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;

/**
 * Client for the 기상청 API허브 (apihub.kma.go.kr).
 *
 * <ul>
 *   <li>ASOS single-time observation ({@code kma_sfctm2.php}) for air temperature.</li>
 *   <li>Solar package ({@code nph-sun_sfc_sts_pkg}) for hourly/daily insolation.</li>
 * </ul>
 *
 * <p>Defensive by design: with no API key (or on any error) methods return empty
 * so the service layer transparently falls back to built-in sample data.</p>
 */
@Slf4j
@Component
public class KmaWeatherClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String tempPath;
    private final String solarPath;

    public KmaWeatherClient(
            RestClient.Builder restClientBuilder,
            @Value("${horizon.weather.kma.base-url}") String baseUrl,
            @Value("${horizon.weather.kma.api-key:}") String apiKey,
            @Value("${horizon.weather.kma.temp-path:/api/typ01/url/kma_sfctm2.php}") String tempPath,
            @Value("${horizon.weather.kma.solar-path:/api/typ01/cgi-bin/url/nph-sun_sfc_sts_pkg}") String solarPath
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.tempPath = tempPath;
        this.solarPath = solarPath;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Fetches observed air temperature for a station at a specific time.
     *
     * @param stationId KMA station id (지점번호)
     * @param tm        observation time formatted as {@code yyyyMMddHHmm} (KST)
     */
    public Optional<Double> fetchAirTemperature(String stationId, String tm) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(tempPath)
                            .queryParam("tm", tm)
                            .queryParam("stn", stationId)
                            .queryParam("help", "0")
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return KmaResponseParser.parseAirTemperature(body);
        } catch (RestClientException ex) {
            log.warn("KMA temperature fetch failed (stn={}, tm={}): {}", stationId, tm, ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Fetches the solar package for a single time. Querying a single minute is
     * required because a full-day window gets truncated to roughly the last 12
     * hours by the API, dropping the morning rows.
     *
     * <p>The parsed {@link DaySolar} carries the hourly insolation (SI_HR) for
     * that hour and the daily total (SI_DAY), which the package reports as the
     * completed daily statistic on every row.</p>
     *
     * @param stationId KMA station id (지점번호)
     * @param tm        time formatted as {@code yyyyMMddHHmm} (KST)
     */
    public Optional<DaySolar> fetchSolar(String stationId, String tm) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(solarPath)
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
            return solar.isEmpty() ? Optional.empty() : Optional.of(solar);
        } catch (RestClientException ex) {
            log.warn("KMA solar fetch failed (stn={}, tm={}): {}", stationId, tm, ex.getMessage());
            return Optional.empty();
        }
    }
}
