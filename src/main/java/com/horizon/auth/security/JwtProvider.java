package com.horizon.auth.security;

import com.horizon.auth.config.JwtProperties;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.user.entity.AppUser;
import com.horizon.user.entity.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtProvider {

    private static final String CLAIM_USER_ID = "userId";
    private static final String CLAIM_LOGIN_ID = "loginId";
    private static final String CLAIM_ROLE = "role";
    private static final String TOKEN_TYPE = "tokenType";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";

    private final JwtProperties properties;
    private final SecretKey secretKey;

    public JwtProvider(JwtProperties properties) {
        this.properties = properties;
        this.secretKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(AppUser user) {
        return buildToken(user, ACCESS, properties.accessTokenExpiration());
    }

    public String createRefreshToken(AppUser user) {
        return buildToken(user, REFRESH, properties.refreshTokenExpiration());
    }

    private String buildToken(AppUser user, String tokenType, long expirationSeconds) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationSeconds * 1000L);
        return Jwts.builder()
                .claim(CLAIM_USER_ID, user.getId())
                .claim(CLAIM_LOGIN_ID, user.getLoginId())
                .claim(CLAIM_ROLE, user.getRole().name())
                .claim(TOKEN_TYPE, tokenType)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException ex) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
    }

    public boolean isAccessToken(String token) {
        return ACCESS.equals(parseClaims(token).get(TOKEN_TYPE, String.class));
    }

    public boolean isRefreshToken(String token) {
        return REFRESH.equals(parseClaims(token).get(TOKEN_TYPE, String.class));
    }

    public Long extractUserId(String token) {
        Number userId = parseClaims(token).get(CLAIM_USER_ID, Number.class);
        return userId.longValue();
    }

    public String extractLoginId(String token) {
        return parseClaims(token).get(CLAIM_LOGIN_ID, String.class);
    }

    public UserRole extractRole(String token) {
        return UserRole.valueOf(parseClaims(token).get(CLAIM_ROLE, String.class));
    }
}
