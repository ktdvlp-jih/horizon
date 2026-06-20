package com.horizon.design.repository;

import com.horizon.design.entity.CityDesign;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityDesignRepository extends JpaRepository<CityDesign, Long>, CityDesignRepositoryCustom {
}
