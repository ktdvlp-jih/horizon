package com.horizon.settings.repository;

import com.horizon.settings.entity.RegionConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RegionConfigRepository extends JpaRepository<RegionConfig, String> {

    List<RegionConfig> findByEnabledTrueOrderBySortOrderAsc();

    List<RegionConfig> findAllByOrderBySortOrderAsc();
}
