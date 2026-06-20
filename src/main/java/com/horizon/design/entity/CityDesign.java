package com.horizon.design.entity;

import com.horizon.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
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
@Table(name = "city_design")
public class CityDesign extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "region_code", nullable = false)
    private String regionCode;

    @Column(name = "grid_json", nullable = false, columnDefinition = "text")
    private String gridJson;

    @Column(name = "grid_size", nullable = false)
    private int gridSize;

    @Column(name = "avg_surface_temp", nullable = false)
    private double avgSurfaceTemp;

    @Column(name = "delta_t", nullable = false)
    private double deltaT;

    @Column(name = "green_ratio", nullable = false)
    private double greenRatio;

    @Column(name = "owner_id")
    private Long ownerId;

    public CityDesign(Long id, String name, String regionCode, String gridJson,
                      int gridSize, double avgSurfaceTemp, double deltaT, double greenRatio, Long ownerId) {
        this.id = id;
        this.name = name;
        this.regionCode = regionCode;
        this.gridJson = gridJson;
        this.gridSize = gridSize;
        this.avgSurfaceTemp = avgSurfaceTemp;
        this.deltaT = deltaT;
        this.greenRatio = greenRatio;
        this.ownerId = ownerId;
    }
}
