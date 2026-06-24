package com.horizon.weather.crawler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;

/** 기상청 API허브 황사(PM10) 시간자료 {@code dst_pm10_hr.php}. */
@Slf4j
@Component
public class KmaPm10Client {

    private final RestClient client;
    private final String apiKey;
    private final String pm10Path;

    public KmaPm10Client(
            RestClient.Builder restClientBuilder,
            @Value("${horizon.weather.kma.apihub-base-url}") String baseUrl,
            @Value("${horizon.weather.kma.api-key:}") String apiKey,
            @Value("${horizon.weather.kma.pm10-path:/api/typ01/url/dst_pm10_hr.php}") String pm10Path
    ) {
        this.client = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.pm10Path = pm10Path;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Optional<Double> fetchHourlyPm10(String stationId, String tmYYYYMMDDHH) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = client.get()
                    .uri(uri -> uri.path(pm10Path)
                            .queryParam("tm", tmYYYYMMDDHH)
                            .queryParam("org", "")
                            .queryParam("stn", stationId)
                            .queryParam("mode", 1)
                            .queryParam("help", 0)
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return KmaResponseParser.parsePm10Hourly(body);
        } catch (RestClientException ex) {
            log.warn("API허브 PM10 실패 (stn={}, tm={}): {}", stationId, tmYYYYMMDDHH, ex.getMessage());
            return Optional.empty();
        }
    }
}
