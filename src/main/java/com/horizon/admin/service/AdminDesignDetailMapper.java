package com.horizon.admin.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.design.dto.DesignDetail;
import com.horizon.design.entity.CityDesign;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AdminDesignDetailMapper {

    private final ObjectMapper objectMapper;

    public DesignDetail toDetail(CityDesign design) {
        return new DesignDetail(
                design.getId(),
                design.getName(),
                design.getRegionCode(),
                design.getGridSize(),
                readGrid(design.getGridJson()),
                design.getAvgSurfaceTemp(),
                design.getDeltaT(),
                design.getGreenRatio(),
                design.getExperienceId(),
                design.getScenarioId(),
                design.getCreatedAt()
        );
    }

    private List<List<String>> readGrid(String gridJson) {
        try {
            return objectMapper.readValue(gridJson, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Grid JSON corrupted", e);
        }
    }
}
