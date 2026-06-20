package com.horizon.admin.service;

import com.horizon.admin.audit.service.AdminAuditLogService;
import com.horizon.admin.dto.RegionConfigDto;
import com.horizon.auth.util.AuthUtil;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.design.repository.CityDesignRepository;
import com.horizon.settings.entity.RegionConfig;
import com.horizon.settings.repository.RegionConfigRepository;
import com.horizon.weather.service.WeatherDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminRegionService {

    private final RegionConfigRepository regionConfigRepository;
    private final CityDesignRepository cityDesignRepository;
    private final WeatherDataService weatherDataService;
    private final AdminAuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<RegionConfigDto> listAll() {
        return regionConfigRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public RegionConfigDto create(RegionConfigDto dto) {
        if (regionConfigRepository.existsById(dto.code())) {
            throw new BusinessException(ErrorCode.DUPLICATE_LOGIN_ID, "이미 존재하는 지역 코드입니다.");
        }
        RegionConfig saved = regionConfigRepository.save(toEntity(dto));
        auditLogService.log(AuthUtil.currentUserId(), "REGION_CREATE", "REGION", dto.code(), null);
        weatherDataService.invalidateCache();
        return toDto(saved);
    }

    @Transactional
    public RegionConfigDto update(String code, RegionConfigDto dto) {
        RegionConfig region = find(code);
        region.update(dto.name(), dto.kmaStation(), dto.sampleTemp(), dto.sampleSolar(), dto.enabled(),
                dto.sortOrder(), dto.coastalExposure(), dto.seismicZone(), dto.elevationProfileJson());
        auditLogService.log(AuthUtil.currentUserId(), "REGION_UPDATE", "REGION", code, null);
        weatherDataService.invalidateCache();
        return toDto(region);
    }

    @Transactional
    public void delete(String code) {
        if (cityDesignRepository.countAdmin(code, null, null) > 0) {
            RegionConfig region = find(code);
            region.update(region.getName(), region.getKmaStation(), region.getSampleTemp(),
                    region.getSampleSolar(), false, region.getSortOrder(),
                    region.getCoastalExposure(), region.getSeismicZone(), region.getElevationProfileJson());
            auditLogService.log(AuthUtil.currentUserId(), "REGION_DISABLE", "REGION", code, null);
        } else {
            regionConfigRepository.deleteById(code);
            auditLogService.log(AuthUtil.currentUserId(), "REGION_DELETE", "REGION", code, null);
        }
        weatherDataService.invalidateCache();
    }

    public void refreshCache() {
        weatherDataService.invalidateCache();
    }

    private RegionConfig find(String code) {
        return regionConfigRepository.findById(code)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "지역을 찾을 수 없습니다."));
    }

    private RegionConfigDto toDto(RegionConfig r) {
        return new RegionConfigDto(r.getCode(), r.getName(), r.getKmaStation(),
                r.getSampleTemp(), r.getSampleSolar(), r.isEnabled(), r.getSortOrder(),
                r.getCoastalExposure(), r.getSeismicZone(), r.getElevationProfileJson());
    }

    private RegionConfig toEntity(RegionConfigDto dto) {
        return RegionConfig.builder()
                .code(dto.code())
                .name(dto.name())
                .kmaStation(dto.kmaStation())
                .sampleTemp(dto.sampleTemp())
                .sampleSolar(dto.sampleSolar())
                .enabled(dto.enabled())
                .sortOrder(dto.sortOrder())
                .coastalExposure(dto.coastalExposure())
                .seismicZone(dto.seismicZone())
                .elevationProfileJson(dto.elevationProfileJson())
                .build();
    }
}
