package com.horizon.user.repository;

import com.horizon.user.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);
}
