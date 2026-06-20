package com.horizon.admin.audit.service;

import com.horizon.admin.audit.entity.AdminAuditLog;
import com.horizon.admin.audit.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminAuditLogService {

    private final AdminAuditLogRepository repository;

    @Transactional
    public void log(Long adminId, String action, String targetType, String targetId, String payloadJson) {
        repository.save(AdminAuditLog.create(adminId, action, targetType, targetId, payloadJson));
    }
}
