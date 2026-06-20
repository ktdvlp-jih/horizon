package com.horizon.settings.service;

import com.horizon.settings.dto.ChallengeConfigDto;
import com.horizon.settings.entity.ChallengeConfig;
import com.horizon.settings.repository.ChallengeConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChallengeService {

    private final ChallengeConfigRepository challengeConfigRepository;

    @Transactional(readOnly = true)
    public List<ChallengeConfigDto> listEnabled(String experienceId) {
        return challengeConfigRepository.findByExperienceIdAndEnabledTrueOrderBySortOrderAsc(experienceId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChallengeConfigDto> listAll() {
        return challengeConfigRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    public ChallengeConfigDto toDto(ChallengeConfig c) {
        return new ChallengeConfigDto(
                c.getId(),
                c.getExperienceId(),
                c.getTitle(),
                c.getDescription(),
                c.getRuleType(),
                c.getThreshold(),
                c.getRuleParamsJson(),
                c.isEnabled(),
                c.getSortOrder()
        );
    }
}
