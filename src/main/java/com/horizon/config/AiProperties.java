package com.horizon.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "horizon.ai")
public record AiProperties(
        String baseUrl,
        Duration connectTimeout,
        Duration readTimeout
) {
    public AiProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:8000";
        }
        if (connectTimeout == null) {
            connectTimeout = Duration.ofSeconds(5);
        }
        if (readTimeout == null) {
            readTimeout = Duration.ofSeconds(120);
        }
    }
}
