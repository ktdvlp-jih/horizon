package com.horizon.admin.dto;

public record RegionConfigDto(
        String code,
        String name,
        String kmaStation,
        double sampleTemp,
        double sampleSolar,
        boolean enabled,
        int sortOrder,
        double coastalExposure,
        int seismicZone,
        String elevationProfileJson
) {
}
