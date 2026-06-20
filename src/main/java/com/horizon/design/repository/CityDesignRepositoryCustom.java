package com.horizon.design.repository;

import com.horizon.design.entity.CityDesign;

import java.util.List;

public interface CityDesignRepositoryCustom {

    /**
     * Leaderboard: best (lowest deltaT) designs, optionally filtered by region.
     */
    List<CityDesign> findLeaderboard(String regionCode, int limit);

    List<CityDesign> findByOwnerId(Long ownerId);

    List<CityDesign> searchAdmin(String regionCode, String ownerLoginId, Boolean visibleOnLeaderboard,
                                 int offset, int limit);

    long countAdmin(String regionCode, String ownerLoginId, Boolean visibleOnLeaderboard);
}
