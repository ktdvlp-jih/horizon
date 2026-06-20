package com.horizon.settings.entity;

import com.horizon.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "region_config")
public class RegionConfig extends BaseEntity {

    @Id
    @Column(length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "kma_station", nullable = false, length = 20)
    private String kmaStation;

    @Column(name = "sample_temp", nullable = false)
    private double sampleTemp;

    @Column(name = "sample_solar", nullable = false)
    private double sampleSolar;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Builder.Default
    @Column(name = "coastal_exposure", nullable = false)
    private double coastalExposure = 0.35;

    @Builder.Default
    @Column(name = "seismic_zone", nullable = false)
    private int seismicZone = 2;

    @Column(name = "elevation_profile_json", columnDefinition = "text")
    private String elevationProfileJson;

    public RegionConfig(String code, String name, String kmaStation, double sampleTemp, double sampleSolar,
                        boolean enabled, int sortOrder, double coastalExposure, int seismicZone,
                        String elevationProfileJson) {
        this.code = code;
        this.name = name;
        this.kmaStation = kmaStation;
        this.sampleTemp = sampleTemp;
        this.sampleSolar = sampleSolar;
        this.enabled = enabled;
        this.sortOrder = sortOrder;
        this.coastalExposure = coastalExposure;
        this.seismicZone = seismicZone;
        this.elevationProfileJson = elevationProfileJson;
    }

    public void update(String name, String kmaStation, double sampleTemp, double sampleSolar,
                       boolean enabled, int sortOrder, double coastalExposure, int seismicZone,
                       String elevationProfileJson) {
        this.name = name;
        this.kmaStation = kmaStation;
        this.sampleTemp = sampleTemp;
        this.sampleSolar = sampleSolar;
        this.enabled = enabled;
        this.sortOrder = sortOrder;
        this.coastalExposure = coastalExposure;
        this.seismicZone = seismicZone;
        this.elevationProfileJson = elevationProfileJson;
    }
}
