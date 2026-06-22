package com.horizon.disaster.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DisasterMode {
    TYPHOON,
    EARTHQUAKE,
    TSUNAMI;

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static DisasterMode fromString(String value) {
        if (value == null || value.isBlank()) {
            return TYPHOON;
        }
        return switch (value.trim().toUpperCase()) {
            case "EARTHQUAKE" -> EARTHQUAKE;
            case "TSUNAMI" -> TSUNAMI;
            default -> TYPHOON;
        };
    }

    public String experienceId() {
        return toJson();
    }
}
