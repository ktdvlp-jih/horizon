package com.horizon.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public WebConfig(@Value("${horizon.cors.origins:http://localhost:5173}") String origins) {
        this.allowedOrigins = origins.split("\\s*,\\s*");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns(buildPatterns())
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    private String[] buildPatterns() {
        String[] patterns = new String[allowedOrigins.length + 1];
        System.arraycopy(allowedOrigins, 0, patterns, 0, allowedOrigins.length);
        patterns[allowedOrigins.length] = "https://*.trycloudflare.com";
        return patterns;
    }
}
