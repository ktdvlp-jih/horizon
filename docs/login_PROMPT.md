# Spring Boot JWT 로그인 기능 구현 요청

당신은 시니어 Spring Boot 백엔드 개발자입니다.

아래 기술 스택을 기반으로 JWT 인증/인가 로그인 기능을 설계하고 구현해주세요.

> **관련:** 관리자 콘솔(`ROLE_ADMIN`, `/api/admin/**`)은 별도 Vite 앱 `frontend-admin/`(dev `:5174`)으로 구현되어 있습니다.

---

# 기술 스택

| 기술              | 버전          | 비고                         |
| --------------- | ----------- | -------------------------- |
| Java            | 21 (LTS)    | Records, Virtual Thread 대비 |
| Spring Boot     | 3.5.0       | Jakarta EE 기반              |
| Gradle          | 8.10.2      | Kotlin DSL                 |
| PostgreSQL      | 17          |                            |
| Spring Data JPA | 최신          |                            |
| QueryDSL        | 5.1.0       | jakarta classifier         |
| MapStruct       | 1.5.5.Final | DTO ↔ Entity 매핑            |
| Lombok          | 최신 BOM      |                            |

---

# 패키지 구조

```text
com.example.project

 ├─ config
 ├─ exception
 ├─ util

 ├─ auth
 │   ├─ controller
 │   ├─ service
 │   ├─ repository
 │   ├─ entity
 │   ├─ dto
 │   └─ mapper

 └─ user
     ├─ controller
     ├─ service
     ├─ repository
     ├─ entity
     ├─ dto
     └─ mapper
```

---

# 구현 목표

JWT 기반 인증 시스템 구축

구성

* Access Token
* Refresh Token
* Spring Security 6
* Stateless 인증 방식

---

# 회원 테이블

PostgreSQL 기준

```sql
CREATE TABLE tb_user (
    user_id BIGSERIAL PRIMARY KEY,
    login_id VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    use_yn CHAR(1) NOT NULL DEFAULT 'Y',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

# Refresh Token 테이블

```sql
CREATE TABLE tb_refresh_token (
    token_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token VARCHAR(1000) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

# 기능 요구사항

## 1. 로그인

### API

```http
POST /api/auth/login
```

### Request

```json
{
  "loginId": "admin",
  "password": "1234"
}
```

### Response

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "userId": 1,
  "userName": "관리자",
  "role": "ADMIN"
}
```

---

## 2. 토큰 재발급

### API

```http
POST /api/auth/refresh
```

### Request

```json
{
  "refreshToken": "refresh-token"
}
```

### Response

```json
{
  "accessToken": "new-access-token"
}
```

---

## 3. 로그아웃

### API

```http
POST /api/auth/logout
```

### Header

```http
Authorization: Bearer access-token
```

### 처리 내용

* Refresh Token 삭제
* 재사용 불가 처리
* 로그아웃 후 Access Token 사용 시 인증 실패

---

# 비밀번호 정책

반드시 BCrypt 사용

```java
BCryptPasswordEncoder
```

요구사항

* 평문 저장 금지
* 회원가입 시 암호화 저장
* 로그인 시 BCrypt 비교

---

# JWT 정책

Access Token

* 만료시간 30분

Refresh Token

* 만료시간 14일

Claims

```json
{
  "userId": 1,
  "loginId": "admin",
  "role": "ADMIN"
}
```

---

# Security 정책

Spring Security 6 기준

허용 URL

```text
/api/auth/**
```

인증 필요 URL

```text
/api/**
```

세션 사용 금지

```java
SessionCreationPolicy.STATELESS
```

CSRF 비활성화

```java
csrf.disable()
```

PasswordEncoder Bean 등록

```java
BCryptPasswordEncoder
```

---

# JPA 요구사항

* Spring Data JPA 사용
* QueryDSL 설정 포함
* BaseEntity 생성
* createdAt 자동 생성
* updatedAt 자동 수정
* Auditing 적용

---

# 예외 처리

공통 응답 구조

```json
{
  "success": false,
  "code": "AUTH_001",
  "message": "아이디 또는 비밀번호가 올바르지 않습니다."
}
```

예외 목록

* USER_NOT_FOUND
* INVALID_PASSWORD
* TOKEN_EXPIRED
* INVALID_TOKEN
* ACCESS_DENIED
* INTERNAL_SERVER_ERROR

---

# application.yml 예시 작성

```yaml
jwt:
  secret-key: your-secret-key
  access-token-expiration: 1800
  refresh-token-expiration: 1209600
```

---

# 구현해야 할 클래스

```text
BaseEntity

UserEntity
RefreshTokenEntity

UserRepository
RefreshTokenRepository

LoginRequest
LoginResponse
RefreshTokenRequest

JwtProvider
JwtAuthenticationFilter

CustomUserDetails
CustomUserDetailsService

SecurityConfig

AuthService
AuthController

GlobalExceptionHandler
```

---

# 응답 형식

아래 순서로 출력

1. build.gradle.kts
2. Entity
3. DTO
4. Repository
5. SecurityConfig
6. JwtProvider
7. JwtAuthenticationFilter
8. CustomUserDetails
9. CustomUserDetailsService
10. AuthService
11. AuthController
12. Exception
13. application.yml
14. 전체 프로젝트 구조

모든 코드는 Java 21 + Spring Boot 3.5.0 기준으로 실제 컴파일 가능한 수준으로 작성해주세요.

---

# 추가 요구사항 (실무형)

아래 기능도 함께 설계해주세요.

* 로그인 실패 5회 계정 잠금
* 최근 로그인 시간 저장
* 비밀번호 변경일 저장
* Refresh Token Rotation 적용
* JWT BlackList 구조 설계
* Redis 사용 시 확장 가능하도록 설계
* 감사 로그(Audit Log) 확장 가능 구조
* QueryDSL 설정
* MapStruct Mapper 작성
* 단위 테스트 예제 포함
* Swagger(OpenAPI) 적용
* Docker 환경 고려

```
```
