package com.horizon.user.repository;

import com.horizon.user.entity.AppUser;
import com.horizon.user.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);

    long countByUseYn(String useYn);

    @Query("""
            SELECT u FROM AppUser u
            WHERE (:loginId IS NULL OR LOWER(u.loginId) LIKE LOWER(CONCAT('%', :loginId, '%')))
              AND (:userName IS NULL OR LOWER(u.userName) LIKE LOWER(CONCAT('%', :userName, '%')))
              AND (:role IS NULL OR u.role = :role)
              AND (:useYn IS NULL OR u.useYn = :useYn)
            ORDER BY u.createdAt DESC
            """)
    Page<AppUser> searchAdmin(@Param("loginId") String loginId,
                              @Param("userName") String userName,
                              @Param("role") UserRole role,
                              @Param("useYn") String useYn,
                              Pageable pageable);
}
