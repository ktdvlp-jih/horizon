package com.horizon.admin.service;

import com.horizon.admin.dto.DisasterScenarioDto;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.disaster.repository.DisasterScenarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminDisasterScenarioService {

    private final DisasterScenarioRepository repository;

    @Transactional(readOnly = true)
    public List<DisasterScenarioDto> listAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public DisasterScenarioDto create(DisasterScenarioDto dto) {
        if (repository.existsById(dto.id())) {
            throw new BusinessException(ErrorCode.DUPLICATE_LOGIN_ID, "시나리오 ID가 이미 있습니다.");
        }
        return toDto(repository.save(toEntity(dto)));
    }

    @Transactional
    public DisasterScenarioDto update(String id, DisasterScenarioDto dto) {
        DisasterScenario s = find(id);
        s.update(dto.title(), dto.description(), dto.paramsJson(), dto.regionCode(), dto.enabled(), dto.sortOrder());
        return toDto(s);
    }

    @Transactional
    public void delete(String id) {
        repository.deleteById(id);
    }

    private DisasterScenario find(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "시나리오를 찾을 수 없습니다."));
    }

    private DisasterScenarioDto toDto(DisasterScenario s) {
        return new DisasterScenarioDto(
                s.getId(), s.getMode(), s.getTitle(), s.getDescription(),
                s.getSourceEventId(), s.getParamsJson(), s.getRegionCode(),
                s.isEnabled(), s.getSortOrder()
        );
    }

    private DisasterScenario toEntity(DisasterScenarioDto dto) {
        return DisasterScenario.builder()
                .id(dto.id())
                .mode(dto.mode())
                .title(dto.title())
                .description(dto.description())
                .sourceEventId(dto.sourceEventId())
                .paramsJson(dto.paramsJson())
                .regionCode(dto.regionCode())
                .enabled(dto.enabled())
                .sortOrder(dto.sortOrder())
                .build();
    }
}
