package com.horizon.weather.crawler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;

/** 생활기상지수 V3 — 자외선·대기정체·여름 체감온도(SenTa). */
@Slf4j
@Component
public class KmaLivingWeatherClient {

    private final RestClient client;
    private final String apiKey;
    private final String livingBasePath;

    public KmaLivingWeatherClient(
            RestClient.Builder restClientBuilder,
            @Value("${horizon.weather.kma.apihub-base-url}") String baseUrl,
            @Value("${horizon.weather.kma.api-key:}") String apiKey,
            @Value("${horizon.weather.kma.living-base-path:/api/typ02/openApi/LivingWthrIdxServiceV3}") String livingBasePath
    ) {
        this.client = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.livingBasePath = livingBasePath;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public Optional<Integer> fetchUvIndex(String areaNo, String timeYYYYMMDDHH) {
        return fetchIndex(areaNo, timeYYYYMMDDHH, "/getUVIdxV3", "h0");
    }

    public Optional<Integer> fetchAirStagnationIndex(String areaNo, String timeYYYYMMDDHH) {
        return fetchIndex(areaNo, timeYYYYMMDDHH, "/getAirDiffusionIdxV3", "h0");
    }

    /** Summer sensible temperature (°C); may be empty outside service season. */
    public Optional<Double> fetchSensibleTempC(String areaNo, String timeYYYYMMDDHH) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = client.get()
                    .uri(uri -> uri.path(livingBasePath + "/getSenTaIdxV3")
                            .queryParam("pageNo", 1)
                            .queryParam("numOfRows", 3)
                            .queryParam("dataType", "JSON")
                            .queryParam("areaNo", areaNo)
                            .queryParam("time", timeYYYYMMDDHH)
                            .queryParam("requestCode", "A41")
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return KmaResponseParser.parseSenTaValue(body);
        } catch (RestClientException ex) {
            log.warn("API허브 SenTa 실패 (area={}, time={}): {}", areaNo, timeYYYYMMDDHH, ex.getMessage());
            return Optional.empty();
        }
    }

    private Optional<Integer> fetchIndex(String areaNo, String timeYYYYMMDDHH, String op, String field) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String body = client.get()
                    .uri(uri -> uri.path(livingBasePath + op)
                            .queryParam("pageNo", 1)
                            .queryParam("numOfRows", 3)
                            .queryParam("dataType", "JSON")
                            .queryParam("areaNo", areaNo)
                            .queryParam("time", timeYYYYMMDDHH)
                            .queryParam("authKey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);
            return KmaResponseParser.parseLivingIndexH0(body, field);
        } catch (RestClientException ex) {
            log.warn("API허브 생활기상 {} 실패: {}", op, ex.getMessage());
            return Optional.empty();
        }
    }
}
