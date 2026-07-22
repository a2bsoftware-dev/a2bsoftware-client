package com.A2B.dashboardbackend.projects;

import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.UUID;

public final class ProjectSpecifications {

    private ProjectSpecifications() {
    }

    public static Specification<StartSurveyInformation> matchingSurveyDetails(SurveyDetailFilter filter, List<UUID> restrictToPids) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();

            if (filter.projectId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("pid"), filter.projectId()));
            }
            if (filter.status() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), filter.status()));
            }
            if (filter.gid() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("gid"), filter.gid()));
            }
            if (restrictToPids != null) {
                predicate = cb.and(predicate, restrictToPids.isEmpty()
                        ? cb.disjunction()
                        : root.get("pid").in(restrictToPids));
            }

            return predicate;
        };
    }

    public static Specification<Project> matching(ProjectListFilter filter) {
        return (root, query, cb) -> {
            var predicate = cb.conjunction();

            if (filter.id() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("id"), filter.id()));
            }
            if (filter.parentProjectId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("parentProjectId"), filter.parentProjectId()));
            }
            if (filter.projectName() != null && !filter.projectName().isBlank()) {
                predicate = cb.and(predicate, cb.like(root.get("projectName"), "%" + filter.projectName() + "%"));
            }
            if (filter.status() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), filter.status()));
            }
            if (filter.clientId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("clientId"), filter.clientId()));
            }
            if (filter.projectManagerId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("projectManagerId"), filter.projectManagerId()));
            }
            if (filter.countryId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("countryId"), filter.countryId()));
            }
            if (filter.salesManagerId() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("salesManagerId"), filter.salesManagerId()));
            }

            return predicate;
        };
    }
}
