package com.horizon.disaster.repository;

import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.entity.DisasterScenario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisasterScenarioRepository extends JpaRepository<DisasterScenario, String> {

    List<DisasterScenario> findByModeAndEnabledTrueOrderBySortOrderAsc(DisasterMode mode);

    List<DisasterScenario> findByEnabledTrueOrderBySortOrderAsc();
}
