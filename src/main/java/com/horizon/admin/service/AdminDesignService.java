package com.horizon.admin.service;

import com.horizon.admin.audit.service.AdminAuditLogService;
import com.horizon.admin.dto.AdminDesignPatchRequest;
import com.horizon.admin.dto.AdminDesignSummary;
import com.horizon.auth.util.AuthUtil;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.common.response.PageResponse;
import com.horizon.design.dto.DesignDetail;
import com.horizon.design.entity.CityDesign;
import com.horizon.design.repository.CityDesignRepository;
import com.horizon.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDesignService {

    private final CityDesignRepository designRepository;
    private final UserRepository userRepository;
    private final AdminAuditLogService auditLogService;
    private final AdminDesignDetailMapper detailMapper;

    @Transactional(readOnly = true)
    public PageResponse<AdminDesignSummary> list(String regionCode, String ownerLoginId,
                                                 Boolean visibleOnLeaderboard, int page, int size) {
        int offset = page * size;
        List<CityDesign> designs = designRepository.searchAdmin(
                blankToNull(regionCode), blankToNull(ownerLoginId), visibleOnLeaderboard, offset, size);
        long total = designRepository.countAdmin(
                blankToNull(regionCode), blankToNull(ownerLoginId), visibleOnLeaderboard);
        Map<Long, String> loginIds = resolveOwnerLoginIds(designs);
        List<AdminDesignSummary> content = designs.stream()
                .map(d -> toSummary(d, loginIds.get(d.getOwnerId())))
                .toList();
        int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
        return new PageResponse<>(content, page, size, total, totalPages);
    }

    @Transactional(readOnly = true)
    public DesignDetail get(Long id) {
        return detailMapper.toDetail(findDesign(id));
    }

    @Transactional
    public AdminDesignSummary patch(Long id, AdminDesignPatchRequest request) {
        CityDesign design = findDesign(id);
        if (request.visibleOnLeaderboard() != null) {
            design.setVisibleOnLeaderboard(request.visibleOnLeaderboard());
        }
        auditLogService.log(AuthUtil.currentUserId(), "DESIGN_PATCH", "DESIGN", String.valueOf(id),
                "{\"visibleOnLeaderboard\":" + design.isVisibleOnLeaderboard() + "}");
        return toSummary(design, resolveOwnerLoginId(design.getOwnerId()));
    }

    @Transactional
    public void delete(Long id) {
        CityDesign design = findDesign(id);
        design.softDelete();
        auditLogService.log(AuthUtil.currentUserId(), "DESIGN_DELETE", "DESIGN", String.valueOf(id), null);
    }

    private CityDesign findDesign(Long id) {
        CityDesign design = designRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "설계를 찾을 수 없습니다."));
        if (design.isDeleted()) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "설계를 찾을 수 없습니다.");
        }
        return design;
    }

    private Map<Long, String> resolveOwnerLoginIds(List<CityDesign> designs) {
        List<Long> ownerIds = designs.stream()
                .map(CityDesign::getOwnerId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        return userRepository.findAllById(ownerIds).stream()
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getLoginId()));
    }

    private String resolveOwnerLoginId(Long ownerId) {
        if (ownerId == null) {
            return null;
        }
        return userRepository.findById(ownerId).map(u -> u.getLoginId()).orElse(null);
    }

    private AdminDesignSummary toSummary(CityDesign d, String ownerLoginId) {
        return new AdminDesignSummary(
                d.getId(), d.getName(), d.getRegionCode(), d.getAvgSurfaceTemp(), d.getDeltaT(),
                d.getGreenRatio(), d.getOwnerId(), ownerLoginId, d.isVisibleOnLeaderboard(),
                d.getDeletedAt(), d.getCreatedAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
