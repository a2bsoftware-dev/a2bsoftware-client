# API Call Usage Matrix - A2B Survey Router

This document details the usage mapping for all internally and externally integrated API endpoints.

---

## 📊 1. API Usage Matrix

| API Endpoint | HTTP Method | Purpose | Called From | Controller | Database Tables | External Services | Authentication Required | Response Type | Possible Errors |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/survey-start` | `GET` | Main entrypoint for incoming respondents | Vendor redirection link | `LinkController` | `projects`, `countries`, `apply_qualifications`, `manage_suppliers` | Zamplia API (conditional) | No | HTTP 302 Redirect / HTML | `Country mismatch`, `device mismatch`, `answer mismatch` |
| `/client-redirect-url` | `GET` | Reconcile respondent completion callbacks | Client survey redirect | `LinkController` | `start_survey_informations`, `manage_suppliers`, `projects` | Vendor panels redirection | No | HTTP 302 Redirect / HTML | `Project status mismatch`, `User id Already exist`, `IP mismatch` |
| `/api/get-language` | `GET` | Pull localized language lists | Integrated Vendors | `ClientApiDataController`| `languages`, `countries` | None | Yes (`X-API-TOKEN`) | JSON | `API token missing`, `Invalid API token` |
| `/api/get-allocated-surveys`| `GET` | Fetch active client survey campaigns | Integrated Vendors | `ClientApiDataController`| `projects` | Zamplia API | Yes (`X-API-TOKEN`) | JSON | `API token missing`, `Invalid API token` |
| `/api/generate-survey-link` | `GET` | Generate routing token URLs | Integrated Vendors | `ClientApiDataController`| `projects`, `vendors` | Zamplia API | Yes (`X-API-TOKEN`) | JSON | `API token missing`, `No Survey fetched`, `Invalid API token` |
| `/api/sync-projects` | `GET` | Sync projects from PrismMR | Cron job / Admin request | `AdminA2bController` | `projects` | PrismMR Panel API | No | JSON | `API failed` |
| `/api/get-from-a2b-project` | `GET` | Fetch daily created projects | Central system check | `AdminA2bController` | `projects` | None | No | JSON | None |
| `/api/getProject` | `POST` | Auto-complete project search | Admin UI request | `ExportDashboardController` | `projects` | None | Yes (Session) | JSON | `Unauthorised` |
| `/api/store-dash-prismr-project` | `GET` | Sync projects from Desh Dashboard | Cron job / Admin request | `ExportDashboardController` | `projects` | Desh PrismMR API | No | JSON | `API failed` |
