package com.horizon.health;

import com.horizon.ai.client.AiServiceClient;
import com.horizon.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final AiServiceClient aiServiceClient;

    public HealthController(AiServiceClient aiServiceClient) {
        this.aiServiceClient = aiServiceClient;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> health() {
        boolean aiHealthy = aiServiceClient.isHealthy();
        return ApiResponse.ok(Map.of(
                "service", "horizon-backend",
                "status", "ok",
                "ai", aiHealthy ? "ok" : "down"
        ));
    }
}
