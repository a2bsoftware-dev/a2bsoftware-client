package com.A2B.dashboardbackend.accessrights;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/access-rights")
public class AccessRightsController {

    private final AccessRightsService service;

    public AccessRightsController(AccessRightsService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> listRoleAccess() {
        return Map.of("success", true, "roles", service.listRoleAccess());
    }

    @PostMapping
    public Map<String, Object> saveAccessRights(@RequestBody SaveAccessRightsRequest request) {
        service.saveAccessRights(request);
        return Map.of("success", true, "message", "Access rights successfully updated!");
    }
}
