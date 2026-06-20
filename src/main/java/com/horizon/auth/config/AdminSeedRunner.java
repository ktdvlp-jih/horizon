package com.horizon.auth.config;

import com.horizon.user.entity.AppUser;
import com.horizon.user.entity.UserRole;
import com.horizon.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminSeedRunner implements CommandLineRunner {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${horizon.auth.seed-admin:false}")
    private boolean seedAdmin;

    @Override
    public void run(String... args) {
        if (!seedAdmin || userRepository.existsByLoginId("admin")) {
            return;
        }
        LocalDateTime now = LocalDateTime.now(KST);
        userRepository.save(AppUser.builder()
                .loginId("admin")
                .password(passwordEncoder.encode("admin1234"))
                .userName("관리자")
                .role(UserRole.ADMIN)
                .useYn("Y")
                .loginFailCount(0)
                .passwordChangedAt(now)
                .build());
        log.info("Demo admin account seeded (loginId=admin)");
    }
}
