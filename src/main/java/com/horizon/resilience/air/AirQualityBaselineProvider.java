package com.horizon.resilience.air;

import com.horizon.weather.AsosStationIds;
import com.horizon.weather.dto.ClimateContext;
import com.horizon.weather.service.ClimateDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Regional background PM10 (µg/m³) from 기상청 API허브 황사 관측, with education-grade fallback.
 */
@Component
@RequiredArgsConstructor
public class AirQualityBaselineProvider {

    private static final double DEFAULT_PM = 38.0;

    private final ClimateDataService climateDataService;

    public Baseline baseline(String regionCode) {
        String code = regionCode == null ? "" : regionCode.toLowerCase();
        String stn = AsosStationIds.forRegion(code).orElse("108");
        ClimateContext climate = climateDataService.resolve(code, stn);
        if (climate.pm10() != null && "kma".equals(climate.pm10Source())) {
            return new Baseline(climate.pm10(), "kma");
        }
        double pm = switch (code) {
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
