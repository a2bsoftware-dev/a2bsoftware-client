package com.A2B.dashboardbackend.auth.keycloak;

import com.A2B.dashboardbackend.users.Role;
import com.A2B.dashboardbackend.users.RoleRepository;
import com.A2B.dashboardbackend.users.User;
import com.A2B.dashboardbackend.users.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Keeps the local {@code users} table in sync with Keycloak: called whenever
 * the frontend confirms a login, so Keycloak stays the source of truth for
 * identity AND role assignment, while the local row (wallet, parent, etc.) is
 * created/updated to match. Local {@code roles} rows are matched to Keycloak
 * client roles purely by name (e.g. "Project Manager" == "Project Manager") -
 * what each role is actually allowed to do is a purely local concept, configured
 * only via the app's own Access Rights screen and never touched by this sync.
 */
@Service
@Slf4j
public class KeycloakUserSyncService {

    private static final String DEFAULT_ROLE_NAME = "Manager";
    private static final String ADMIN_ROLE_NAME = "Admin";
    private static final int BCRYPT_ROUNDS = 10;

    // Most-privileged first: if a user somehow carries more than one of these
    // Keycloak client roles at once, the highest-priority match wins.
    private static final List<String> ROLE_PRIORITY = List.of(
            "Admin", "Project Manager", "Sales Manager", "Manager", "User"
    );

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public KeycloakUserSyncService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    public record SyncResult(UUID userId, boolean created) {
    }

    @Transactional
    public SyncResult sync(String keycloakId, String email, String username, String firstName, String lastName,
                            List<String> keycloakRoles) {
        if (keycloakId == null || keycloakId.isBlank()) {
            throw new IllegalArgumentException("Keycloak subject (sub) claim is required to sync a user");
        }

        User user = userRepository.findByKeycloakId(keycloakId)
                .or(() -> email != null && !email.isBlank() ? userRepository.findByEmail(email) : Optional.empty())
                .orElseGet(User::new);

        boolean isNew = user.getId() == null;

        user.setKeycloakId(keycloakId);
        if (email != null && !email.isBlank()) {
            user.setEmail(email);
        }
        if (username != null && !username.isBlank()) {
            user.setUserName(username);
        }
        if (firstName != null && !firstName.isBlank()) {
            user.setFirstName(firstName);
        }
        if (lastName != null && !lastName.isBlank()) {
            user.setLastName(lastName);
        }

        LocalDateTime now = LocalDateTime.now();
        if (isNew) {
            user.setCreatedAt(now);
            user.setWalletBalance(0d);
            user.setParentId(userRepository.findByRoleName(ADMIN_ROLE_NAME).stream()
                    .findFirst().map(User::getId).orElse(null));
            // Local password login isn't used for Keycloak-authenticated accounts; set an
            // unusable placeholder so a NOT NULL/legacy password column is still satisfied.
            user.setPassword(BCrypt.hashpw(UUID.randomUUID().toString(), BCrypt.gensalt(BCRYPT_ROUNDS)));
        }

        // Keycloak is the source of truth for role assignment on every sync (not just
        // creation) - if it doesn't carry a role we recognize, leave whatever role the
        // user already has (falling back to the default only for brand-new accounts).
        UUID resolvedRoleId = resolveRoleId(keycloakRoles);
        if (resolvedRoleId != null) {
            user.setRoleId(resolvedRoleId);
        } else if (isNew) {
            user.setRoleId(roleRepository.findByName(DEFAULT_ROLE_NAME).map(Role::getId).orElse(null));
        }

        user.setUpdatedAt(now);

        userRepository.save(user);
        log.info("Synced Keycloak user {} ({}) -> local user {} ({}), roles={}",
                username, keycloakId, user.getId(), isNew ? "created" : "updated", keycloakRoles);

        return new SyncResult(user.getId(), isNew);
    }

    private UUID resolveRoleId(List<String> keycloakRoles) {
        if (keycloakRoles == null || keycloakRoles.isEmpty()) {
            return null;
        }
        for (String candidate : ROLE_PRIORITY) {
            boolean hasRole = keycloakRoles.stream().anyMatch(r -> r.equalsIgnoreCase(candidate));
            if (hasRole) {
                Optional<UUID> roleId = roleRepository.findByName(candidate).map(Role::getId);
                if (roleId.isPresent()) {
                    return roleId.get();
                }
            }
        }
        return null;
    }
}
