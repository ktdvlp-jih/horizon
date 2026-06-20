package com.horizon.user.mapper;

import com.horizon.auth.dto.MeResponse;
import com.horizon.user.entity.AppUser;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(source = "id", target = "userId")
    MeResponse toMeResponse(AppUser user);
}
