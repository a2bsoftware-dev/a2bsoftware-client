package com.A2B.dashboardbackend.accessrights;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClientUserPrivRepository extends JpaRepository<ClientUserPriv, UUID> {

    Optional<ClientUserPriv> findByUserTypeId(UUID userTypeId);

    List<ClientUserPriv> findByUserTypeIdIn(List<UUID> userTypeIds);
}
