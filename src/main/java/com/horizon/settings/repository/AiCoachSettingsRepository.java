package com.horizon.settings.repository;

import com.horizon.settings.entity.AiCoachSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiCoachSettingsRepository extends JpaRepository<AiCoachSettings, Short> {
}
