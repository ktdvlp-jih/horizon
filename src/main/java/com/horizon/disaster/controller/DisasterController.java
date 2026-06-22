package com.horizon.disaster.controller;

import com.horizon.ai.dto.CoachResponse;
import com.horizon.common.response.ApiResponse;
import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.dto.DisasterSaveRequest;
import com.horizon.disaster.dto.DisasterSimulateRequest;
import com.horizon.disaster.dto.DisasterSimulationResult;
import com.horizon.disaster.dto.DisasterSummary;
import com.horizon.disaster.dto.DisasterTimeline;
import com.horizon.disaster.dto.ScenarioSummary;
import com.horizon.disaster.service.DisasterScenarioService;
import com.horizon.disaster.service.DisasterSimulationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/disaster")
@RequiredArgsConstructor
public class DisasterController {

    private final DisasterScenarioService scenarioService;
    private final DisasterSimulationService simulationService;

    @GetMapping("/scenarios")
    public ApiResponse<List<ScenarioSummary>> scenarios(@RequestParam DisasterMode mode) {
        return ApiResponse.ok(scenarioService.listByMode(mode));
    }

    @PostMapping("/simulate")
    public ApiResponse<DisasterSimulationResult> simulate(@Valid @RequestBody DisasterSimulateRequest request) {
        return ApiResponse.ok(simulationService.simulate(request));
    }

    @PostMapping("/simulate/timeline")
    public ApiResponse<DisasterTimeline> simulateTimeline(@Valid @RequestBody DisasterSimulateRequest request) {
        return ApiResponse.ok(simulationService.simulateTimeline(request));
    }

    @PostMapping("/coach")
    public ApiResponse<CoachResponse> coach(@Valid @RequestBody DisasterSimulateRequest request) {
        return ApiResponse.ok(simulationService.coach(request));
    }

    @GetMapping("/designs/mine")
    public ApiResponse<List<DisasterSummary>> mine(@RequestParam DisasterMode mode) {
        return ApiResponse.ok(simulationService.findMine(mode));
    }

    @PostMapping("/designs")
    public ApiResponse<DisasterSummary> save(@Valid @RequestBody DisasterSaveRequest request) {
        return ApiResponse.ok(simulationService.save(request));
    }
}
