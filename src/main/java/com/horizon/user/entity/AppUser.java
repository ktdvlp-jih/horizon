package com.horizon.user.entity;

import com.horizon.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "app_user")
public class AppUser extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(name = "login_id", nullable = false, unique = true, length = 50)
    private String loginId;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "user_name", nullable = false, length = 100)
    private String userName;

    @Column(length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(name = "use_yn", nullable = false, length = 1)
    private String useYn;

    @Column(name = "login_fail_count", nullable = false)
    private int loginFailCount;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "password_changed_at")
    private LocalDateTime passwordChangedAt;

    public AppUser(Long id, String loginId, String password, String userName, String email,
                   UserRole role, String useYn, int loginFailCount, LocalDateTime lockedUntil,
                   LocalDateTime lastLoginAt, LocalDateTime passwordChangedAt) {
        this.id = id;
        this.loginId = loginId;
        this.password = password;
        this.userName = userName;
        this.email = email;
        this.role = role;
        this.useYn = useYn;
        this.loginFailCount = loginFailCount;
        this.lockedUntil = lockedUntil;
        this.lastLoginAt = lastLoginAt;
        this.passwordChangedAt = passwordChangedAt;
    }

    public boolean isActive() {
        return "Y".equals(useYn);
    }

    public boolean isLocked(LocalDateTime now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    public void recordLoginSuccess(LocalDateTime now) {
        this.loginFailCount = 0;
        this.lockedUntil = null;
        this.lastLoginAt = now;
    }

    public void recordLoginFailure(LocalDateTime now, int maxAttempts, int lockMinutes) {
        this.loginFailCount++;
        if (this.loginFailCount >= maxAttempts) {
            this.lockedUntil = now.plusMinutes(lockMinutes);
        }
    }

    public void resetLoginFailures() {
        this.loginFailCount = 0;
        this.lockedUntil = null;
    }
}
