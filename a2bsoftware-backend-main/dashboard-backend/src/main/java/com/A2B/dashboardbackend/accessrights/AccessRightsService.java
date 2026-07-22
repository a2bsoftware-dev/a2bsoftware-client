package com.A2B.dashboardbackend.accessrights;

import com.A2B.dashboardbackend.users.Role;
import com.A2B.dashboardbackend.users.RoleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AccessRightsService {

    private final RoleRepository roleRepository;
    private final ClientUserPrivRepository clientUserPrivRepository;

    public AccessRightsService(RoleRepository roleRepository, ClientUserPrivRepository clientUserPrivRepository) {
        this.roleRepository = roleRepository;
        this.clientUserPrivRepository = clientUserPrivRepository;
    }

    public List<RoleAccessDto> listRoleAccess() {
        List<Role> roles = roleRepository.findAll(Sort.by(Sort.Order.asc("id"))).stream()
                .filter(r -> r.getStatus() != null && r.getStatus() == 1)
                .toList();

        Map<UUID, ClientUserPriv> privByRoleId = clientUserPrivRepository.findAll().stream()
                .collect(Collectors.toMap(ClientUserPriv::getUserTypeId, p -> p, (a, b) -> a));

        return roles.stream().map(role -> {
            ClientUserPriv priv = privByRoleId.get(role.getId());
            List<Integer> activeIds = parseAccessRightIds(priv);
            return new RoleAccessDto(role.getId(), role.getName(), activeIds);
        }).toList();
    }

    private List<Integer> parseAccessRightIds(ClientUserPriv priv) {
        if (priv == null || priv.getAccessRightId() == null || priv.getAccessRightId().isBlank()) {
            return List.of();
        }
        return Arrays.stream(priv.getAccessRightId().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return Integer.parseInt(s);
                    } catch (NumberFormatException e) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional
    public void saveAccessRights(SaveAccessRightsRequest request) {
        clientUserPrivRepository.deleteAll();

        for (RoleMappingRequest mapping : request.roleMappings()) {
            if (mapping.roleId() == null) {
                continue;
            }
            String accessRightStr = mapping.accessRightIds() != null
                    ? mapping.accessRightIds().stream().map(String::valueOf).collect(Collectors.joining(","))
                    : "";

            ClientUserPriv priv = new ClientUserPriv();
            priv.setUserTypeId(mapping.roleId());
            priv.setAccessRightId(accessRightStr);
            clientUserPrivRepository.save(priv);
        }

        log.info("Access rights configuration updated for {} role(s)", request.roleMappings().size());
    }
}
