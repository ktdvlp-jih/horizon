package com.horizon.design.repository;

import com.horizon.design.entity.CityDesign;
import com.horizon.design.entity.QCityDesign;
import com.horizon.user.entity.QAppUser;
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
        BooleanBuilder where = leaderboardFilter(design, regionCode);
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
                .where(design.ownerId.eq(ownerId).and(design.deletedAt.isNull()))
                .orderBy(design.createdAt.desc())
                .fetch();
    }

    @Override
    public List<CityDesign> searchAdmin(String regionCode, String ownerLoginId, Boolean visibleOnLeaderboard,
                                        int offset, int limit) {
        QCityDesign design = QCityDesign.cityDesign;
        QAppUser user = QAppUser.appUser;
        BooleanBuilder where = adminFilter(design, user, regionCode, ownerLoginId, visibleOnLeaderboard);
        return queryFactory.selectFrom(design)
                .leftJoin(user).on(design.ownerId.eq(user.id))
                .where(where)
                .orderBy(design.createdAt.desc())
                .offset(offset)
                .limit(limit)
                .fetch();
    }

    @Override
    public long countAdmin(String regionCode, String ownerLoginId, Boolean visibleOnLeaderboard) {
        QCityDesign design = QCityDesign.cityDesign;
        QAppUser user = QAppUser.appUser;
        BooleanBuilder where = adminFilter(design, user, regionCode, ownerLoginId, visibleOnLeaderboard);
        Long count = queryFactory.select(design.count())
                .from(design)
                .leftJoin(user).on(design.ownerId.eq(user.id))
                .where(where)
                .fetchOne();
        return count != null ? count : 0L;
    }

    private static BooleanBuilder leaderboardFilter(QCityDesign design, String regionCode) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(design.visibleOnLeaderboard.isTrue());
        where.and(design.deletedAt.isNull());
        if (regionCode != null && !regionCode.isBlank()) {
            where.and(design.regionCode.eq(regionCode));
        }
        return where;
    }

    private static BooleanBuilder adminFilter(QCityDesign design, QAppUser user, String regionCode,
                                              String ownerLoginId, Boolean visibleOnLeaderboard) {
        BooleanBuilder where = new BooleanBuilder();
        if (regionCode != null && !regionCode.isBlank()) {
            where.and(design.regionCode.eq(regionCode));
        }
        if (ownerLoginId != null && !ownerLoginId.isBlank()) {
            where.and(user.loginId.containsIgnoreCase(ownerLoginId));
        }
        if (visibleOnLeaderboard != null) {
            where.and(design.visibleOnLeaderboard.eq(visibleOnLeaderboard));
        }
        return where;
    }
}
