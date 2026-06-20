package com.horizon.auth.util;

import com.horizon.auth.security.CustomUserDetails;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class AuthUtil {

    private AuthUtil() {
    }

    public static CustomUserDetails currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails details)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return details;
    }

    public static Long currentUserId() {
        return currentUser().getUserId();
    }
}
