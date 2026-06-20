package com.horizon.challenge.controller;

import com.horizon.common.response.ApiResponse;
import com.horizon.settings.dto.ChallengeConfigDto;
import com.horizon.settings.service.ChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/challenges")
@RequiredArgsConstructor
public class ChallengeController {

    private final ChallengeService challengeService;

    @GetMapping
    public ApiResponse<List<ChallengeConfigDto>> list(
            @RequestParam(defaultValue = "urban-climate") String experienceId
    ) {
        return ApiResponse.ok(challengeService.listEnabled(experienceId));
    }
}
