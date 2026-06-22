package com.horizon.disaster.service;

import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.dto.ScenarioSummary;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.disaster.repository.DisasterScenarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DisasterScenarioService {

    private final DisasterScenarioRepository repository;

    @Transactional(readOnly = true)
    public List<ScenarioSummary> listByMode(DisasterMode mode) {
        return repository.findByModeAndEnabledTrueOrderBySortOrderAsc(mode).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public DisasterScenario getRequired(String id) {
        return repository.findById(id)
                .filter(DisasterScenario::isEnabled)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "시나리오를 찾을 수 없습니다."));
    }

    private ScenarioSummary toSummary(DisasterScenario s) {
        return new ScenarioSummary(
                s.getId(),
                s.getMode(),
                s.getTitle(),
                s.getDescription(),
                s.getSourceEventId(),
                s.getRegionCode()
        );
    }
}
