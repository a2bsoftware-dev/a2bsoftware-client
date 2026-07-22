package com.A2B.dashboardbackend.vendors;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Slf4j
@Service
public class VendorService {

    private static final List<Map<String, String>> PAYMENT_TERMS_OPTIONS = List.of(
            Map.of("value", "15", "label", "15 Days"),
            Map.of("value", "30", "label", "30 Days"),
            Map.of("value", "45", "label", "45 Days"),
            Map.of("value", "60", "label", "60 Days")
    );

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final VendorRepository vendorRepository;

    public VendorService(VendorRepository vendorRepository) {
        this.vendorRepository = vendorRepository;
    }

    public List<Vendor> listVendors() {
        return vendorRepository.findAll(Sort.by(Sort.Order.asc("id")));
    }

    public List<Map<String, String>> paymentTermsOptions() {
        return PAYMENT_TERMS_OPTIONS;
    }

    public VendorSaveResult saveVendor(VendorSaveRequest request) {
        if (isBlank(request.vendorName()) || isBlank(request.contactPerson()) || isBlank(request.contact())
                || isBlank(request.email()) || isBlank(request.paymentTerms())) {
            return new VendorSaveResult(false, "Please fill in all required fields.");
        }

        UUID id = request.id();

        Vendor vendor = id != null
                ? vendorRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Vendor not found: " + id))
                : new Vendor();

        vendor.setVendorName(request.vendorName());
        vendor.setContactPerson(request.contactPerson());
        vendor.setContact(request.contact());
        vendor.setEmail(request.email());
        vendor.setPaymentTerms(request.paymentTerms());
        vendor.setCompleteLink(request.completeLink() != null ? request.completeLink() : "");
        vendor.setDisqualifyLink(request.disqualifyLink() != null ? request.disqualifyLink() : "");
        vendor.setQoutafullLink(request.qoutafullLink() != null ? request.qoutafullLink() : "");
        vendor.setSecurityTermlink(request.securityTermlink() != null ? request.securityTermlink() : "");

        if (id == null) {
            vendor.setApiToken(generateApiToken());
            vendor.setInternalPanel(0);
        }

        vendorRepository.save(vendor);
        log.info("Vendor {} ({})", id != null ? "updated" : "created", request.vendorName());

        return new VendorSaveResult(true, id != null ? "Vendor was successfully updated" : "Vendor was successfully submitted");
    }

    public void deleteVendor(UUID id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Vendor not found"));

        if (vendor.getInternalPanel() != null && vendor.getInternalPanel() == 1) {
            throw new IllegalStateException("Internal panel vendors cannot be deleted");
        }

        vendorRepository.deleteById(id);
        log.info("Vendor {} deleted", id);
    }

    private String generateApiToken() {
        byte[] bytes = new byte[20];
        SECURE_RANDOM.nextBytes(bytes);
        StringBuilder hex = new StringBuilder();
        for (byte b : bytes) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
