package com.horizon.disaster.entity;

import com.horizon.common.entity.BaseEntity;
import com.horizon.disaster.dto.DisasterMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "disaster_scenario")
public class DisasterScenario extends BaseEntity {

    @Id
    @Column(length = 80)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DisasterMode mode;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "source_event_id", length = 80)
    private String sourceEventId;

    @Column(name = "params_json", nullable = false, columnDefinition = "text")
    private String paramsJson;

    @Column(name = "region_code", length = 50)
    private String regionCode;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public DisasterScenario(String id, DisasterMode mode, String title, String description,
                            String sourceEventId, String paramsJson, String regionCode,
                            boolean enabled, int sortOrder) {
        this.id = id;
        this.mode = mode;
        this.title = title;
        this.description = description;
        this.sourceEventId = sourceEventId;
        this.paramsJson = paramsJson;
        this.regionCode = regionCode;
        this.enabled = enabled;
        this.sortOrder = sortOrder;
    }

    public void update(String title, String description, String paramsJson, String regionCode,
                       boolean enabled, int sortOrder) {
        this.title = title;
        this.description = description;
        this.paramsJson = paramsJson;
        this.regionCode = regionCode;
        this.enabled = enabled;
        this.sortOrder = sortOrder;
    }
}
