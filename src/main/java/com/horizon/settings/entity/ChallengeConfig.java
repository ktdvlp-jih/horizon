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
@Table(name = "challenge_config")
public class ChallengeConfig extends BaseEntity {

    @Id
    @Column(length = 80)
    private String id;

    @Column(name = "experience_id", nullable = false, length = 50)
    private String experienceId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "rule_type", nullable = false, length = 40)
    private String ruleType;

    @Column(name = "threshold")
    private Double threshold;

    @Column(name = "rule_params_json", columnDefinition = "text")
    private String ruleParamsJson;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public ChallengeConfig(String id, String experienceId, String title, String description,
                           String ruleType, Double threshold, String ruleParamsJson,
                           boolean enabled, int sortOrder) {
        this.id = id;
        this.experienceId = experienceId;
        this.title = title;
        this.description = description;
        this.ruleType = ruleType;
        this.threshold = threshold;
        this.ruleParamsJson = ruleParamsJson;
        this.enabled = enabled;
        this.sortOrder = sortOrder;
    }

    public void update(String title, String description, String ruleType, Double threshold,
                       String ruleParamsJson, boolean enabled, int sortOrder) {
        this.title = title;
        this.description = description;
        this.ruleType = ruleType;
        this.threshold = threshold;
        this.ruleParamsJson = ruleParamsJson;
        this.enabled = enabled;
        this.sortOrder = sortOrder;
    }
}
