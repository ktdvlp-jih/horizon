package com.horizon.auth.controller;

import com.horizon.auth.dto.LoginRequest;
import com.horizon.auth.dto.LoginResponse;
import com.horizon.auth.dto.MeResponse;
import com.horizon.auth.dto.SignupRequest;
import com.horizon.auth.dto.TokenRefreshRequest;
import com.horizon.auth.dto.TokenResponse;
import com.horizon.auth.service.AuthService;
import com.horizon.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ApiResponse<LoginResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ApiResponse.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@Valid @RequestBody TokenRefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        authService.logout();
        return ApiResponse.ok(null);
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me() {
        return ApiResponse.ok(authService.me());
    }
}
