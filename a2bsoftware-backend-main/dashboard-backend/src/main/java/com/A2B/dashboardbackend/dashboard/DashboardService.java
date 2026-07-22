package com.A2B.dashboardbackend.dashboard;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class DashboardService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd-MMM-yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final String[] CSV_HEADERS = {
            "SN", "Project ID", "Supplier ID", "Supplier Name", "Our PO", "Client",
            "Start IP", "End IP", "Start Time", "End Time", "Start Date", "End Date",
            "Ref ID", "UID", "Country", "Client CPI", "Vendor CPI", "Profit"
    };

    private final DashboardRepository repository;

    public DashboardService(DashboardRepository repository) {
        this.repository = repository;
    }

    public List<Map<String, Object>> getTodaySurveyInformations() {
        Map<Object, Object> countriesById = toLookupMap(repository.findCountriesById(), "id", "name");

        List<Map<String, Object>> rows = repository.findSurveyInformationsByDate(LocalDate.now());
        log.info("Fetched {} survey informations for today", rows.size());

        for (Map<String, Object> row : rows) {
            double clientCpi = toDouble(row.get("client_cpi"));
            double vendorCpi = toDouble(row.get("vendor_cpi"));
            row.put("client_cpi", clientCpi);
            row.put("vendor_cpi", vendorCpi);
            row.put("profit", clientCpi - vendorCpi);

            Object countryId = row.get("country_id");
            row.put("country_name", countriesById.get(countryId));

            Object startTime = row.get("start_time");
            Object endTime = row.get("end_time");
            row.put("start_date", formatDate(startTime));
            row.put("end_date", formatDate(endTime));
            row.put("start_time", formatTime(startTime));
            row.put("end_time", formatTime(endTime));
            row.put("showStatus", SurveyStatus.labelFor(row.get("status")));
        }

        return rows;
    }

    public List<Map<String, Object>> getProjectStatus() {
        List<Map<String, Object>> rows = repository.findProjectStatus();
        log.info("Fetched {} projects for project status board", rows.size());

        for (Map<String, Object> row : rows) {
            Object startDateValue = row.get("start_date");
            Object createdAt = row.get("created_at");
            row.put("start_date", startDateValue != null
                    ? formatDate(startDateValue)
                    : (createdAt != null ? formatDate(createdAt) : null));
        }

        return rows;
    }

    public List<Map<String, Object>> getMonthlyStatistics() {
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.withDayOfMonth(1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        List<Map<String, Object>> rows = repository.findSurveyInformationsBetween(startDate, endDate);
        log.info("Fetched {} survey informations for month {}", rows.size(), startDate.getMonth());
        return rows;
    }

    public String buildCsv(List<ExportRow> rows) {
        StringBuilder csv = new StringBuilder();
        csv.append(String.join(",", CSV_HEADERS)).append("\n");

        int index = 1;
        for (ExportRow row : rows) {
            double clientCpi = row.clientCpi() != null ? row.clientCpi() : 0d;
            double vendorCpi = row.vendorCpi() != null ? row.vendorCpi() : 0d;
            double profit = row.profit() != null ? row.profit() : (clientCpi - vendorCpi);

            csv.append(String.join(",",
                    String.valueOf(index++),
                    str(row.pid()),
                    str(row.gid()),
                    quote(row.vendorName() != null ? row.vendorName() : "Internal Team"),
                    quote(row.projectName()),
                    quote(row.clientName()),
                    str(row.startIpAddress()),
                    row.endIpAddress() != null ? row.endIpAddress() : str(row.startIpAddress()),
                    str(row.startTime()),
                    str(row.endTime()),
                    str(row.startDate()),
                    str(row.endDate()),
                    str(row.refId()),
                    str(row.userId()),
                    quote(row.countryName()),
                    String.format("%.2f", clientCpi),
                    String.format("%.2f", vendorCpi),
                    String.format("%.2f", profit)
            )).append("\n");
        }

        log.info("Built CSV export for {} rows", rows.size());
        return csv.toString();
    }

    private Map<Object, Object> toLookupMap(List<Map<String, Object>> rows, String keyColumn, String valueColumn) {
        Map<Object, Object> map = new HashMap<>();
        for (Map<String, Object> row : rows) {
            map.put(row.get(keyColumn), row.get(valueColumn));
        }
        return map;
    }

    private double toDouble(Object value) {
        if (value == null) return 0d;
        if (value instanceof Number number) return number.doubleValue();
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            log.warn("Could not parse numeric value '{}', defaulting to 0", value);
            return 0d;
        }
    }

    private String formatDate(Object value) {
        LocalDateTime dateTime = toLocalDateTime(value);
        return dateTime != null ? dateTime.format(DATE_FORMAT) : null;
    }

    private String formatTime(Object value) {
        LocalDateTime dateTime = toLocalDateTime(value);
        return dateTime != null ? dateTime.format(TIME_FORMAT) : null;
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof Timestamp timestamp) return timestamp.toLocalDateTime();
        if (value instanceof LocalDateTime localDateTime) return localDateTime;
        if (value instanceof java.sql.Date date) return date.toLocalDate().atStartOfDay();
        if (value instanceof LocalDate localDate) return localDate.atStartOfDay();
        log.warn("Unrecognized date/time value type: {}", value.getClass());
        return null;
    }

    private String str(Object value) {
        return value != null ? String.valueOf(value) : "";
    }

    private String quote(String value) {
        return "\"" + (value != null ? value : "") + "\"";
    }
}
