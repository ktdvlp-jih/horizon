package com.horizon.ai.client;

import com.horizon.ai.dto.AiHealth;
import com.horizon.ai.dto.CoachRequest;
import com.horizon.ai.dto.CoachResponse;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class AiServiceClient {

    private final RestClient aiRestClient;

    public AiServiceClient(RestClient aiRestClient) {
        this.aiRestClient = aiRestClient;
    }

    public CoachResponse coach(CoachRequest request) {
        log.debug("AI coach call -> POST /internal/v1/coach payload={}", request);
        try {
            CoachResponse response = aiRestClient.post()
                    .uri("/internal/v1/coach")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(CoachResponse.class);
            if (response != null) {
                log.debug("AI coach response source={} score={} grade={}", response.source(), response.score(), response.grade());
            }
            return response;
        } catch (RestClientException ex) {
            log.error("AI coach call failed: {}", ex.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "AI 코치 서비스에 연결할 수 없습니다.");
        }
    }

    public boolean isHealthy() {
        try {
            AiHealth health = health();
            return health != null && "ok".equalsIgnoreCase(health.status());
        } catch (RestClientException ex) {
            log.warn("AI health check failed: {}", ex.getMessage());
            return false;
        }
    }

    public AiHealth health() {
        try {
            return aiRestClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(AiHealth.class);
        } catch (RestClientException ex) {
            log.warn("AI health fetch failed: {}", ex.getMessage());
            return null;
        }
    }
}
