package com.A2B.dashboardbackend.clientapidata;

import com.A2B.dashboardbackend.projects.Project;
import org.springframework.data.jpa.domain.Specification;

final class ClientApiDataSpecifications {

    private ClientApiDataSpecifications() {
    }

    static Specification<Project> matching(ClientApiDataListFilter filter) {
        return (root, query, cb) -> {
            var predicate = cb.equal(root.get("clientApiData"), 1);

            if (filter.search() != null && !filter.search().isBlank()) {
                String like = "%" + filter.search() + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(root.get("projectName"), like),
                        cb.like(root.get("surveyId"), like)
                ));
            }
            if (filter.approvedFilter() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("approved"), filter.approvedFilter()));
            }
            if (filter.countryId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("countryId"), filter.countryId()));
            }

            return predicate;
        };
    }
}
