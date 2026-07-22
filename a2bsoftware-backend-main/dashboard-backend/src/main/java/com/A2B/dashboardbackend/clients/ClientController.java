package com.A2B.dashboardbackend.clients;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @GetMapping
    public Map<String, Object> listClients() {
        return Map.of(
                "success", true,
                "clients", clientService.listClients(),
                "paymentTermsOptions", clientService.paymentTermsOptions()
        );
    }

    @PostMapping
    public Map<String, Object> createClient(@RequestBody ClientSaveRequest request) {
        ClientSaveResult result = clientService.saveClient(request);
        return Map.of("success", result.success(), "message", result.message());
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateClient(@PathVariable UUID id, @RequestBody ClientSaveRequest request) {
        ClientSaveRequest withId = new ClientSaveRequest(id, request.clientName(), request.contactPerson(),
                request.contact(), request.email(), request.paymentTerms());
        ClientSaveResult result = clientService.saveClient(withId);
        return Map.of("success", result.success(), "message", result.message());
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteClient(@PathVariable UUID id) {
        clientService.deleteClient(id);
        return Map.of("success", true, "message", "Client was successfully deleted");
    }
}
