package com.horizon.admin.dto;

import com.horizon.user.entity.UserRole;

import java.time.LocalDateTime;

public record AdminUserDetail(
        Long userId,
        String loginId,
        String userName,
        String email,
        UserRole role,
        String useYn,
        int loginFailCount,
        LocalDateTime lockedUntil,
        LocalDateTime lastLoginAt,
        LocalDateTime passwordChangedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
