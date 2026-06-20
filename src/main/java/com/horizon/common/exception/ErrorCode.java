package com.horizon.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다."),
    USER_NOT_FOUND(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
    DUPLICATE_LOGIN_ID(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다."),
    ACCOUNT_LOCKED(HttpStatus.UNAUTHORIZED, "로그인 시도 횟수를 초과하여 계정이 잠겼습니다."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    AI_SERVICE_ERROR(HttpStatus.BAD_GATEWAY, "AI 서비스 호출에 실패했습니다."),
    WEATHER_SOURCE_ERROR(HttpStatus.BAD_GATEWAY, "기상 데이터 조회에 실패했습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() {
        return status;
    }

    public String defaultMessage() {
        return defaultMessage;
    }
}
