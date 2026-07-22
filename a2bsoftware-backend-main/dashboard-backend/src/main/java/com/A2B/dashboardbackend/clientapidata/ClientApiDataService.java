package com.A2B.dashboardbackend.clientapidata;

import com.A2B.dashboardbackend.clients.Client;
import com.A2B.dashboardbackend.clients.ClientRepository;
import com.A2B.dashboardbackend.common.PagedResult;
import com.A2B.dashboardbackend.countries.Country;
import com.A2B.dashboardbackend.countries.CountryRepository;
import com.A2B.dashboardbackend.currencies.Currency;
import com.A2B.dashboardbackend.currencies.CurrencyRepository;
import com.A2B.dashboardbackend.languages.Language;
import com.A2B.dashboardbackend.languages.LanguageRepository;
import com.A2B.dashboardbackend.projects.Project;
import com.A2B.dashboardbackend.projects.ProjectRepository;
import com.A2B.dashboardbackend.projects.ProjectStatus;
import com.A2B.dashboardbackend.qualifications.ApplyQualification;
import com.A2B.dashboardbackend.qualifications.ApplyQualificationRepository;
import com.A2B.dashboardbackend.qualifications.Option;
import com.A2B.dashboardbackend.qualifications.OptionRepository;
import com.A2B.dashboardbackend.qualifications.Question;
import com.A2B.dashboardbackend.qualifications.QuestionRepository;
import com.A2B.dashboardbackend.users.User;
import com.A2B.dashboardbackend.users.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ClientApiDataService {

    private static final DateTimeFormatter CREATED_AT_FORMAT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final String DEFAULT_CURRENCY_NAME = "USD";
    private static final String DEFAULT_CLIENT_NAME = "Zamplia Router";
    private static final String DEFAULT_API_NAME = "Zamplia";
    // Matches the original hardcoded default for freshly imported/created campaigns (code 3 = "Running").
    private static final int IMPORTED_CAMPAIGN_STATUS = ProjectStatus.RUNNING.getCode();
    // Whitelist of grid columns clickable for sorting - keys mirror the frontend's column identifiers.
    private static final Set<String> SORTABLE_COLUMNS = Set.of(
            "surveyId", "projectName", "reqComplete", "loi", "ir", "cpc", "approved", "createdAt");

    private final ProjectRepository projectRepository;
    private final CountryRepository countryRepository;
    private final LanguageRepository languageRepository;
    private final CurrencyRepository currencyRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final ApiSettingRepository apiSettingRepository;
    private final QuestionRepository questionRepository;
    private final OptionRepository optionRepository;
    private final ApplyQualificationRepository applyQualificationRepository;
    private final ZampliaClient zampliaClient;

    public ClientApiDataService(ProjectRepository projectRepository, CountryRepository countryRepository,
                                 LanguageRepository languageRepository, CurrencyRepository currencyRepository,
                                 ClientRepository clientRepository, UserRepository userRepository,
                                 ApiSettingRepository apiSettingRepository, QuestionRepository questionRepository,
                                 OptionRepository optionRepository, ApplyQualificationRepository applyQualificationRepository,
                                 ZampliaClient zampliaClient) {
        this.projectRepository = projectRepository;
        this.countryRepository = countryRepository;
        this.languageRepository = languageRepository;
        this.currencyRepository = currencyRepository;
        this.clientRepository = clientRepository;
        this.userRepository = userRepository;
        this.apiSettingRepository = apiSettingRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.applyQualificationRepository = applyQualificationRepository;
        this.zampliaClient = zampliaClient;
    }

    // ---------------------------------------------------------------- listing

    public PagedResult<ClientApiDataRowDto> listCampaigns(ClientApiDataListFilter filter, int pageNo, int maxPerPage,
                                                           String sortBy, String sortDir) {
        PageRequest pageRequest = PageRequest.of(Math.max(pageNo - 1, 0), maxPerPage, resolveSort(sortBy, sortDir));

        Page<Project> page = projectRepository.findAll(ClientApiDataSpecifications.matching(filter), pageRequest);
        return new PagedResult<>(toRows(page.getContent()), page.getTotalElements());
    }

    private Sort resolveSort(String sortBy, String sortDir) {
        if (sortBy == null || !SORTABLE_COLUMNS.contains(sortBy)) {
            return Sort.by(Sort.Order.desc("topSurvey"), Sort.Order.desc("id"));
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(new Sort.Order(direction, sortBy));
    }

    public List<ClientApiDataRowDto> listCampaignsForExport(ClientApiDataListFilter filter) {
        List<Project> projects = projectRepository.findAll(ClientApiDataSpecifications.matching(filter),
                Sort.by(Sort.Order.desc("topSurvey"), Sort.Order.desc("id")));
        return toRows(projects);
    }

    private List<ClientApiDataRowDto> toRows(List<Project> projects) {
        Map<UUID, String> countryNames = countryRepository.findAll().stream()
                .collect(Collectors.toMap(Country::getId, Country::getName, (a, b) -> a));
        Set<UUID> clientIds = projects.stream().map(Project::getClientId).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> clientNames = clientRepository.findAllById(clientIds).stream()
                .collect(Collectors.toMap(Client::getId, Client::getClientName, (a, b) -> a));
        Set<UUID> userIds = projects.stream()
                .flatMap(p -> java.util.stream.Stream.of(p.getProjectManagerId(), p.getSalesManagerId()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> userNames = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUserName, (a, b) -> a));

        return projects.stream().map(p -> new ClientApiDataRowDto(
                p.getId(), p.getSurveyId(), p.getProjectName(), p.getReqComplete(), p.getLoi(), p.getIr(),
                p.getCpc(), p.getVendorCpi(), p.getSurveyLink(), p.getSurveyTestLink(), p.getLanguageId(),
                p.getCountryId(), countryNames.get(p.getCountryId()), p.getClientId(), clientNames.get(p.getClientId()),
                p.getProjectManagerId(), userNames.get(p.getProjectManagerId()), p.getSalesManagerId(),
                userNames.get(p.getSalesManagerId()), p.getApproved(), p.getTopSurvey(), p.getStatus(),
                ProjectStatus.labelFor(p.getStatus()),
                p.getCreatedAt() != null ? p.getCreatedAt().format(CREATED_AT_FORMAT) : ""
        )).toList();
    }

    // ---------------------------------------------------------------- form data / settings

    public Map<String, Object> getFormData() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("countries", countryRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(Country::getName))
                .map(c -> Map.of("id", c.getId(), "name", c.getName())).toList());
        response.put("languages", languageRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(Language::getLanguageName))
                .map(l -> Map.of("id", l.getId(), "languageName", l.getLanguageName())).toList());
        response.put("clients", clientRepository.findAll().stream()
                .map(c -> Map.of("id", c.getId(), "clientName", c.getClientName())).toList());

        ApiSetting setting = apiSettingRepository.findTopByOrderByIdAsc().orElse(null);
        response.put("settings", setting != null
                ? Map.of("apiName", setting.getApiName(), "clientId", setting.getClientId())
                : null);
        return response;
    }

    public void saveApiSettings(ApiSettingsSaveRequest request) {
        apiSettingRepository.deleteAll();
        ApiSetting setting = new ApiSetting();
        setting.setApiName(request.apiName() != null && !request.apiName().isBlank() ? request.apiName() : DEFAULT_API_NAME);
        setting.setClientId(request.clientId());
        apiSettingRepository.save(setting);
        log.info("Client API settings updated: apiName={}, clientId={}", setting.getApiName(), setting.getClientId());
    }

    private ApiSetting resolveOrCreateApiSetting() {
        return apiSettingRepository.findTopByOrderByIdAsc().orElseGet(() -> {
            ApiSetting setting = new ApiSetting();
            setting.setApiName(DEFAULT_API_NAME);
            setting.setClientId(clientRepository.findByClientNameIgnoreCase(DEFAULT_CLIENT_NAME)
                    .map(Client::getId)
                    .orElseGet(() -> clientRepository.findAll().stream().findFirst().map(Client::getId).orElse(null)));
            return apiSettingRepository.save(setting);
        });
    }

    private UUID defaultCurrencyId() {
        return currencyRepository.findByCurrencyNameIgnoreCase(DEFAULT_CURRENCY_NAME)
                .map(Currency::getId)
                .orElseGet(() -> {
                    log.warn("No '{}' currency found locally - imported campaigns will have no currency set", DEFAULT_CURRENCY_NAME);
                    return null;
                });
    }

    // ---------------------------------------------------------------- manual save (Add/Edit Campaign modal)

    public ClientApiDataSaveResult saveCampaign(ClientApiDataSaveRequest request) {
        if (isBlank(request.surveyId()) || isBlank(request.projectName())
                || request.languageId() == null || request.countryId() == null) {
            return new ClientApiDataSaveResult(false, "Please fill in all required fields.");
        }

        UUID id = request.id();
        Project project = id != null
                ? projectRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Campaign not found: " + id))
                : new Project();

        if (id == null) {
            project.setSurveyId(request.surveyId());
            ApiSetting apiSetting = resolveOrCreateApiSetting();
            project.setClientId(apiSetting != null ? apiSetting.getClientId() : null);
            project.setCurrencyId(defaultCurrencyId());
            project.setProjectManagerId(null);
            project.setSalesManagerId(null);
            project.setStatus(IMPORTED_CAMPAIGN_STATUS);
            project.setClientApiData(1);
            project.setTopSurvey(0);
            project.setCopyForClient(0);
        }

        project.setProjectName(request.projectName());
        project.setReqComplete(request.reqComplete() != null ? request.reqComplete() : 0);
        project.setLoi(request.loi() != null ? request.loi() : 0);
        project.setIr(request.ir() != null ? request.ir() : 0);
        project.setCpc(request.cpc() != null ? request.cpc() : 0d);
        project.setVendorCpi(request.cpc() != null ? request.cpc() : 0d);
        project.setSurveyLink(request.surveyLink() != null ? request.surveyLink() : "");
        project.setLanguageId(request.languageId());
        project.setCountryId(request.countryId());
        project.setApproved(request.approved() != null ? request.approved() : 0);

        projectRepository.save(project);
        log.info("Client API campaign {} ({})", id != null ? "updated" : "created", request.surveyId());

        return new ClientApiDataSaveResult(true,
                id != null ? "Campaign details successfully stored" : "Client API Campaign successfully created");
    }

    // ---------------------------------------------------------------- bulk operations

    public String bulkOperation(BulkOperationRequest request) {
        if (request.projectIds() == null || request.projectIds().isEmpty()) {
            throw new IllegalArgumentException("No projects selected");
        }

        List<Project> campaigns = projectRepository.findAllById(request.projectIds()).stream()
                .filter(p -> p.getClientApiData() != null && p.getClientApiData() == 1)
                .toList();

        int type = request.type() != null ? request.type() : 0;
        return switch (type) {
            case 1 -> {
                projectRepository.deleteAll(campaigns);
                log.info("Deleted {} client API campaigns", campaigns.size());
                yield "Data is successfully deleted";
            }
            case 2 -> {
                campaigns.forEach(p -> p.setApproved(1));
                projectRepository.saveAll(campaigns);
                yield "Data is successfully Approved";
            }
            case 3 -> {
                campaigns.forEach(p -> p.setApproved(0));
                projectRepository.saveAll(campaigns);
                yield "Data is successfully Disapproved";
            }
            default -> throw new IllegalArgumentException("Unknown operation type: " + type);
        };
    }

    // ---------------------------------------------------------------- Zamplia feed sync

    public String syncFeed(UUID targetCountryId) {
        ApiSetting apiSetting = resolveOrCreateApiSetting();

        List<ZampliaSurveyDto> topPick = zampliaClient.getTopPickSurveys();
        List<ZampliaSurveyDto> allocated = zampliaClient.getAllocatedSurveys();

        LinkedHashMap<String, Boolean> uniqueSurveys = new LinkedHashMap<>(); // surveyId -> isTopPick
        LinkedHashMap<String, ZampliaSurveyDto> bySurveyId = new LinkedHashMap<>();
        for (ZampliaSurveyDto s : topPick) {
            uniqueSurveys.putIfAbsent(s.surveyId(), true);
            bySurveyId.putIfAbsent(s.surveyId(), s);
        }
        for (ZampliaSurveyDto s : allocated) {
            uniqueSurveys.putIfAbsent(s.surveyId(), false);
            bySurveyId.putIfAbsent(s.surveyId(), s);
        }

        Set<String> existingSurveyIds = projectRepository.findAll().stream()
                .map(Project::getSurveyId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, UUID> countryIdByName = countryRepository.findAll().stream()
                .collect(Collectors.toMap(c -> c.getName().toLowerCase(), Country::getId, (a, b) -> a));
        Map<String, UUID> languageIdByName = languageRepository.findAll().stream()
                .collect(Collectors.toMap(l -> l.getLanguageName().toLowerCase(), Language::getId, (a, b) -> a));
        UUID fallbackCountryId = countryIdByName.get("united states");
        UUID currencyId = defaultCurrencyId();

        List<Project> toStore = new ArrayList<>();
        String matchedCountryLabel = targetCountryId != null
                ? countryRepository.findById(targetCountryId).map(Country::getName).orElse("selected country")
                : null;

        for (var entry : uniqueSurveys.entrySet()) {
            String surveyId = entry.getKey();
            if (existingSurveyIds.contains(surveyId)) {
                continue;
            }
            ZampliaSurveyDto survey = bySurveyId.get(surveyId);

            String countryName = ZampliaLanguageMapper.countryNameFor(survey.languageCode());
            UUID countryId = countryName != null ? countryIdByName.get(countryName.toLowerCase()) : null;
            if (countryId == null) {
                countryId = fallbackCountryId;
            }

            if (targetCountryId != null && !targetCountryId.equals(countryId)) {
                continue;
            }

            String languageName = ZampliaLanguageMapper.languageNameFor(survey.languageCode());
            UUID languageId = languageIdByName.get(languageName.toLowerCase());

            Project project = new Project();
            project.setSurveyId(surveyId);
            project.setProjectName(survey.name() != null ? survey.name() : "Zamplia Survey " + surveyId);
            project.setReqComplete(survey.totalCompleteRequired() != null ? survey.totalCompleteRequired() : 0);
            project.setLoi(survey.loi() != null ? survey.loi() : 0);
            project.setIr(survey.ir() != null ? survey.ir() : 0);
            project.setCpc(survey.cpi() != null ? survey.cpi() : 0d);
            project.setVendorCpi(survey.cpi() != null ? survey.cpi() : 0d);
            project.setSurveyLink(zampliaClient.buildSurveyLinkTemplate(surveyId));
            project.setSurveyTestLink("");
            project.setLanguageId(languageId);
            project.setCountryId(countryId);
            project.setCurrencyId(currencyId);
            project.setClientId(apiSetting != null ? apiSetting.getClientId() : null);
            project.setProjectManagerId(null);
            project.setSalesManagerId(null);
            project.setStatus(IMPORTED_CAMPAIGN_STATUS);
            project.setTopSurvey(Boolean.TRUE.equals(entry.getValue()) ? 1 : 0);
            project.setClientApiData(1);
            project.setCopyForClient(0);
            project.setApproved(0);

            toStore.add(project);
        }

        if (!toStore.isEmpty()) {
            projectRepository.saveAll(toStore);
        }
        log.info("Zamplia sync stored {} new campaign(s){}", toStore.size(),
                matchedCountryLabel != null ? " for " + matchedCountryLabel : "");

        return matchedCountryLabel != null
                ? "Successfully synced " + toStore.size() + " new " + matchedCountryLabel + " campaigns from Zamplia."
                : "Successfully synchronized surveys! Imported " + toStore.size() + " new campaigns.";
    }

    // ---------------------------------------------------------------- qualifications preview / import

    public List<QualificationPreviewDto> previewQualifications(String surveyId, UUID languageId) {
        int zampLangId = zampliaLanguageIdFor(languageId);

        List<ZampliaQualificationDto> qualifications = zampliaClient.getSurveyQualifications(surveyId);
        if (qualifications.isEmpty()) {
            return List.of();
        }
        List<ZampliaDemographicDto> demographics = zampliaClient.getDemographics(zampLangId);
        Map<String, ZampliaDemographicDto> demoByQuestionId = demographics.stream()
                .collect(Collectors.toMap(ZampliaDemographicDto::questionId, d -> d, (a, b) -> a));

        return qualifications.stream().map(q -> {
            ZampliaDemographicDto demo = demoByQuestionId.get(q.questionId());
            Set<String> qualifyingCodes = q.answerCodes() != null ? Set.copyOf(q.answerCodes()) : Set.of();

            String questionText = demo != null ? demo.questionText() : "Question ID: " + q.questionId();
            String questionName = demo != null ? demo.demographicName() : "Custom qualification";
            String questionType = demo != null ? demo.questionType() : "Range";

            boolean resolved = demo != null && demo.answerCodes() != null && !demo.answerCodes().isEmpty();
            List<QualificationOptionDto> options = resolved
                    ? demo.answerCodes().stream().map(opt -> new QualificationOptionDto(
                            opt.answerCode(),
                            opt.answerText() != null ? opt.answerText() : "Option " + opt.answerCode(),
                            qualifyingCodes.contains(opt.answerCode()), false)).toList()
                    : qualifyingCodes.stream().map(code -> new QualificationOptionDto(code, code, true, true)).toList();

            return new QualificationPreviewDto(q.questionId(), questionName, questionText, questionType, resolved, options);
        }).toList();
    }

    @Transactional
    public String importQualifications(UUID projectId, String surveyId, UUID languageId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Campaign not found: " + projectId));

        List<QualificationPreviewDto> previews = previewQualifications(surveyId, languageId);
        if (previews.isEmpty()) {
            return "No screening qualifications found on Zamplia for this Survey ID.";
        }

        List<Question> oldQuestions = questionRepository.findByProjectId(projectId);
        List<UUID> oldQuestionIds = oldQuestions.stream().map(Question::getId).toList();
        optionRepository.deleteByQuestionIdIn(oldQuestionIds);
        applyQualificationRepository.deleteByProjectId(projectId);
        questionRepository.deleteByProjectId(projectId);

        int questionCount = 0;
        int optionCount = 0;

        for (QualificationPreviewDto preview : previews) {
            int type = switch (preview.questionType() != null ? preview.questionType() : "") {
                case "Checkbox", "Multiple Select" -> 2;
                case "Open End", "Text" -> 3;
                default -> 1;
            };

            Question question = new Question();
            question.setQuestionId(preview.questionId());
            question.setProjectId(projectId);
            question.setCountryId(project.getCountryId());
            question.setQuestionName(preview.questionText());
            question.setType(type);
            questionRepository.save(question);
            questionCount++;

            List<Option> options = preview.options().stream().map(opt -> {
                Option option = new Option();
                option.setQuestionId(question.getId());
                option.setAnswerId(opt.answerCode());
                option.setAnswerTitle(opt.answerText());
                option.setAnswer(opt.isCorrect() ? 1 : 0);
                return option;
            }).toList();
            optionRepository.saveAll(options);
            optionCount += options.size();

            ApplyQualification apply = new ApplyQualification();
            apply.setProjectId(projectId);
            apply.setQuestionId(question.getId());
            apply.setOptionId(null);
            applyQualificationRepository.save(apply);
        }

        log.info("Imported {} questions / {} options for project {}", questionCount, optionCount, projectId);
        return "Successfully imported " + questionCount + " questions and " + optionCount
                + " options. Qualifications are now active for routing!";
    }

    private int zampliaLanguageIdFor(UUID languageId) {
        String languageName = languageId != null
                ? languageRepository.findById(languageId).map(Language::getLanguageName).orElse(null)
                : null;
        return ZampliaLanguageMapper.zampliaLanguageIdFor(languageName);
    }

    // ---------------------------------------------------------------- CSV import / export

    public CsvImportResult importCsv(MultipartFile file) {
        List<List<String>> rows;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            rows = CsvUtil.parse(reader);
        } catch (IOException e) {
            throw new java.io.UncheckedIOException("Failed to read uploaded CSV file", e);
        }

        if (rows.size() < 2) {
            return new CsvImportResult(0, 0, List.of("CSV file has no data rows"));
        }

        List<String> header = rows.get(0);
        Map<String, Integer> colIndex = new LinkedHashMap<>();
        for (int i = 0; i < header.size(); i++) {
            colIndex.put(header.get(i).trim(), i);
        }

        Integer surveyIdCol = colIndex.get("surveyId");
        if (surveyIdCol == null) {
            return new CsvImportResult(0, 0, List.of("CSV is missing the required 'surveyId' column"));
        }

        int created = 0;
        int updated = 0;
        List<String> errors = new ArrayList<>();
        UUID currencyId = defaultCurrencyId();
        ApiSetting apiSetting = resolveOrCreateApiSetting();

        for (int r = 1; r < rows.size(); r++) {
            List<String> row = rows.get(r);
            String surveyId = cell(row, surveyIdCol);
            if (isBlank(surveyId)) {
                errors.add("Row " + (r + 1) + ": missing surveyId, skipped");
                continue;
            }

            Project existing = projectRepository.findAll().stream()
                    .filter(p -> surveyId.equals(p.getSurveyId()) && p.getClientApiData() != null && p.getClientApiData() == 1)
                    .findFirst().orElse(null);

            try {
                if (existing != null) {
                    applyIfPresent(row, colIndex, "project_name", existing::setProjectName);
                    applyIntIfPresent(row, colIndex, "req_complete", existing::setReqComplete);
                    applyIntIfPresent(row, colIndex, "loi", existing::setLoi);
                    applyIntIfPresent(row, colIndex, "ir", existing::setIr);
                    applyDoubleIfPresent(row, colIndex, "cpc", existing::setCpc);
                    applyDoubleIfPresent(row, colIndex, "vendor_cpi", existing::setVendorCpi);
                    applyIntIfPresent(row, colIndex, "approved", existing::setApproved);
                    applyUuidIfPresent(row, colIndex, "country_id", existing::setCountryId);
                    applyUuidIfPresent(row, colIndex, "language_id", existing::setLanguageId);
                    applyIfPresent(row, colIndex, "survey_link", existing::setSurveyLink);
                    applyIfPresent(row, colIndex, "survey_test_link", existing::setSurveyTestLink);
                    applyIfPresent(row, colIndex, "device", existing::setDevice);
                    applyIfPresent(row, colIndex, "security_check_list", existing::setSecurityCheckList);

                    projectRepository.save(existing);
                    updated++;
                } else {
                    String projectName = cell(row, colIndex.get("project_name"));
                    UUID countryId = parseUuidCell(row, colIndex.get("country_id"));
                    UUID languageId = parseUuidCell(row, colIndex.get("language_id"));

                    if (isBlank(projectName) || countryId == null || languageId == null) {
                        errors.add("Row " + (r + 1) + ": new campaign requires project_name, country_id and language_id, skipped");
                        continue;
                    }

                    Project project = new Project();
                    project.setSurveyId(surveyId);
                    project.setProjectName(projectName);
                    project.setCountryId(countryId);
                    project.setLanguageId(languageId);
                    project.setReqComplete(parseIntCell(row, colIndex.get("req_complete"), 0));
                    project.setLoi(parseIntCell(row, colIndex.get("loi"), 0));
                    project.setIr(parseIntCell(row, colIndex.get("ir"), 0));
                    project.setCpc(parseDoubleCell(row, colIndex.get("cpc"), 0d));
                    project.setVendorCpi(parseDoubleCell(row, colIndex.get("vendor_cpi"), 0d));
                    project.setSurveyLink(cellOrEmpty(row, colIndex.get("survey_link")));
                    project.setSurveyTestLink(cellOrEmpty(row, colIndex.get("survey_test_link")));
                    project.setDevice(cellOrEmpty(row, colIndex.get("device")));
                    project.setSecurityCheckList(cellOrEmpty(row, colIndex.get("security_check_list")));
                    project.setCurrencyId(currencyId);
                    project.setClientId(apiSetting != null ? apiSetting.getClientId() : null);
                    project.setProjectManagerId(null);
                    project.setSalesManagerId(null);
                    project.setStatus(IMPORTED_CAMPAIGN_STATUS);
                    project.setClientApiData(1);
                    project.setApproved(parseIntCell(row, colIndex.get("approved"), 0));

                    projectRepository.save(project);
                    created++;
                }
            } catch (Exception ex) {
                log.error("Error importing client API data CSV row {}", r + 1, ex);
                errors.add("Row " + (r + 1) + ": " + ex.getMessage());
            }
        }

        return new CsvImportResult(created, updated, errors);
    }

    public String buildCsv(List<ClientApiDataRowDto> rows) {
        StringBuilder csv = new StringBuilder();
        csv.append("surveyId,project_name,country_id,country_name,language_id,req_complete,loi,ir,cpc,vendor_cpi,")
           .append("approved,status_id,status,clientName,project_manager,salesManagers,survey_link,survey_test_link,created_at\n");

        for (ClientApiDataRowDto row : rows) {
            csv.append(escapeCsv(row.surveyId())).append(',')
               .append(escapeCsv(row.projectName())).append(',')
               .append(nullToEmpty(row.countryId())).append(',')
               .append(escapeCsv(row.countryName())).append(',')
               .append(nullToEmpty(row.languageId())).append(',')
               .append(nullToEmpty(row.reqComplete())).append(',')
               .append(nullToEmpty(row.loi())).append(',')
               .append(nullToEmpty(row.ir())).append(',')
               .append(nullToEmpty(row.cpc())).append(',')
               .append(nullToEmpty(row.vendorCpi())).append(',')
               .append(nullToEmpty(row.approved())).append(',')
               .append(nullToEmpty(row.statusId())).append(',')
               .append(escapeCsv(row.status())).append(',')
               .append(escapeCsv(row.clientName())).append(',')
               .append(escapeCsv(row.projectManager())).append(',')
               .append(escapeCsv(row.salesManagers())).append(',')
               .append(escapeCsv(row.surveyLink())).append(',')
               .append(escapeCsv(row.surveyTestLink())).append(',')
               .append(escapeCsv(row.createdAt())).append('\n');
        }
        return csv.toString();
    }

    // ---------------------------------------------------------------- small helpers

    private void applyIfPresent(List<String> row, Map<String, Integer> colIndex, String col, java.util.function.Consumer<String> setter) {
        Integer idx = colIndex.get(col);
        String value = cell(row, idx);
        if (value != null) setter.accept(value);
    }

    private void applyIntIfPresent(List<String> row, Map<String, Integer> colIndex, String col, java.util.function.Consumer<Integer> setter) {
        Integer idx = colIndex.get(col);
        String value = cell(row, idx);
        if (value != null && !value.isBlank()) {
            try {
                setter.accept(Integer.parseInt(value));
            } catch (NumberFormatException ignored) {
            }
        }
    }

    private void applyDoubleIfPresent(List<String> row, Map<String, Integer> colIndex, String col, java.util.function.Consumer<Double> setter) {
        Integer idx = colIndex.get(col);
        String value = cell(row, idx);
        if (value != null && !value.isBlank()) {
            try {
                setter.accept(Double.parseDouble(value));
            } catch (NumberFormatException ignored) {
            }
        }
    }

    private void applyUuidIfPresent(List<String> row, Map<String, Integer> colIndex, String col, java.util.function.Consumer<UUID> setter) {
        Integer idx = colIndex.get(col);
        String value = cell(row, idx);
        if (value != null && !value.isBlank()) {
            try {
                setter.accept(UUID.fromString(value));
            } catch (IllegalArgumentException ignored) {
            }
        }
    }

    private UUID parseUuidCell(List<String> row, Integer idx) {
        String value = cell(row, idx);
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private int parseIntCell(List<String> row, Integer idx, int fallback) {
        String value = cell(row, idx);
        if (value == null || value.isBlank()) return fallback;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private double parseDoubleCell(List<String> row, Integer idx, double fallback) {
        String value = cell(row, idx);
        if (value == null || value.isBlank()) return fallback;
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private String cell(List<String> row, Integer idx) {
        if (idx == null || idx >= row.size()) return null;
        String value = row.get(idx);
        return value != null ? value.trim() : null;
    }

    private String cellOrEmpty(List<String> row, Integer idx) {
        String value = cell(row, idx);
        return value != null ? value : "";
    }

    private String escapeCsv(Object value) {
        String str = value != null ? String.valueOf(value) : "";
        if (str.contains(",") || str.contains("\"") || str.contains("\n")) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }

    private String nullToEmpty(Object value) {
        return value != null ? String.valueOf(value) : "";
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
