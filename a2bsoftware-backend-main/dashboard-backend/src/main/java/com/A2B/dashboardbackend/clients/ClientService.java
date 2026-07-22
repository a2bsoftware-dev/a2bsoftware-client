package com.A2B.dashboardbackend.clients;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Slf4j
@Service
public class ClientService {

    private static final List<Map<String, String>> PAYMENT_TERMS_OPTIONS = List.of(
            Map.of("value", "15", "label", "15 Days"),
            Map.of("value", "30", "label", "30 Days"),
            Map.of("value", "45", "label", "45 Days"),
            Map.of("value", "60", "label", "60 Days")
    );

    private final ClientRepository clientRepository;

    public ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    public List<Client> listClients() {
        return clientRepository.findAll(Sort.by(Sort.Order.asc("id")));
    }

    public List<Map<String, String>> paymentTermsOptions() {
        return PAYMENT_TERMS_OPTIONS;
    }

    public ClientSaveResult saveClient(ClientSaveRequest request) {
        if (isBlank(request.clientName()) || isBlank(request.contactPerson()) || isBlank(request.contact())
                || isBlank(request.email()) || isBlank(request.paymentTerms())) {
            return new ClientSaveResult(false, "Please fill in all required fields.");
        }

        UUID id = request.id();

        Client client = id != null
                ? clientRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Client not found: " + id))
                : new Client();

        client.setClientName(request.clientName());
        client.setContactPerson(request.contactPerson());
        client.setContact(request.contact());
        client.setEmail(request.email());
        client.setPaymentTerms(request.paymentTerms());

        clientRepository.save(client);
        log.info("Client {} ({})", id != null ? "updated" : "created", request.clientName());

        return new ClientSaveResult(true, id != null ? "Client was successfully updated" : "Client was successfully submitted");
    }

    public void deleteClient(UUID id) {
        clientRepository.deleteById(id);
        log.info("Client {} deleted", id);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
