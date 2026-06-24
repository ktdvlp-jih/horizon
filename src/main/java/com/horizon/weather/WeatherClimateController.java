package com.horizon.weather;

import com.horizon.common.response.ApiResponse;
import com.horizon.weather.dto.ClimateContext;
import com.horizon.weather.service.ClimateDataService;
import com.horizon.settings.entity.RegionConfig;
import com.horizon.settings.repository.RegionConfigRepository;
import com.horizon.weather.AsosStationIds;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherClimateController {

    private final ClimateDataService climateDataService;
    private final RegionConfigRepository regionConfigRepository;

    @GetMapping("/climate/{code}")
    public ApiResponse<ClimateContext> climate(@PathVariable String code) {
        String regionCode = code.toLowerCase();
        String stn = regionConfigRepository.findById(regionCode)
                .map(RegionConfig::getKmaStation)
                .filter(s -> s != null && !s.isBlank())
                .orElseGet(() -> AsosStationIds.forRegion(regionCode).orElse("108"));
        return ApiResponse.ok(climateDataService.resolve(regionCode, stn));
    }
}
