package com.horizon.disaster.crawler;

import com.horizon.weather.crawler.KmaResponseParser;
import com.horizon.weather.dto.LiveEarthquakeAlert;
import com.horizon.weather.dto.LiveTyphoon;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Optional;

/**
 * KMA APIhub client for disaster live feeds (typhoon list, earthquake/tsunami now).
 */
@Slf4j
@Component
public class KmaDisasterClient {

    private final RestClient restClient;
    private final String apiKey;

    public KmaDisasterClient(
            RestClient.Builder restClientBuilder,
            @Value("${horizon.weather.kma.apihub-base-url:https://apihub.kma.go.kr}") String baseUrl,
            @Value("${horizon.weather.kma.api-key:}") String apiKey
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Optional<String> fetchTyphoonListRaw(int year) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = restClient.get()
                    .uri(uri -> uri.path("/api/typ01/url/typ_lst.php")
                            .queryParam("YY", year)
                            .queryParam("disp", 0)
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return Optional.ofNullable(body);
        } catch (Exception ex) {
            log.warn("KMA typhoon list fetch failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public List<LiveTyphoon> fetchTyphoonList(int year) {
        return fetchTyphoonListRaw(year)
                .map(body -> KmaResponseParser.parseTyphoonList(body, year))
                .orElse(List.of());
    }

    public Optional<String> fetchEqkNowRaw() {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = restClient.get()
                    .uri(uri -> uri.path("/api/typ01/url/eqk_now.php")
                            .queryParam("disp", 0)
                            .queryParam("help", 0)
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return Optional.ofNullable(body);
        } catch (Exception ex) {
            log.warn("KMA eqk_now fetch failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public List<LiveEarthquakeAlert> fetchEarthquakeAlerts() {
        return fetchEqkNowRaw()
                .map(KmaResponseParser::parseEqkNow)
                .orElse(List.of());
    }
}
