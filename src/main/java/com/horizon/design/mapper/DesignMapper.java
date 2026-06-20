package com.horizon.design.mapper;

import com.horizon.design.dto.DesignSummary;
import com.horizon.design.entity.CityDesign;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DesignMapper {

    DesignSummary toSummary(CityDesign entity);
}
