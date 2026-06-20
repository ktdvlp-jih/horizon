package com.horizon.design.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.ai.client.AiServiceClient;
import com.horizon.ai.dto.CoachRequest;
import com.horizon.ai.dto.CoachResponse;
import com.horizon.auth.util.AuthUtil;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.design.dto.DesignMetrics;
import com.horizon.design.dto.DesignSummary;
import com.horizon.design.dto.SaveDesignRequest;
import com.horizon.design.dto.SimulateRequest;
import com.horizon.design.dto.SimulationResult;
import com.horizon.design.dto.SimulationTimeline;
import com.horizon.design.entity.CityDesign;
import com.horizon.design.mapper.DesignMapper;
import com.horizon.design.repository.CityDesignRepository;
import com.horizon.weather.dto.RegionWeather;
import com.horizon.weather.service.WeatherDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DesignService {

    private final WeatherDataService weatherDataService;
    private final SimulationEngine simulationEngine;
    private final AiServiceClient aiServiceClient;
    private final CityDesignRepository designRepository;
    private final DesignMapper designMapper;
    private final ObjectMapper objectMapper;

    public SimulationResult simulate(SimulateRequest request) {
        RegionWeather region = weatherDataService.getRegion(request.regionCode());
        return simulationEngine.simulate(region, request.grid());
    }

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    public SimulationTimeline simulateTimeline(SimulateRequest request) {
        LocalDate date = parseDateOrYesterday(request.date());
        String iso = date.toString();
        RegionWeather region = weatherDataService.getRegion(request.regionCode());
        return weatherDataService.getHourlySeries(request.regionCode(), date)
                .filter(obs -> !obs.isEmpty())
                .map(obs -> simulationEngine.simulateTimeline(region, request.grid(), obs, iso))
                .orElseGet(() -> simulationEngine.simulateTimeline(region, request.grid(), iso));
    }

    private LocalDate parseDateOrYesterday(String raw) {
        LocalDate yesterday = LocalDate.now(KST).minusDays(1);
        if (raw == null || raw.isBlank()) {
            return yesterday;
        }
        try {
            LocalDate parsed = LocalDate.parse(raw.trim());
            // Never allow future dates (no observations yet).
            return parsed.isAfter(yesterday.plusDays(1)) ? yesterday : parsed;
        } catch (java.time.format.DateTimeParseException ex) {
            return yesterday;
        }
    }

    public CoachResponse coach(SimulateRequest request) {
        SimulationResult result = simulate(request);
        DesignMetrics m = result.metrics();
        CoachRequest coachRequest = new CoachRequest(
                result.region().name(),
                m.baseAirTemp(),
                result.region().solarLoad(),
                m.gridSize(),
                m.greenRatio(),
                m.imperviousRatio(),
                m.waterRatio(),
                m.avgSurfaceTemp(),
                m.maxSurfaceTemp(),
                m.deltaT(),
                m.tileCounts()
        );
        return aiServiceClient.coach(coachRequest);
    }

    @Transactional
    public DesignSummary save(SaveDesignRequest request) {
        Long ownerId = AuthUtil.currentUserId();
        SimulationResult result = simulate(new SimulateRequest(request.regionCode(), request.grid(), null));
        DesignMetrics m = result.metrics();
        CityDesign saved = designRepository.save(CityDesign.builder()
                .name(request.name())
                .regionCode(request.regionCode())
                .gridJson(writeGrid(request.grid()))
                .gridSize(m.gridSize())
                .avgSurfaceTemp(m.avgSurfaceTemp())
                .deltaT(m.deltaT())
                .greenRatio(m.greenRatio())
                .ownerId(ownerId)
                .build());
        return designMapper.toSummary(saved);
    }

    @Transactional(readOnly = true)
    public List<DesignSummary> findMine() {
        Long ownerId = AuthUtil.currentUserId();
        return designRepository.findByOwnerId(ownerId).stream()
                .map(designMapper::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DesignSummary> leaderboard(String regionCode, int limit) {
        return designRepository.findLeaderboard(regionCode, limit).stream()
                .map(designMapper::toSummary)
                .toList();
    }

    private String writeGrid(List<List<String>> grid) {
        try {
            return objectMapper.writeValueAsString(grid);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "그리드 직렬화에 실패했습니다.");
        }
    }
}
