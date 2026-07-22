package com.A2B.dashboardbackend.users;

import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class UserSpecifications {

    private UserSpecifications() {
    }

    public static Specification<User> matching(UserListFilter filter, UUID excludedRoleId) {
        return (root, query, cb) -> {
            var predicate = excludedRoleId != null
                    ? cb.notEqual(root.get("roleId"), excludedRoleId)
                    : cb.conjunction();

            if (filter.userName() != null && !filter.userName().isBlank()) {
                predicate = cb.and(predicate, cb.like(root.get("userName"), "%" + filter.userName() + "%"));
            }
            if (filter.mobile() != null && !filter.mobile().isBlank()) {
                predicate = cb.and(predicate, cb.like(root.get("mobile"), "%" + filter.mobile() + "%"));
            }
            if (filter.email() != null && !filter.email().isBlank()) {
                predicate = cb.and(predicate, cb.like(root.get("email"), "%" + filter.email() + "%"));
            }

            return predicate;
        };
    }
}
