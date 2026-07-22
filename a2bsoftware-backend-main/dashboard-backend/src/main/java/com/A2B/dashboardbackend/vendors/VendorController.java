package com.A2B.dashboardbackend.vendors;

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
@RequestMapping("/api/vendors")
public class VendorController {

    private final VendorService vendorService;

    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    @GetMapping
    public Map<String, Object> listVendors() {
        return Map.of(
                "success", true,
                "vendors", vendorService.listVendors(),
                "paymentTermsOptions", vendorService.paymentTermsOptions()
        );
    }

    @PostMapping
    public Map<String, Object> createVendor(@RequestBody VendorSaveRequest request) {
        VendorSaveResult result = vendorService.saveVendor(request);
        return Map.of("success", result.success(), "message", result.message());
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateVendor(@PathVariable UUID id, @RequestBody VendorSaveRequest request) {
        VendorSaveRequest withId = new VendorSaveRequest(id, request.vendorName(), request.contactPerson(),
                request.contact(), request.email(), request.paymentTerms(), request.completeLink(),
                request.disqualifyLink(), request.qoutafullLink(), request.securityTermlink());
        VendorSaveResult result = vendorService.saveVendor(withId);
        return Map.of("success", result.success(), "message", result.message());
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteVendor(@PathVariable UUID id) {
        vendorService.deleteVendor(id);
        return Map.of("success", true, "message", "Vendor was successfully deleted");
    }
}
