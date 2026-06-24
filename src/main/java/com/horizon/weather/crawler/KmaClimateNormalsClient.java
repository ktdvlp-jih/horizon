package com.horizon.weather.crawler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;

/** 산업특화 지상관측 평년값 {@code sun_sfc_norm.php}. */
@Slf4j
@Component
public class KmaClimateNormalsClient {

    private final RestClient client;
    private final String apiKey;
    private final String normalsPath;
    private final String tmst;

    public KmaClimateNormalsClient(
            RestClient.Builder restClientBuilder,
            @Value("${horizon.weather.kma.apihub-base-url}") String baseUrl,
            @Value("${horizon.weather.kma.api-key:}") String apiKey,
            @Value("${horizon.weather.kma.normals-path:/api/typ01/url/sun_sfc_norm.php}") String normalsPath,
            @Value("${horizon.weather.kma.normals-tmst:2021}") String tmst
    ) {
        this.client = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.normalsPath = normalsPath;
        this.tmst = tmst;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Optional<Double> fetchMonthlyNormalTemp(String stationId, int month, int day) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = client.get()
                    .uri(uri -> uri.path(normalsPath)
                            .queryParam("norm", "M")
                            .queryParam("tmst", tmst)
                            .queryParam("stn", stationId)
                            .queryParam("MM1", month)
                            .queryParam("DD1", day)
                            .queryParam("MM2", month)
                            .queryParam("DD2", day)
                            .queryParam("help", 0)
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return KmaResponseParser.parseSunSfcNormalTemp(body);
        } catch (RestClientException ex) {
            log.warn("API허브 평년값 실패 (stn={}, m={}): {}", stationId, month, ex.getMessage());
            return Optional.empty();
        }
    }
}
