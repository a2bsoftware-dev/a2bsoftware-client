package com.A2B.dashboardbackend.dashboard;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Repository
public class DashboardRepository {

    private final JdbcTemplate jdbcTemplate;

    public DashboardRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findCountriesById() {
        return jdbcTemplate.queryForList("SELECT id, name FROM countries");
    }

    public List<Map<String, Object>> findSurveyInformationsByDate(LocalDate date) {
        return jdbcTemplate.queryForList("""
                SELECT s.*, p.project_name, p.client_api_data, p.country_id, v.vendorName, c.clientName,
                       p.cpc AS client_cpi, p.vendor_cpi
                FROM start_survey_informations s
                LEFT JOIN projects p ON p.id = s.pid
                LEFT JOIN vendors v ON v.id = s.gid
                LEFT JOIN clients c ON c.id = p.client_id
                WHERE s.date = ?
                ORDER BY s.id DESC
                """, Date.valueOf(date));
    }

    public List<Map<String, Object>> findSurveyInformationsBetween(LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.queryForList("""
                SELECT s.*, p.project_name, v.vendorName, c.clientName, co.name AS country_name
                FROM start_survey_informations s
                LEFT JOIN projects p ON p.id = s.pid
                LEFT JOIN vendors v ON v.id = s.gid
                LEFT JOIN clients c ON c.id = p.client_id
                LEFT JOIN countries co ON co.id = p.country_id
                WHERE s.date BETWEEN ? AND ?
                ORDER BY s.id DESC
                """, Date.valueOf(startDate), Date.valueOf(endDate));
    }

    public List<Map<String, Object>> findProjectStatus() {
        return jdbcTemplate.queryForList("""
                SELECT p.*, c.clientName, u.user_name AS project_manager, us.user_name AS salesManagers
                FROM projects p
                LEFT JOIN clients c ON c.id = p.client_id
                LEFT JOIN users u ON u.id = p.project_manager_id
                LEFT JOIN users us ON us.id = p.sales_manager_id
                WHERE (p.client_api_data = 0 AND p.copy_for_client != 1) OR p.approved = 1
                ORDER BY p.id DESC
                """);
    }
}
