package com.horizon.admin.dto;

import com.horizon.user.entity.UserRole;

public record AdminUserPatchRequest(
        UserRole role,
        String useYn,
        Boolean unlock
) {
}
