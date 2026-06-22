package com.horizon.disaster.crawler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * KMA APIhub client for disaster scenario ingest (typhoon best track, earthquake/tsunami info).
 * Returns empty when unconfigured; seeded scenarios are used instead.
 */
@Slf4j
@Component
public class KmaDisasterClient {

    private final RestClient restClient;
    private final String apiKey;

    public KmaDisasterClient(
            RestClient.Builder restClientBuilder,
            @Value("${horizon.weather.kma.base-url:https://apihub.kma.go.kr}") String baseUrl,
            @Value("${horizon.weather.kma.api-key:}") String apiKey
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Fetches raw typhoon list for a year (for admin ingest). Returns empty if not configured.
     */
    public java.util.Optional<String> fetchTyphoonListRaw(int year) {
        if (!isConfigured()) {
            return java.util.Optional.empty();
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
            return java.util.Optional.ofNullable(body);
        } catch (Exception ex) {
            log.warn("KMA typhoon list fetch failed: {}", ex.getMessage());
            return java.util.Optional.empty();
        }
    }
}
