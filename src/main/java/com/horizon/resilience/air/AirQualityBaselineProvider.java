package com.horizon.resilience.air;

import org.springframework.stereotype.Component;

/**
 * Provides the regional background PM concentration used as the air-quality
 * baseline.
 *
 * <p>Live AirKorea integration is not yet wired; this provider returns an
 * education-grade fallback so the air-quality lens stays fully functional
 * offline. When a live client is added, only {@link #baseline(String)} needs to
 * change and {@link Baseline#source()} should report {@code "airkorea"}.</p>
 */
@Component
public class AirQualityBaselineProvider {

    /** Nationwide fallback background PM10 (µg/m³), roughly "보통" grade. */
    private static final double DEFAULT_PM = 38.0;

    public Baseline baseline(String regionCode) {
        double pm = switch (regionCode == null ? "" : regionCode.toLowerCase()) {
            // Coarse regional skew so the demo differs by city; replaced by live data later.
            case "seoul", "incheon" -> 46.0;
            case "busan", "ulsan" -> 40.0;
            case "daejeon", "daegu" -> 42.0;
            case "gangneung", "jeju" -> 28.0;
            default -> DEFAULT_PM;
        };
        return new Baseline(pm, "fallback");
    }

    public record Baseline(double pm, String source) {
    }
}
