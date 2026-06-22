package com.horizon.admin.controller;

import com.horizon.admin.dto.AdminAiCoachTestRequest;
import com.horizon.admin.dto.AdminAiCoachUpdateRequest;
import com.horizon.admin.dto.AdminDesignPatchRequest;
import com.horizon.admin.dto.AdminDesignSummary;
import com.horizon.admin.dto.AdminResetPasswordRequest;
import com.horizon.admin.dto.AdminUserDetail;
import com.horizon.admin.dto.AdminUserPatchRequest;
import com.horizon.admin.dto.AdminUserSummary;
import com.horizon.admin.dto.RegionConfigDto;
import com.horizon.admin.dto.DisasterScenarioDto;
import com.horizon.admin.service.AdminChallengeService;
import com.horizon.admin.service.AdminDesignService;
import com.horizon.admin.service.AdminDisasterScenarioService;
import com.horizon.admin.service.AdminRegionService;
import com.horizon.admin.service.AdminSystemService;
import com.horizon.admin.service.AdminUserService;
import com.horizon.admin.audit.service.AdminAuditLogService;
import com.horizon.auth.util.AuthUtil;
import com.horizon.common.response.ApiResponse;
import com.horizon.common.response.PageResponse;
import com.horizon.design.dto.DesignDetail;
import com.horizon.settings.dto.ChallengeConfigDto;
import com.horizon.settings.service.AiCoachSettingsService;
import com.horizon.user.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService adminUserService;
    private final AdminDesignService adminDesignService;
    private final AdminRegionService adminRegionService;
    private final AdminChallengeService adminChallengeService;
    private final AdminDisasterScenarioService adminDisasterScenarioService;
    private final AdminSystemService adminSystemService;
    private final AiCoachSettingsService aiCoachSettingsService;
    private final AdminAuditLogService auditLogService;

    @GetMapping("/users")
    public ApiResponse<PageResponse<AdminUserSummary>> users(
            @RequestParam(required = false) String loginId,
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) String useYn,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(adminUserService.list(loginId, userName, role, useYn, page, size));
    }

    @GetMapping("/users/{userId}")
    public ApiResponse<AdminUserDetail> user(@PathVariable Long userId) {
        return ApiResponse.ok(adminUserService.get(userId));
    }

    @PatchMapping("/users/{userId}")
    public ApiResponse<AdminUserDetail> patchUser(@PathVariable Long userId,
                                                  @RequestBody AdminUserPatchRequest request) {
        return ApiResponse.ok(adminUserService.patch(userId, request));
    }

    @PostMapping("/users/{userId}/reset-password")
    public ApiResponse<Void> resetPassword(@PathVariable Long userId,
                                           @RequestBody AdminResetPasswordRequest request) {
        adminUserService.resetPassword(userId, request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/ai-coach")
    public ApiResponse<AiCoachSettingsService.AiCoachSettingsView> getAiCoach() {
        return ApiResponse.ok(aiCoachSettingsService.getView(AuthUtil.currentUser().getUsername()));
    }

    @PutMapping("/ai-coach")
    public ApiResponse<AiCoachSettingsService.AiCoachSettingsView> updateAiCoach(
            @RequestBody AdminAiCoachUpdateRequest request) {
        var view = adminSystemService.updateAiCoach(request);
        auditLogService.log(AuthUtil.currentUserId(), "AI_COACH_UPDATE", "AI_COACH", "1", null);
        return ApiResponse.ok(view);
    }

    @PostMapping("/ai-coach/test")
    public ApiResponse<AdminAiCoachTestRequest.AdminAiCoachTestResponse> testAiCoach(
            @RequestBody(required = false) AdminAiCoachTestRequest request) {
        AdminAiCoachTestRequest req = request != null ? request : new AdminAiCoachTestRequest(true, null);
        return ApiResponse.ok(adminSystemService.testAiCoach(req));
    }

    @GetMapping("/designs")
    public ApiResponse<PageResponse<AdminDesignSummary>> designs(
            @RequestParam(required = false) String regionCode,
            @RequestParam(required = false) String ownerLoginId,
            @RequestParam(required = false) Boolean visibleOnLeaderboard,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(adminDesignService.list(regionCode, ownerLoginId, visibleOnLeaderboard, page, size));
    }

    @GetMapping("/designs/{id}")
    public ApiResponse<DesignDetail> design(@PathVariable Long id) {
        return ApiResponse.ok(adminDesignService.get(id));
    }

    @PatchMapping("/designs/{id}")
    public ApiResponse<AdminDesignSummary> patchDesign(@PathVariable Long id,
                                                       @RequestBody AdminDesignPatchRequest request) {
        return ApiResponse.ok(adminDesignService.patch(id, request));
    }

    @DeleteMapping("/designs/{id}")
    public ApiResponse<Void> deleteDesign(@PathVariable Long id) {
        adminDesignService.delete(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/regions")
    public ApiResponse<List<RegionConfigDto>> regions() {
        return ApiResponse.ok(adminRegionService.listAll());
    }

    @PostMapping("/regions")
    public ApiResponse<RegionConfigDto> createRegion(@RequestBody RegionConfigDto dto) {
        return ApiResponse.ok(adminRegionService.create(dto));
    }

    @PutMapping("/regions/{code}")
    public ApiResponse<RegionConfigDto> updateRegion(@PathVariable String code,
                                                     @RequestBody RegionConfigDto dto) {
        return ApiResponse.ok(adminRegionService.update(code, dto));
    }

    @DeleteMapping("/regions/{code}")
    public ApiResponse<Void> deleteRegion(@PathVariable String code) {
        adminRegionService.delete(code);
        return ApiResponse.ok(null);
    }

    @PostMapping("/regions/refresh-cache")
    public ApiResponse<Void> refreshRegionCache() {
        adminRegionService.refreshCache();
        return ApiResponse.ok(null);
    }

    @GetMapping("/challenges")
    public ApiResponse<List<ChallengeConfigDto>> challenges() {
        return ApiResponse.ok(adminChallengeService.listAll());
    }

    @PostMapping("/challenges")
    public ApiResponse<ChallengeConfigDto> createChallenge(@RequestBody ChallengeConfigDto dto) {
        return ApiResponse.ok(adminChallengeService.create(dto));
    }

    @PutMapping("/challenges/{id}")
    public ApiResponse<ChallengeConfigDto> updateChallenge(@PathVariable String id,
                                                             @RequestBody ChallengeConfigDto dto) {
        return ApiResponse.ok(adminChallengeService.update(id, dto));
    }

    @DeleteMapping("/challenges/{id}")
    public ApiResponse<Void> deleteChallenge(@PathVariable String id) {
        adminChallengeService.delete(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/disaster-scenarios")
    public ApiResponse<List<DisasterScenarioDto>> disasterScenarios() {
        return ApiResponse.ok(adminDisasterScenarioService.listAll());
    }

    @PostMapping("/disaster-scenarios")
    public ApiResponse<DisasterScenarioDto> createDisasterScenario(@RequestBody DisasterScenarioDto dto) {
        return ApiResponse.ok(adminDisasterScenarioService.create(dto));
    }

    @PutMapping("/disaster-scenarios/{id}")
    public ApiResponse<DisasterScenarioDto> updateDisasterScenario(@PathVariable String id,
                                                                   @RequestBody DisasterScenarioDto dto) {
        return ApiResponse.ok(adminDisasterScenarioService.update(id, dto));
    }

    @DeleteMapping("/disaster-scenarios/{id}")
    public ApiResponse<Void> deleteDisasterScenario(@PathVariable String id) {
        adminDisasterScenarioService.delete(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/system/health")
    public ApiResponse<Map<String, Object>> systemHealth() {
        return ApiResponse.ok(adminSystemService.health());
    }

    @GetMapping("/system/stats")
    public ApiResponse<Map<String, Object>> systemStats() {
        return ApiResponse.ok(adminSystemService.stats());
    }

    @GetMapping("/system/config-summary")
    public ApiResponse<Map<String, Object>> configSummary() {
        return ApiResponse.ok(adminSystemService.configSummary());
    }
}
