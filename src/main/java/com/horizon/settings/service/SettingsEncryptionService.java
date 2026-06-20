package com.horizon.settings.service;

import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Slf4j
@Service
public class SettingsEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final byte[] keyBytes;

    public SettingsEncryptionService(
            @Value("${horizon.settings.encryption-key:horizon-dev-settings-key-32b!}") String encryptionKey) {
        this.keyBytes = normalizeKey(encryptionKey);
        if (encryptionKey.contains("horizon-dev-settings-key")) {
            log.warn("Using default HORIZON_SETTINGS_ENCRYPTION_KEY — change in production");
        }
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
            buffer.put(iv);
            buffer.put(encrypted);
            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "설정 암호화에 실패했습니다.");
        }
    }

    public String decrypt(String cipherText) {
        if (cipherText == null || cipherText.isBlank()) {
            return null;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(cipherText);
            ByteBuffer buffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[GCM_IV_LENGTH];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "설정 복호화에 실패했습니다.");
        }
    }

    public String maskApiKey(String plainOrNull) {
        if (plainOrNull == null || plainOrNull.isBlank()) {
            return null;
        }
        if (plainOrNull.length() <= 4) {
            return "****";
        }
        return "****" + plainOrNull.substring(plainOrNull.length() - 4);
    }

    public boolean isMaskedPlaceholder(String value) {
        return value != null && value.startsWith("****");
    }

    private static byte[] normalizeKey(String key) {
        byte[] raw = key.getBytes(StandardCharsets.UTF_8);
        byte[] normalized = new byte[32];
        for (int i = 0; i < 32; i++) {
            normalized[i] = i < raw.length ? raw[i] : 0;
        }
        return normalized;
    }
}
