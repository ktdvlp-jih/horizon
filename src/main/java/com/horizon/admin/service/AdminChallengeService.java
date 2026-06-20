package com.horizon.admin.service;

import com.horizon.admin.audit.service.AdminAuditLogService;
import com.horizon.auth.util.AuthUtil;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.settings.dto.ChallengeConfigDto;
import com.horizon.settings.entity.ChallengeConfig;
import com.horizon.settings.repository.ChallengeConfigRepository;
import com.horizon.settings.service.ChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminChallengeService {

    private final ChallengeConfigRepository challengeConfigRepository;
    private final ChallengeService challengeService;
    private final AdminAuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<ChallengeConfigDto> listAll() {
        return challengeService.listAll();
    }

    @Transactional
    public ChallengeConfigDto create(ChallengeConfigDto dto) {
        if (challengeConfigRepository.existsById(dto.id())) {
            throw new BusinessException(ErrorCode.DUPLICATE_LOGIN_ID, "이미 존재하는 챌린지 ID입니다.");
        }
        ChallengeConfig saved = challengeConfigRepository.save(toEntity(dto));
        auditLogService.log(AuthUtil.currentUserId(), "CHALLENGE_CREATE", "CHALLENGE", dto.id(), null);
        return challengeService.toDto(saved);
    }

    @Transactional
    public ChallengeConfigDto update(String id, ChallengeConfigDto dto) {
        ChallengeConfig challenge = find(id);
        challenge.update(dto.title(), dto.description(), dto.ruleType(), dto.threshold(),
                dto.ruleParamsJson(), dto.enabled(), dto.sortOrder());
        auditLogService.log(AuthUtil.currentUserId(), "CHALLENGE_UPDATE", "CHALLENGE", id, null);
        return challengeService.toDto(challenge);
    }

    @Transactional
    public void delete(String id) {
        ChallengeConfig challenge = find(id);
        challenge.update(challenge.getTitle(), challenge.getDescription(), challenge.getRuleType(),
                challenge.getThreshold(), challenge.getRuleParamsJson(), false, challenge.getSortOrder());
        auditLogService.log(AuthUtil.currentUserId(), "CHALLENGE_DISABLE", "CHALLENGE", id, null);
    }

    private ChallengeConfig find(String id) {
        return challengeConfigRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "챌린지를 찾을 수 없습니다."));
    }

    private ChallengeConfig toEntity(ChallengeConfigDto dto) {
        return ChallengeConfig.builder()
                .id(dto.id())
                .experienceId(dto.experienceId())
                .title(dto.title())
                .description(dto.description())
                .ruleType(dto.ruleType())
                .threshold(dto.threshold())
                .ruleParamsJson(dto.ruleParamsJson())
                .enabled(dto.enabled())
                .sortOrder(dto.sortOrder())
                .build();
    }
}
