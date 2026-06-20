package com.horizon.auth.security;

import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.user.entity.AppUser;
import com.horizon.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user = userRepository.findByLoginId(username)
                .orElseThrow(() -> new UsernameNotFoundException(username));
        return new CustomUserDetails(user);
    }

    @Transactional(readOnly = true)
    public AppUser loadUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
