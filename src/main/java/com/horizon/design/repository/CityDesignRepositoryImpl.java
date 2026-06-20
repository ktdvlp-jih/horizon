package com.horizon.design.repository;

import com.horizon.design.entity.CityDesign;
import com.horizon.design.entity.QCityDesign;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;

import java.util.List;

public class CityDesignRepositoryImpl implements CityDesignRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public CityDesignRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public List<CityDesign> findLeaderboard(String regionCode, int limit) {
        QCityDesign design = QCityDesign.cityDesign;
        BooleanBuilder where = new BooleanBuilder();
        if (regionCode != null && !regionCode.isBlank()) {
            where.and(design.regionCode.eq(regionCode));
        }
        return queryFactory.selectFrom(design)
                .where(where)
                .orderBy(design.deltaT.asc(), design.createdAt.desc())
                .limit(limit)
                .fetch();
    }

    @Override
    public List<CityDesign> findByOwnerId(Long ownerId) {
        QCityDesign design = QCityDesign.cityDesign;
        return queryFactory.selectFrom(design)
                .where(design.ownerId.eq(ownerId))
                .orderBy(design.createdAt.desc())
                .fetch();
    }
}
