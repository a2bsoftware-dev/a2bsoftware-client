package com.A2B.dashboardbackend.projects;

import com.A2B.dashboardbackend.clients.Client;
import com.A2B.dashboardbackend.clients.ClientRepository;
import com.A2B.dashboardbackend.common.PagedResult;
import com.A2B.dashboardbackend.countries.Country;
import com.A2B.dashboardbackend.countries.CountryRepository;
import com.A2B.dashboardbackend.currencies.CurrencyRepository;
import com.A2B.dashboardbackend.languages.LanguageRepository;
import com.A2B.dashboardbackend.users.User;
import com.A2B.dashboardbackend.users.UserRepository;
import com.A2B.dashboardbackend.vendors.Vendor;
import com.A2B.dashboardbackend.vendors.VendorRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ProjectService {

    private static final DateTimeFormatter DATE_DDMMYYYY = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DATE_MMDDYYYY_SLASH = DateTimeFormatter.ofPattern("MM/dd/yyyy");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm:ss");

    private static final List<Map<String, String>> SECURITY_CHECKLIST = List.of(
            Map.of("value", "1", "label", "Validate Country"),
            Map.of("value", "2", "label", "Validate Start-end-IP"),
            Map.of("value", "3", "label", "Validate Proxy")
    );

    private static final List<Map<String, String>> STUDY_TYPES = List.of(
            Map.of("value", "1", "label", "B2B"),
            Map.of("value", "2", "label", "B2C"),
            Map.of("value", "3", "label", "Healthcare"),
            Map.of("value", "4", "label", "ITDM"),
            Map.of("value", "5", "label", "ADHOC")
    );

    private static final List<Map<String, String>> DEVICES = List.of(
            Map.of("value", "1", "label", "Monitor"),
            Map.of("value", "2", "label", "Smartphone"),
            Map.of("value", "3", "label", "Tablet")
    );

    private final ProjectRepository projectRepository;
    private final ClientRepository clientRepository;
    private final CountryRepository countryRepository;
    private final LanguageRepository languageRepository;
    private final CurrencyRepository currencyRepository;
    private final VendorRepository vendorRepository;
    private final UserRepository userRepository;
    private final StartSurveyInformationRepository surveyInformationRepository;

    public ProjectService(ProjectRepository projectRepository, ClientRepository clientRepository,
                           CountryRepository countryRepository, LanguageRepository languageRepository,
                           CurrencyRepository currencyRepository, VendorRepository vendorRepository,
                           UserRepository userRepository, StartSurveyInformationRepository surveyInformationRepository) {
        this.projectRepository = projectRepository;
        this.clientRepository = clientRepository;
        this.countryRepository = countryRepository;
        this.languageRepository = languageRepository;
        this.currencyRepository = currencyRepository;
        this.vendorRepository = vendorRepository;
        this.userRepository = userRepository;
        this.surveyInformationRepository = surveyInformationRepository;
    }

    public PagedResult<ProjectListItemDto> listProjects(ProjectListFilter filter, int pageNo, int maxPerPage) {
        PageRequest pageRequest = PageRequest.of(Math.max(pageNo - 1, 0), maxPerPage,
                Sort.by(Sort.Order.desc("copyForClient"), Sort.Order.desc("createdAt"), Sort.Order.desc("id")));

        Page<Project> page = projectRepository.findAll(ProjectSpecifications.matching(filter), pageRequest);
        List<Project> projects = page.getContent();

        Map<UUID, String> countriesById = countriesById();
        Set<UUID> clientIds = projects.stream().map(Project::getClientId).collect(Collectors.toSet());
        Set<UUID> userIds = projects.stream()
                .flatMap(p -> Arrays.asList(p.getProjectManagerId(), p.getSalesManagerId()).stream())
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> clientNames = clientNamesByIds(clientIds);
        Map<UUID, String> userNames = userNamesByIds(userIds);

        List<UUID> pids = projects.stream().map(Project::getId).toList();
        Map<UUID, Map<Integer, Long>> statsByPid = groupCountsByPid(surveyInformationRepository.countByPidAndStatusIn(pids));

        List<ProjectListItemDto> items = projects.stream()
                .map(project -> toListItem(project, countriesById, clientNames, userNames, statsByPid))
                .toList();

        return new PagedResult<>(items, page.getTotalElements());
    }

    private ProjectListItemDto toListItem(Project project, Map<UUID, String> countriesById,
                                           Map<UUID, String> clientNames, Map<UUID, String> userNames,
                                           Map<UUID, Map<Integer, Long>> statsByPid) {
        Map<Integer, Long> counts = statsByPid.getOrDefault(project.getId(), Map.of());
        int complete = counts.getOrDefault(1, 0L).intValue();
        int disqualify = counts.getOrDefault(2, 0L).intValue();
        int quotaFull = counts.getOrDefault(3, 0L).intValue();
        int securityTerm = counts.getOrDefault(4, 0L).intValue();
        int drop = counts.getOrDefault(0, 0L).intValue();
        int hits = complete + disqualify + quotaFull + securityTerm + drop;

        double abendondVal = hits > 0 ? ((hits - drop) * 100d) / hits : 0d;
        double irVal = hits > 0 ? ((complete - disqualify) * 100d) / hits : 0d;

        return new ProjectListItemDto(
                project.getId(),
                project.getParentProjectId(),
                project.getProjectName(),
                project.getSurveyLink(),
                countriesById.get(project.getCountryId()),
                clientNames.get(project.getClientId()),
                userNames.get(project.getProjectManagerId()),
                userNames.get(project.getSalesManagerId()),
                project.getCreatedAt() != null ? project.getCreatedAt().format(DATE_DDMMYYYY) : "",
                hits, complete, disqualify, quotaFull, securityTerm, drop,
                String.format("%.2f", abendondVal),
                String.format("%.2f", irVal),
                project.getLoi(),
                project.getStatus(),
                ProjectStatus.labelFor(project.getStatus()),
                project.getCopyForClient()
        );
    }

    private Map<UUID, Map<Integer, Long>> groupCountsByPid(List<PidStatusCount> counts) {
        Map<UUID, Map<Integer, Long>> result = new HashMap<>();
        for (PidStatusCount count : counts) {
            result.computeIfAbsent(count.getPid(), k -> new HashMap<>()).put(count.getStatus(), count.getTotal());
        }
        return result;
    }

    public Map<String, Object> getFilterOptions() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("clients", clientRepository.findAll().stream()
                .map(c -> Map.of("id", c.getId(), "clientName", c.getClientName())).toList());
        response.put("countries", countryRepository.findAll().stream()
                .map(c -> Map.of("id", c.getId(), "name", c.getName())).toList());
        response.put("projects", projectRepository.findAll().stream()
                .map(p -> Map.of("id", p.getId(), "projectName", p.getProjectName())).toList());
        response.put("projectManagers", userRepository.findByRoleName("Project Manager").stream()
                .map(u -> Map.of("id", u.getId(), "userName", u.getUserName())).toList());
        response.put("salesManagers", userRepository.findByRoleName("Sales Manager").stream()
                .map(u -> Map.of("id", u.getId(), "userName", u.getUserName())).toList());
        response.put("statusOptions", statusOptionsList());
        return response;
    }

    public Map<String, Object> getFormData(UUID projectId) {
        Map<String, Object> response = new LinkedHashMap<>();

        Project project = projectId != null ? projectRepository.findById(projectId).orElse(null) : null;

        List<String> allDeviceIds = project != null && project.getDevice() != null
                ? Arrays.asList(project.getDevice().split(","))
                : List.of();
        List<String> allChecklistIds = project != null && project.getSecurityCheckList() != null
                ? Arrays.asList(project.getSecurityCheckList().split(","))
                : List.of();

        Map<String, Object> projectData = null;
        ProjectStatisticsDto statistics = ProjectStatisticsDto.empty();

        if (project != null) {
            projectData = new LinkedHashMap<>();
            projectData.put("id", project.getId());
            projectData.put("projectName", project.getProjectName());
            projectData.put("parentProjectId", project.getParentProjectId());
            projectData.put("studyType", project.getStudyType());
            projectData.put("countryId", project.getCountryId());
            projectData.put("languageId", project.getLanguageId());
            projectData.put("currencyId", project.getCurrencyId());
            projectData.put("cpc", project.getCpc());
            projectData.put("vendorCpi", project.getVendorCpi());
            projectData.put("surveyLink", project.getSurveyLink());
            projectData.put("surveyTestLink", project.getSurveyTestLink());
            projectData.put("reqComplete", project.getReqComplete());
            projectData.put("ir", project.getIr());
            projectData.put("loi", project.getLoi());
            projectData.put("status", project.getStatus());
            projectData.put("notes", project.getNotes());
            projectData.put("projectBrief", project.getProjectBrief());
            projectData.put("clientId", project.getClientId());
            projectData.put("projectManagerId", project.getProjectManagerId());
            projectData.put("salesManagerId", project.getSalesManagerId());
            projectData.put("countryName", countriesById().get(project.getCountryId()));
            projectData.put("startDateFormatted", project.getCreatedAt() != null
                    ? project.getCreatedAt().format(DATE_MMDDYYYY_SLASH) : "");

            statistics = computeStatistics(project);
        }

        response.put("projectData", projectData);
        response.put("allDevicesIds", allDeviceIds);
        response.put("allChecklistIds", allChecklistIds);
        response.put("statistics", statistics);
        response.put("securityChecklist", SECURITY_CHECKLIST);
        response.put("studyTypes", STUDY_TYPES);
        response.put("statusOptions", statusOptionsList());
        response.put("devices", DEVICES);
        response.put("languages", languageRepository.findAll().stream()
                .map(l -> Map.of("id", l.getId(), "languageName", l.getLanguageName())).toList());
        response.put("countries", countryRepository.findAll().stream()
                .map(c -> Map.of("id", c.getId(), "name", c.getName())).toList());
        response.put("clients", clientRepository.findAll().stream()
                .map(c -> Map.of("id", c.getId(), "clientName", c.getClientName())).toList());
        response.put("currency", currencyRepository.findAll().stream()
                .map(c -> Map.of("id", c.getId(), "currencyName", c.getCurrencyName())).toList());
        response.put("vendor", vendorRepository.findAll().stream()
                .map(v -> Map.of("id", v.getId(), "vendorName", v.getVendorName())).toList());

        List<Map<String, Object>> parentProjects = new ArrayList<>();
        parentProjects.add(Map.of("id", "", "projectName", "Self Project"));
        parentProjects.addAll(projectRepository.findByApproved(1).stream()
                .map(p -> Map.<String, Object>of("id", p.getId(), "projectName", p.getProjectName())).toList());
        response.put("projects", parentProjects);

        response.put("projectManagers", userRepository.findByRoleName("Project Manager").stream()
                .map(u -> Map.of("id", u.getId(), "userName", u.getUserName())).toList());
        response.put("salesManagers", userRepository.findByRoleName("Sales Manager").stream()
                .map(u -> Map.of("id", u.getId(), "userName", u.getUserName())).toList());

        return response;
    }

    private ProjectStatisticsDto computeStatistics(Project project) {
        List<StartSurveyInformation> surveyInfo = surveyInformationRepository.findByPid(project.getId());

        int hits = 0;
        int redirect = 0;
        int complete = 0;
        int disqualify = 0;
        int quotaFull = 0;
        int securityTerm = 0;

        for (StartSurveyInformation info : surveyInfo) {
            hits++;
            Integer status = info.getStatus();
            if (status == null) continue;
            switch (status) {
                case 0 -> redirect++;
                case 1 -> complete++;
                case 2 -> disqualify++;
                case 3 -> quotaFull++;
                case 4 -> securityTerm++;
                default -> { }
            }
        }

        double epc = project.getCpc() * redirect;
        double abendondVal = hits > 0 ? ((hits - redirect) * 100d) / hits : 0d;
        int completeSurvey = hits - redirect;
        double irVal = hits > 0 ? ((completeSurvey - disqualify) * 100d) / hits : 0d;

        return new ProjectStatisticsDto(
                complete, disqualify, quotaFull, securityTerm, hits, redirect, epc,
                String.format("%.2f", abendondVal), completeSurvey, String.format("%.2f", irVal),
                project.getLoi() != null ? project.getLoi() : 15
        );
    }

    public ProjectSaveResult saveProject(ProjectSaveRequest request) {
        UUID id = request.id();

        boolean duplicateName = id != null
                ? projectRepository.existsByProjectNameAndIdNot(request.projectName(), id)
                : projectRepository.existsByProjectName(request.projectName());

        if (duplicateName) {
            return new ProjectSaveResult(false,
                    "The project name must be unique. A project with this name already exists.");
        }

        Project project = id != null
                ? projectRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Project not found: " + id))
                : new Project();

        if (id == null) {
            project.setCreatedAt(LocalDateTime.now());
        }
        project.setUpdatedAt(LocalDateTime.now());

        project.setProjectName(request.projectName());
        project.setParentProjectId(request.parentProjectId());
        project.setStudyType(request.studyType() != null ? request.studyType() : 1);
        project.setCountryId(request.countryId());
        project.setLanguageId(request.languageId());
        project.setCurrencyId(request.currencyId());
        project.setCpc(request.cpc() != null ? request.cpc() : 0d);
        project.setVendorCpi(request.vendorCpi() != null ? request.vendorCpi() : 0d);
        project.setSurveyLink(request.surveyLink() != null ? request.surveyLink() : "");
        project.setSurveyTestLink(request.surveyTestLink() != null ? request.surveyTestLink() : "");
        project.setReqComplete(request.reqComplete() != null ? request.reqComplete() : 0);
        project.setLoi(request.loi() != null ? request.loi() : 0);
        project.setIr(request.ir() != null ? request.ir() : 0);
        project.setClientId(request.clientId());
        project.setProjectManagerId(request.projectManagerId());
        project.setSalesManagerId(request.salesManagerId());
        project.setNotes(request.notes() != null ? request.notes() : "");
        project.setProjectBrief(request.projectBrief() != null ? request.projectBrief() : "");
        project.setStatus(request.status() != null ? request.status() : 1);

        if (request.allDevicesIds() != null) {
            project.setDevice(String.join(",", request.allDevicesIds()));
        }
        if (request.allChecklistIds() != null) {
            project.setSecurityCheckList(String.join(",", request.allChecklistIds()));
        }

        projectRepository.save(project);
        log.info("Project {} ({})", id != null ? "updated" : "created", project.getProjectName());

        return new ProjectSaveResult(true, id != null ? "Data was successfully Updated" : "Data was successfully stored");
    }

    public String updateStatus(UUID projectId, Integer statusId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found: " + projectId));
        project.setStatus(statusId);
        projectRepository.save(project);
        log.info("Project {} status changed to {}", projectId, statusId);
        return ProjectStatus.labelFor(statusId);
    }

    public void deleteProject(UUID projectId) {
        projectRepository.deleteById(projectId);
        log.info("Project {} deleted", projectId);
    }

    public Project copyProject(UUID projectId) {
        List<Project> all = projectRepository.findAll();
        all.forEach(p -> p.setCopyForClient(0));
        projectRepository.saveAll(all);

        Project source = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found: " + projectId));

        Project copy = new Project();
        copy.setSurveyId(source.getSurveyId());
        copy.setProjectName(source.getProjectName());
        copy.setParentProjectId(source.getParentProjectId());
        copy.setStudyType(source.getStudyType());
        copy.setReqComplete(source.getReqComplete());
        copy.setLoi(source.getLoi());
        copy.setIr(source.getIr());
        copy.setCpc(source.getCpc());
        copy.setVendorCpi(source.getVendorCpi());
        copy.setSurveyLink(source.getSurveyLink());
        copy.setSurveyTestLink(source.getSurveyTestLink());
        copy.setCountryId(source.getCountryId());
        copy.setLanguageId(source.getLanguageId());
        copy.setCurrencyId(source.getCurrencyId());
        copy.setClientId(source.getClientId());
        copy.setProjectManagerId(source.getProjectManagerId());
        copy.setSalesManagerId(source.getSalesManagerId());
        copy.setStatus(source.getStatus());
        copy.setDevice(source.getDevice());
        copy.setSecurityCheckList(source.getSecurityCheckList());
        copy.setApproved(source.getApproved());
        copy.setTopSurvey(source.getTopSurvey());
        copy.setClientApiData(source.getClientApiData());
        copy.setNotes(source.getNotes());
        copy.setProjectBrief(source.getProjectBrief());
        copy.setCopyForClient(1);
        copy.setCreatedAt(LocalDateTime.now());
        copy.setUpdatedAt(LocalDateTime.now());

        Project saved = projectRepository.save(copy);
        log.info("Project {} duplicated as {}", projectId, saved.getId());
        return saved;
    }

    public Map<String, Object> getSurveyFilterOptions() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("countries", countryRepository.findAll().stream()
                .map(c -> Map.of("id", c.getId(), "name", c.getName())).toList());
        response.put("surveyStatusOptions", Arrays.stream(ProjectSurveyStatus.values())
                .map(s -> Map.of("value", String.valueOf(s.getCode()), "label", s.getLabel()))
                .toList());
        return response;
    }

    public PagedResult<SurveyDetailRowDto> listSurveyDetails(SurveyDetailFilter filter, int pageNo, int maxPerPage) {
        List<UUID> restrictToPids = resolvePidsForCountryFilter(filter);
        if (restrictToPids != null && restrictToPids.isEmpty()) {
            return new PagedResult<>(List.of(), 0);
        }

        PageRequest pageRequest = PageRequest.of(Math.max(pageNo - 1, 0), maxPerPage, Sort.by(Sort.Order.desc("id")));
        var spec = ProjectSpecifications.matchingSurveyDetails(filter, restrictToPids);
        Page<StartSurveyInformation> page = surveyInformationRepository.findAll(spec, pageRequest);

        return new PagedResult<>(toSurveyDetailRows(page.getContent()), page.getTotalElements());
    }

    public List<SurveyDetailRowDto> listSurveyDetailsForExport(SurveyDetailFilter filter) {
        List<UUID> restrictToPids = resolvePidsForCountryFilter(filter);
        if (restrictToPids != null && restrictToPids.isEmpty()) {
            return List.of();
        }

        var spec = ProjectSpecifications.matchingSurveyDetails(filter, restrictToPids);
        List<StartSurveyInformation> rows = surveyInformationRepository.findAll(spec, Sort.by(Sort.Order.desc("id")));
        return toSurveyDetailRows(rows);
    }

    private List<UUID> resolvePidsForCountryFilter(SurveyDetailFilter filter) {
        if (filter.countryId() == null) {
            return null;
        }
        return projectRepository.findAll().stream()
                .filter(p -> filter.countryId().equals(p.getCountryId()))
                .map(Project::getId)
                .toList();
    }

    private List<SurveyDetailRowDto> toSurveyDetailRows(List<StartSurveyInformation> rows) {
        List<UUID> pids = rows.stream().map(StartSurveyInformation::getPid).distinct().toList();
        Map<UUID, Project> projectsById = projectRepository.findAllById(pids).stream()
                .collect(Collectors.toMap(Project::getId, p -> p));

        Set<UUID> gids = rows.stream().map(StartSurveyInformation::getGid).collect(Collectors.toSet());
        Map<UUID, String> vendorNames = vendorNamesByIds(gids);

        Set<UUID> clientIds = projectsById.values().stream().map(Project::getClientId).collect(Collectors.toSet());
        Map<UUID, String> clientNames = clientNamesByIds(clientIds);

        Map<UUID, String> countriesById = countriesById();

        return rows.stream().map(row -> {
            Project project = projectsById.get(row.getPid());
            String countryName = project != null ? countriesById.getOrDefault(project.getCountryId(), "") : "";

            return new SurveyDetailRowDto(
                    row.getId(),
                    row.getPid(),
                    row.getGid(),
                    vendorNames.getOrDefault(row.getGid(), "Internal Team"),
                    project != null ? project.getProjectName() : "",
                    project != null ? clientNames.getOrDefault(project.getClientId(), "") : "",
                    row.getStartIpAddress(),
                    row.getEndIpAddress() != null ? row.getEndIpAddress() : row.getStartIpAddress(),
                    row.getStartTime() != null ? row.getStartTime().format(TIME_FORMAT) : "",
                    row.getEndTime() != null ? row.getEndTime().format(TIME_FORMAT) : "",
                    row.getStartTime() != null ? row.getStartTime().format(DATE_DDMMYYYY) : "",
                    row.getEndTime() != null ? row.getEndTime().format(DATE_DDMMYYYY) : "",
                    row.getRefId(),
                    row.getUserId(),
                    computeLoi(row.getStartTime(), row.getEndTime()),
                    ProjectSurveyStatus.labelFor(row.getStatus()),
                    countryName
            );
        }).toList();
    }

    private String computeLoi(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            return "00:00:00";
        }
        long totalSeconds = Math.max(0, Duration.between(start, end).getSeconds());
        long h = totalSeconds / 3600;
        long m = (totalSeconds % 3600) / 60;
        long s = totalSeconds % 60;
        return "%02d:%02d:%02d".formatted(h, m, s);
    }

    public String buildSurveyDetailsCsv(List<SurveyDetailRowDto> rows) {
        StringBuilder csv = new StringBuilder();
        csv.append("SN,Project ID,Supplier ID,Supplier Name,Our PO,Client,Start IP,End IP,Start Time,End Time,Start Date,End Date,Ref ID,UID,Loi,Status,Country\n");

        int idx = 1;
        for (SurveyDetailRowDto row : rows) {
            csv.append(idx++).append(',')
                    .append(row.pid()).append(',')
                    .append(row.gid()).append(',')
                    .append(escapeCsv(row.vendorName())).append(',')
                    .append(escapeCsv(row.projectName())).append(',')
                    .append(escapeCsv(row.clientName())).append(',')
                    .append(nullToEmpty(row.startIpAddress())).append(',')
                    .append(nullToEmpty(row.endIpAddress())).append(',')
                    .append(nullToEmpty(row.startTime())).append(',')
                    .append(nullToEmpty(row.endTime())).append(',')
                    .append(nullToEmpty(row.startDate())).append(',')
                    .append(nullToEmpty(row.endDate())).append(',')
                    .append(escapeCsv(row.refId())).append(',')
                    .append(escapeCsv(row.userId())).append(',')
                    .append(nullToEmpty(row.loi())).append(',')
                    .append(nullToEmpty(row.status())).append(',')
                    .append(escapeCsv(row.countryName())).append('\n');
        }

        return csv.toString();
    }

    private String escapeCsv(String value) {
        return "\"" + (value != null ? value.replace("\"", "\"\"") : "") + "\"";
    }

    private String nullToEmpty(String value) {
        return value != null ? value : "";
    }

    private List<Map<String, String>> statusOptionsList() {
        return Arrays.stream(ProjectStatus.values())
                .sorted(Comparator.comparingInt(ProjectStatus::getCode))
                .map(s -> Map.of("value", String.valueOf(s.getCode()), "label", s.getLabel()))
                .toList();
    }

    private Map<UUID, String> countriesById() {
        return countryRepository.findAll().stream()
                .collect(Collectors.toMap(Country::getId, Country::getName, (a, b) -> a));
    }

    private Map<UUID, String> clientNamesByIds(Collection<UUID> ids) {
        return clientRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Client::getId, Client::getClientName, (a, b) -> a));
    }

    private Map<UUID, String> userNamesByIds(Collection<UUID> ids) {
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getUserName, (a, b) -> a));
    }

    private Map<UUID, String> vendorNamesByIds(Collection<UUID> ids) {
        return vendorRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Vendor::getId, Vendor::getVendorName, (a, b) -> a));
    }
}
