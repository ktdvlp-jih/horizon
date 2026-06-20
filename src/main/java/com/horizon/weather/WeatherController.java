package com.horizon.weather;

import com.horizon.common.response.ApiResponse;
import com.horizon.weather.dto.RegionWeather;
import com.horizon.weather.service.WeatherDataService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/regions")
public class WeatherController {

    private final WeatherDataService weatherDataService;

    public WeatherController(WeatherDataService weatherDataService) {
        this.weatherDataService = weatherDataService;
    }

    @GetMapping
    public ApiResponse<List<RegionWeather>> regions() {
        return ApiResponse.ok(weatherDataService.listRegions());
    }

    @GetMapping("/{code}")
    public ApiResponse<RegionWeather> region(@PathVariable String code) {
        return ApiResponse.ok(weatherDataService.getRegion(code));
    }
}
