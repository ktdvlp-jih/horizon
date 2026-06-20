package com.horizon.auth.service;

import com.horizon.auth.config.JwtProperties;
import com.horizon.auth.dto.LoginRequest;
import com.horizon.auth.dto.LoginResponse;
import com.horizon.auth.dto.MeResponse;
import com.horizon.auth.dto.SignupRequest;
import com.horizon.auth.dto.TokenRefreshRequest;
import com.horizon.auth.dto.TokenResponse;
import com.horizon.auth.entity.RefreshToken;
import com.horizon.auth.repository.RefreshTokenRepository;
import com.horizon.auth.security.CustomUserDetails;
import com.horizon.auth.security.CustomUserDetailsService;
import com.horizon.auth.security.JwtProvider;
import com.horizon.auth.util.AuthUtil;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.user.entity.AppUser;
import com.horizon.user.entity.UserRole;
import com.horizon.user.mapper.UserMapper;
import com.horizon.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 30;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final UserMapper userMapper;
    private final CustomUserDetailsService userDetailsService;

    @Transactional
    public LoginResponse signup(SignupRequest request) {
        if (userRepository.existsByLoginId(request.loginId())) {
            throw new BusinessException(ErrorCode.DUPLICATE_LOGIN_ID);
        }
        LocalDateTime now = LocalDateTime.now(KST);
        AppUser user = userRepository.save(AppUser.builder()
                .loginId(request.loginId())
                .password(passwordEncoder.encode(request.password()))
                .userName(request.userName())
                .email(blankToNull(request.email()))
                .role(UserRole.USER)
                .useYn("Y")
                .loginFailCount(0)
                .passwordChangedAt(now)
                .build());
        return issueTokens(user);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        LocalDateTime now = LocalDateTime.now(KST);
        AppUser user = userRepository.findByLoginId(request.loginId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        if (user.isLocked(now)) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        }
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            user.recordLoginFailure(now, MAX_LOGIN_ATTEMPTS, LOCK_MINUTES);
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }

        user.recordLoginSuccess(now);
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse refresh(TokenRefreshRequest request) {
        LocalDateTime now = LocalDateTime.now(KST);
        String rawToken = request.refreshToken();

        if (!jwtProvider.isRefreshToken(rawToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        RefreshToken stored = refreshTokenRepository.findByToken(rawToken)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));

        if (stored.isExpired(now)) {
            refreshTokenRepository.delete(stored);
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        }

        Long userId = jwtProvider.extractUserId(rawToken);
        if (!stored.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        AppUser user = userDetailsService.loadUserById(userId);
        if (!user.isActive()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        String newRefresh = jwtProvider.createRefreshToken(user);
        stored.rotate(newRefresh, now.plusSeconds(jwtProperties.refreshTokenExpiration()));
        String newAccess = jwtProvider.createAccessToken(user);
        return new TokenResponse(newAccess, newRefresh);
    }

    @Transactional
    public void logout() {
        CustomUserDetails current = AuthUtil.currentUser();
        refreshTokenRepository.deleteByUserId(current.getUserId());
    }

    @Transactional(readOnly = true)
    public MeResponse me() {
        CustomUserDetails current = AuthUtil.currentUser();
        AppUser user = userDetailsService.loadUserById(current.getUserId());
        return userMapper.toMeResponse(user);
    }

    private LoginResponse issueTokens(AppUser user) {
        String accessToken = jwtProvider.createAccessToken(user);
        String refreshToken = jwtProvider.createRefreshToken(user);
        persistRefreshToken(user.getId(), refreshToken);
        return new LoginResponse(
                accessToken,
                refreshToken,
                user.getId(),
                user.getUserName(),
                user.getRole().name()
        );
    }

    private void persistRefreshToken(Long userId, String token) {
        LocalDateTime expiresAt = LocalDateTime.now(KST).plusSeconds(jwtProperties.refreshTokenExpiration());
        refreshTokenRepository.findByUserId(userId)
                .ifPresentOrElse(
                        existing -> existing.rotate(token, expiresAt),
                        () -> refreshTokenRepository.save(RefreshToken.builder()
                                .userId(userId)
                                .token(token)
                                .expiresAt(expiresAt)
                                .build())
                );
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
