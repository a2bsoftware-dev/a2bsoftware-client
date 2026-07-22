package com.A2B.dashboardbackend.users;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

    @Query("SELECT u FROM User u, Role r WHERE r.id = u.roleId AND r.name = :roleName")
    List<User> findByRoleName(@Param("roleName") String roleName);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, UUID id);

    Optional<User> findByKeycloakId(String keycloakId);

    Optional<User> findByEmail(String email);
}
