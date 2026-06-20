package com.horizon.admin.service;

import com.horizon.admin.audit.service.AdminAuditLogService;
import com.horizon.admin.dto.AdminResetPasswordRequest;
import com.horizon.admin.dto.AdminUserDetail;
import com.horizon.admin.dto.AdminUserPatchRequest;
import com.horizon.admin.dto.AdminUserSummary;
import com.horizon.auth.repository.RefreshTokenRepository;
import com.horizon.auth.util.AuthUtil;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.common.response.PageResponse;
import com.horizon.user.entity.AppUser;
import com.horizon.user.entity.UserRole;
import com.horizon.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditLogService auditLogService;

    @Transactional(readOnly = true)
    public PageResponse<AdminUserSummary> list(String loginId, String userName, UserRole role, String useYn,
                                             int page, int size) {
        Page<AppUser> result = userRepository.searchAdmin(
                blankToNull(loginId),
                blankToNull(userName),
                role,
                blankToNull(useYn),
                PageRequest.of(page, size));
        return PageResponse.from(result.map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public AdminUserDetail get(Long userId) {
        return toDetail(findUser(userId));
    }

    @Transactional
    public AdminUserDetail patch(Long userId, AdminUserPatchRequest request) {
        AppUser user = findUser(userId);
        Long adminId = AuthUtil.currentUserId();

        if (request.role() != null) {
            if (user.getId().equals(adminId) && request.role() != UserRole.ADMIN) {
                throw new BusinessException(ErrorCode.ACCESS_DENIED, "자신의 관리자 권한은 해제할 수 없습니다.");
            }
            user.updateRole(request.role());
        }
        if (request.useYn() != null) {
            user.updateUseYn(request.useYn());
        }
        if (Boolean.TRUE.equals(request.unlock())) {
            user.resetLoginFailures();
        }

        auditLogService.log(adminId, "USER_PATCH", "USER", String.valueOf(userId), null);
        return toDetail(user);
    }

    @Transactional
    public void resetPassword(Long userId, AdminResetPasswordRequest request) {
        if (request.newPassword() == null || request.newPassword().length() < 8) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "비밀번호는 8자 이상이어야 합니다.");
        }
        AppUser user = findUser(userId);
        user.resetPassword(passwordEncoder.encode(request.newPassword()), LocalDateTime.now());
        refreshTokenRepository.deleteByUserId(userId);
        auditLogService.log(AuthUtil.currentUserId(), "USER_RESET_PASSWORD", "USER", String.valueOf(userId), null);
    }

    private AppUser findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    private AdminUserSummary toSummary(AppUser u) {
        return new AdminUserSummary(
                u.getId(), u.getLoginId(), u.getUserName(), u.getEmail(), u.getRole(), u.getUseYn(),
                u.getLoginFailCount(), u.getLockedUntil(), u.getLastLoginAt(), u.getCreatedAt());
    }

    private AdminUserDetail toDetail(AppUser u) {
        return new AdminUserDetail(
                u.getId(), u.getLoginId(), u.getUserName(), u.getEmail(), u.getRole(), u.getUseYn(),
                u.getLoginFailCount(), u.getLockedUntil(), u.getLastLoginAt(), u.getPasswordChangedAt(),
                u.getCreatedAt(), u.getUpdatedAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
