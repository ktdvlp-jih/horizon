package com.horizon.disaster.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.ai.client.AiServiceClient;
import com.horizon.ai.dto.CoachResponse;
import com.horizon.auth.util.AuthUtil;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.design.dto.TileType;
import com.horizon.design.entity.CityDesign;
import com.horizon.design.repository.CityDesignRepository;
import com.horizon.disaster.dto.DisasterCoachRequest;
import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.dto.DisasterSaveRequest;
import com.horizon.disaster.dto.DisasterSimulateRequest;
import com.horizon.disaster.dto.DisasterSimulationResult;
import com.horizon.disaster.dto.DisasterSummary;
import com.horizon.disaster.dto.DisasterTimeline;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.settings.entity.RegionConfig;
import com.horizon.settings.repository.RegionConfigRepository;
import com.horizon.settings.service.AiCoachSettingsService;
import com.horizon.weather.dto.RegionWeather;
import com.horizon.weather.service.WeatherDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.horizon.disaster.service.DisasterGridHelper.RegionContext;
import static com.horizon.disaster.service.DisasterGridHelper.parseGrid;
import static com.horizon.disaster.service.DisasterGridHelper.regionContext;
import static com.horizon.disaster.service.DisasterGridHelper.toList;

@Service
@RequiredArgsConstructor
public class DisasterSimulationService {

    private final DisasterScenarioService scenarioService;
    private final TyphoonSimulationEngine typhoonEngine;
    private final EarthquakeSimulationEngine earthquakeEngine;
    private final TsunamiSimulationEngine tsunamiEngine;
    private final WeatherDataService weatherDataService;
    private final RegionConfigRepository regionConfigRepository;
    private final AiServiceClient aiServiceClient;
    private final AiCoachSettingsService aiCoachSettingsService;
    private final DisasterCoachRuleService disasterCoachRuleService;
    private final CityDesignRepository designRepository;
    private final ObjectMapper objectMapper;

    public DisasterSimulationResult simulate(DisasterSimulateRequest request) {
        DisasterScenario scenario = scenarioService.getRequired(request.scenarioId());
        if (scenario.getMode() != request.mode()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "시나리오와 모드가 일치하지 않습니다.");
        }
        RegionWeather region = weatherDataService.getRegion(request.regionCode());
        RegionContext ctx = loadRegionContext(request.regionCode());
        TileType[][] grid = parseGrid(request.grid());

        TyphoonSimulationEngine.SimulationOutput output = dispatch(scenario, ctx, grid);
        double[][] values = output.cellValues();

        return new DisasterSimulationResult(
                request.mode(),
                region,
                output.scenario(),
                grid.length,
                toList(values),
                output.metrics(),
                DisasterGridHelper.minValue(values),
                DisasterGridHelper.maxValue(values)
        );
    }

    public DisasterTimeline simulateTimeline(DisasterSimulateRequest request) {
        DisasterScenario scenario = scenarioService.getRequired(request.scenarioId());
        RegionWeather region = weatherDataService.getRegion(request.regionCode());
        RegionContext ctx = loadRegionContext(request.regionCode());
        TileType[][] grid = parseGrid(request.grid());

        DisasterTimeline timeline = switch (request.mode()) {
            case TYPHOON -> typhoonEngine.timeline(scenario, ctx, grid);
            case EARTHQUAKE -> earthquakeEngine.timeline(scenario, ctx, grid);
            case TSUNAMI -> tsunamiEngine.timeline(scenario, ctx, grid);
        };

        return new DisasterTimeline(
                timeline.mode(),
                region,
                timeline.scenario(),
                timeline.gridSize(),
                timeline.globalMin(),
                timeline.globalMax(),
                timeline.source(),
                timeline.frames()
        );
    }

    public CoachResponse coach(DisasterSimulateRequest request) {
        DisasterSimulationResult result = simulate(request);
        DisasterCoachRequest coachRequest = new DisasterCoachRequest(
                request.mode().name().toLowerCase(),
                result.region().name(),
                result.scenario().title(),
                result.metrics(),
                aiCoachSettingsService.getActiveDecrypted()
        );
        try {
            return aiServiceClient.disasterCoach(coachRequest);
        } catch (BusinessException ex) {
            if (ex.getErrorCode() != ErrorCode.AI_SERVICE_ERROR) {
                throw ex;
            }
            return disasterCoachRuleService.coach(coachRequest);
        }
    }

    @Transactional
    public DisasterSummary save(DisasterSaveRequest request) {
        Long ownerId = AuthUtil.currentUserId();
        DisasterSimulationResult result = simulate(new DisasterSimulateRequest(
                request.mode(),
                request.regionCode(),
                request.scenarioId(),
                request.grid(),
                null
        ));

        String metricsJson;
        try {
            metricsJson = objectMapper.writeValueAsString(result.metrics());
        } catch (Exception e) {
            metricsJson = "{}";
        }

        String gridJson;
        try {
            gridJson = objectMapper.writeValueAsString(request.grid());
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "격자 직렬화 실패");
        }

        CityDesign design = CityDesign.builder()
                .name(request.name())
                .regionCode(request.regionCode())
                .gridJson(gridJson)
                .gridSize(result.gridSize())
                .avgSurfaceTemp(result.metrics().avgRisk())
                .deltaT(result.metrics().maxRisk())
                .greenRatio(result.metrics().protectedRatio())
                .experienceId(request.mode().experienceId())
                .scenarioId(request.scenarioId())
                .metricsJson(metricsJson)
                .ownerId(ownerId)
                .visibleOnLeaderboard(false)
                .build();

        CityDesign saved = designRepository.save(design);
        return new DisasterSummary(
                saved.getId(),
                saved.getName(),
                request.mode(),
                saved.getRegionCode(),
                request.scenarioId(),
                result.metrics().avgRisk(),
                result.metrics().maxRisk(),
                saved.getCreatedAt().toString()
        );
    }

    @Transactional(readOnly = true)
    public List<DisasterSummary> findMine(DisasterMode mode) {
        Long ownerId = AuthUtil.currentUserId();
        return designRepository
                .findByOwnerIdAndExperienceIdAndDeletedAtIsNullOrderByCreatedAtDesc(ownerId, mode.experienceId())
                .stream()
                .map(d -> new DisasterSummary(
                        d.getId(),
                        d.getName(),
                        mode,
                        d.getRegionCode(),
                        d.getScenarioId() != null ? d.getScenarioId() : "",
                        d.getAvgSurfaceTemp(),
                        d.getDeltaT(),
                        d.getCreatedAt().toString()))
                .toList();
    }

    private TyphoonSimulationEngine.SimulationOutput dispatch(DisasterScenario scenario,
                                                              RegionContext ctx, TileType[][] grid) {
        return switch (scenario.getMode()) {
            case TYPHOON -> typhoonEngine.simulate(scenario, ctx, grid);
            case EARTHQUAKE -> earthquakeEngine.simulate(scenario, ctx, grid);
            case TSUNAMI -> tsunamiEngine.simulate(scenario, ctx, grid);
        };
    }

    private RegionContext loadRegionContext(String code) {
        RegionConfig region = regionConfigRepository.findById(code)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "지역을 찾을 수 없습니다."));
        return regionContext(region);
    }
}
