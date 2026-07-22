package com.A2B.dashboardbackend.users;

import com.A2B.dashboardbackend.common.PagedResult;
import lombok.extern.slf4j.Slf4j;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Slf4j
@Service
public class UserService {

    private static final int BCRYPT_ROUNDS = 10;
    private static final String DEFAULT_ROLE_NAME = "Manager";
    private static final String ADMIN_ROLE_NAME = "Admin";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    public PagedResult<UserListItemDto> listUsers(UserListFilter filter, int pageNo, int maxPerPage) {
        PageRequest pageRequest = PageRequest.of(Math.max(pageNo - 1, 0), maxPerPage);
        UUID adminRoleId = roleRepository.findByName(ADMIN_ROLE_NAME).map(Role::getId).orElse(null);
        Page<User> page = userRepository.findAll(UserSpecifications.matching(filter, adminRoleId), pageRequest);

        Map<UUID, String> roleNames = new HashMap<>();
        roleRepository.findAll().forEach(r -> roleNames.put(r.getId(), r.getName()));

        List<UserListItemDto> items = page.getContent().stream()
                .map(u -> new UserListItemDto(u.getId(), u.getUserName(), u.getMobile(), u.getEmail(),
                        u.getCheckPassword(), u.getRoleId(), roleNames.getOrDefault(u.getRoleId(), "NA")))
                .toList();

        return new PagedResult<>(items, page.getTotalElements());
    }

    public List<Role> listRoles() {
        return roleRepository.findAll();
    }

    public UserSaveResult saveUser(UserSaveRequest request) {
        UUID id = request.id();

        boolean duplicateEmail = id != null
                ? userRepository.existsByEmailAndIdNot(request.email(), id)
                : userRepository.existsByEmail(request.email());

        if (duplicateEmail) {
            return new UserSaveResult(false, "The email address has already been taken.");
        }

        User user = id != null
                ? userRepository.findById(id).orElseThrow(() -> new NoSuchElementException("User not found: " + id))
                : new User();

        user.setUserName(request.userName());
        user.setMobile(request.mobile());
        user.setEmail(request.email());
        user.setCheckPassword(request.checkPassword());
        user.setPassword(BCrypt.hashpw(request.checkPassword(), BCrypt.gensalt(BCRYPT_ROUNDS)));
        user.setRoleId(request.roleId() != null ? request.roleId() : defaultRoleId());

        if (id == null) {
            user.setParentId(adminUserId());
        }

        userRepository.save(user);
        log.info("User {} ({})", id != null ? "updated" : "created", request.email());

        return new UserSaveResult(true, id != null ? "User Data is successfully Updated" : "User Data is successfully saved");
    }

    public void deleteUser(UUID id) {
        userRepository.deleteById(id);
        log.info("User {} deleted", id);
    }

    private UUID defaultRoleId() {
        return roleRepository.findByName(DEFAULT_ROLE_NAME).map(Role::getId).orElse(null);
    }

    private UUID adminUserId() {
        return userRepository.findByRoleName(ADMIN_ROLE_NAME).stream().findFirst().map(User::getId).orElse(null);
    }
}
