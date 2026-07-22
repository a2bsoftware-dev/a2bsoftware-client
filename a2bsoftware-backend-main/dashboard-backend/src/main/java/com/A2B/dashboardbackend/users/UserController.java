package com.A2B.dashboardbackend.users;

import com.A2B.dashboardbackend.common.PagedResult;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public Map<String, Object> listUsers(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "10") int maxPerPage,
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) String mobile,
            @RequestParam(required = false) String email
    ) {
        UserListFilter filter = new UserListFilter(userName, mobile, email);
        PagedResult<UserListItemDto> result = userService.listUsers(filter, pageNo, maxPerPage);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("users", result.items());
        response.put("total", result.total());
        response.put("roles", userService.listRoles());
        return response;
    }

    @PostMapping
    public Map<String, Object> createUser(@RequestBody UserSaveRequest request) {
        UserSaveResult result = userService.saveUser(request);
        return Map.of("success", result.success(), "message", result.message());
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateUser(@PathVariable UUID id, @RequestBody UserSaveRequest request) {
        UserSaveRequest withId = new UserSaveRequest(id, request.userName(), request.mobile(), request.email(),
                request.checkPassword(), request.roleId());
        UserSaveResult result = userService.saveUser(withId);
        return Map.of("success", result.success(), "message", result.message());
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return Map.of("success", true, "message", "User is Deleted Successfully");
    }
}
