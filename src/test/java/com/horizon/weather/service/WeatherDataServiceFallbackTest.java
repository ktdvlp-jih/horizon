package com.horizon.weather.service;

import com.horizon.settings.entity.RegionConfig;
import com.horizon.settings.repository.RegionConfigRepository;
import com.horizon.weather.crawler.KmaWeatherClient;
import com.horizon.weather.dto.ClimateContext;
import com.horizon.weather.dto.RegionWeather;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeatherDataServiceFallbackTest {

    @Mock
    private KmaWeatherClient kmaWeatherClient;

    @Mock
    private RegionConfigRepository regionConfigRepository;

    @Mock
    private ClimateDataService climateDataService;

    @InjectMocks
    private WeatherDataService weatherDataService;

    @Test
    void getRegion_usesSampleWhenApiKeyMissing() {
        RegionConfig seoul = RegionConfig.builder()
                .code("seoul")
                .name("서울")
                .kmaStation("108")
                .sampleTemp(33.5)
                .sampleSolar(0.86)
                .enabled(true)
                .sortOrder(1)
                .coastalExposure(0.25)
                .seismicZone(2)
                .build();

        when(kmaWeatherClient.isConfigured()).thenReturn(false);
        when(regionConfigRepository.findById("seoul")).thenReturn(Optional.of(seoul));
        when(climateDataService.resolve("seoul", "108")).thenReturn(ClimateContext.empty());

        RegionWeather region = weatherDataService.getRegion("seoul");

        assertEquals("sample", region.source());
        assertEquals(33.5, region.baseAirTemp(), 0.01);
        assertEquals(0.86, region.solarLoad(), 0.01);
    }
}
