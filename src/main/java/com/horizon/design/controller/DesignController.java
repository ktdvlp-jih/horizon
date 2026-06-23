package com.horizon.design.controller;

import com.horizon.ai.dto.CoachResponse;
import com.horizon.common.response.ApiResponse;
import com.horizon.design.dto.DesignDetail;
import com.horizon.design.dto.DesignListItem;
import com.horizon.design.dto.DesignSummary;
import com.horizon.design.dto.SaveDesignRequest;
import com.horizon.design.dto.SimulateRequest;
import com.horizon.design.dto.SimulationResult;
import com.horizon.design.dto.SimulationTimeline;
import com.horizon.design.service.DesignService;
import com.horizon.resilience.dto.EvaluateRequest;
import com.horizon.resilience.dto.EvaluateResponse;
import com.horizon.resilience.service.ResilienceOrchestrator;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/designs")
public class DesignController {

    private final DesignService designService;
    private final ResilienceOrchestrator resilienceOrchestrator;

    public DesignController(DesignService designService, ResilienceOrchestrator resilienceOrchestrator) {
        this.designService = designService;
        this.resilienceOrchestrator = resilienceOrchestrator;
    }

    @PostMapping("/simulate")
    public ApiResponse<SimulationResult> simulate(@Valid @RequestBody SimulateRequest request) {
        return ApiResponse.ok(designService.simulate(request));
    }

    /** Unified multi-lens evaluation over a single shared city grid. */
    @PostMapping("/evaluate")
    public ApiResponse<EvaluateResponse> evaluate(@Valid @RequestBody EvaluateRequest request) {
        return ApiResponse.ok(resilienceOrchestrator.evaluate(request));
    }

    /** Unified multi-axis AI coach (heat/air/disaster/agriculture together). */
    @PostMapping("/coach/resilience")
    public ApiResponse<CoachResponse> coachResilience(@Valid @RequestBody EvaluateRequest request) {
        return ApiResponse.ok(resilienceOrchestrator.coach(request));
    }

    @PostMapping("/simulate/timeline")
    public ApiResponse<SimulationTimeline> simulateTimeline(@Valid @RequestBody SimulateRequest request) {
        return ApiResponse.ok(designService.simulateTimeline(request));
    }

    @PostMapping("/coach")
    public ApiResponse<CoachResponse> coach(@Valid @RequestBody SimulateRequest request) {
        return ApiResponse.ok(designService.coach(request));
    }

    @PostMapping
    public ApiResponse<DesignSummary> save(@Valid @RequestBody SaveDesignRequest request) {
        return ApiResponse.ok(designService.save(request));
    }

    @GetMapping("/mine")
    public ApiResponse<List<DesignListItem>> mine() {
        return ApiResponse.ok(designService.findMineWithGrid());
    }

    @GetMapping("/leaderboard")
    public ApiResponse<List<DesignSummary>> leaderboard(
            @RequestParam(required = false) String regionCode,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ApiResponse.ok(designService.leaderboard(regionCode, Math.min(limit, 50)));
    }

    @GetMapping("/leaderboard/{id}")
    public ApiResponse<DesignDetail> leaderboardEntry(@PathVariable Long id) {
        return ApiResponse.ok(designService.findLeaderboardEntry(id));
    }

    @GetMapping("/{id}")
    public ApiResponse<DesignDetail> get(@PathVariable Long id) {
        return ApiResponse.ok(designService.findMineById(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<DesignSummary> update(@PathVariable Long id, @Valid @RequestBody SaveDesignRequest request) {
        return ApiResponse.ok(designService.updateMine(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        designService.deleteMine(id);
        return ApiResponse.ok(null);
    }
}
