package com.horizon.weather.service;

import com.horizon.disaster.dto.EarthquakeScenarioParams;
import com.horizon.disaster.dto.TyphoonScenarioParams;
import com.horizon.weather.dto.ClimateContext;
import com.horizon.weather.dto.LiveEarthquakeAlert;
import com.horizon.weather.dto.LiveTyphoon;
import com.horizon.weather.dto.RegionWeather;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ClimateInfluenceServiceTest {

    private final ClimateInfluenceService service = new ClimateInfluenceService();

    @Test
    void blendTyphoon_scalesWithLiveTyphoonCountAndRainfall() {
        TyphoonScenarioParams seed = new TyphoonScenarioParams(40, 80, 200, List.of());
        ClimateContext climate = new ClimateContext(
                null, null,
                25.0, "kma",
                22.0, "kma",
                null, null,
                null, null,
                null, null,
                List.of(new LiveTyphoon(2026, 1, "테스트", "TEST", "2026060100", "2026060500")),
                List.of()
        );
        TyphoonScenarioParams blended = service.blendTyphoon(seed, climate);
        assertTrue(blended.maxWindMs() > seed.maxWindMs());
        assertTrue(blended.rainfallMm() > seed.rainfallMm());
        assertTrue(service.hasLiveTyphoonBlend(climate));
    }

    @Test
    void blendEarthquake_usesLiveMagnitude() {
        EarthquakeScenarioParams seed = new EarthquakeScenarioParams(5.0, 10, 0, 0, "soft");
        ClimateContext climate = new ClimateContext(
                null, null, null, null, null, null, null, null, null, null, null, null,
                List.of(),
                List.of(new LiveEarthquakeAlert(2, "202606251100", 5.8, 36.0, 129.0, "경북 포항"))
        );
        EarthquakeScenarioParams blended = service.blendEarthquake(seed, climate);
        assertEquals(5.8, blended.magnitude(), 0.01);
        assertTrue(service.hasLiveEarthquakeBlend(climate));
    }

    @Test
    void applyHeatInfluence_usesSensibleTempWhenHigher() {
        ClimateContext climate = new ClimateContext(
                null, null, null, null, null, null,
                3, "kma",
                null, null,
                34.5, "kma",
                List.of(), List.of()
        );
        RegionWeather region = new RegionWeather("seoul", "서울", 28.0, 0.8, "kma", climate);
        RegionWeather adjusted = service.applyHeatInfluence(region);
        assertEquals(34.5, adjusted.baseAirTemp(), 0.01);
        assertTrue(adjusted.solarLoad() > region.solarLoad());
    }

    @Test
    void airDiffusion_reducesWhenAirStagnationHigh() {
        ClimateContext climate = new ClimateContext(
                null, null, null, null, null, null, null, null,
                9, "kma",
                null, null,
                List.of(), List.of()
        );
        assertTrue(service.airDiffusionFactor(climate) < 0.5);
    }
}
