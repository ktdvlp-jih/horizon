package com.horizon.settings.repository;

import com.horizon.settings.entity.ChallengeConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChallengeConfigRepository extends JpaRepository<ChallengeConfig, String> {

    List<ChallengeConfig> findByExperienceIdAndEnabledTrueOrderBySortOrderAsc(String experienceId);

    List<ChallengeConfig> findAllByOrderBySortOrderAsc();
}
