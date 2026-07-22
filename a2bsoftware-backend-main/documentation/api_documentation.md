# Complete API Reference Manual - A2B Survey Router

This document lists all API endpoints exposed by the A2B Survey Router, including request/response formats, middleware security, and an OpenAPI 3.0 specification.

---

## 🔒 1. Authentication & Security
The system uses two primary authentication methods:
1. **Administrative Session**: Cookie-based authentication for Web UI requests (protected by the `auth` middleware).
2. **Vendor API Token**: Header-based authentication for secure integrations (protected by the `vendor.auth` middleware). Vendors must send the API token in the header:
   ```http
   X-API-TOKEN: your_secret_vendor_token
   ```

---

## 📋 2. Endpoint Registry

### A. Public Routing Gateways (Browser Web Routes)

#### 1. Start Respondent Survey Route
* **Endpoint**: `/survey-start`
* **Method**: `GET`
* **Purpose**: Gateway for incoming respondents. Validates demographics and routes to client platforms.
* **Query Parameters**:
  - `pid` (string, Required): The target project ID (e.g. `12`).
  - `gid` (string, Required): The supplier/group ID (e.g. `14`).
  - `user_id` (string, Required): The respondent ID from the vendor's platform.
* **Process**: Verifies location (IP) and device. If qualified, logs start state and redirects user. If disqualified, shows error view.

#### 2. Reconcile Redirect Callback Route
* **Endpoint**: `/client-redirect-url`
* **Method**: `GET`
* **Purpose**: Endpoint where client survey platforms send respondents back to A2B when finished.
* **Query Parameters**:
  - `uid` (string, Required): The encrypted transaction ID (`ref_id`).
  - `status` (string, Required): The completion outcome. One of: `complete`, `disqualify`, `quotaFull`, `securityTerm`.
* **Process**: Decrypts `uid`, updates `start_survey_informations`, runs IP comparison checks, updates profits, and redirects user to Vendor's target callback link.

---

### B. Administrative & Synchronization Routes

#### 1. Search Active Projects
* **Endpoint**: `/api/getProject`
* **Method**: `POST`
* **Purpose**: Auto-complete utility query to search projects.
* **Headers**: `Content-Type: application/json`, Cookie Session Auth
* **Request Body**:
  ```json
  { "term": "Project Name Query" }
  ```
* **Response (200 OK)**:
  ```json
  [
    { "id": 12, "label": "Project A2B Sample Survey" }
  ]
  ```

#### 2. Synchronize Projects from Parent Panel
* **Endpoint**: `/api/sync-projects`
* **Method**: `GET`
* **Purpose**: Triggers a fetch routine to import active surveys from parent endpoint (`https://panelsurvey.prismmr.com/api/get-a2b-project`).
* **Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Projects synced successfully"
  }
  ```

---

### C. Vendor API Integration Routes (Protected by `vendor.auth` Middleware)

#### 1. Retrieve Available Languages
* **Endpoint**: `/api/get-language`
* **Method**: `GET`
* **Headers**: `X-API-TOKEN: <vendor_token>`
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "status": 200,
    "message": "Languages fetched successfully",
    "total": 2,
    "data": [
      {
        "LanguageId": 1,
        "LanguageCode": "en-US",
        "Country": "United States",
        "CountryCode": "US"
      }
    ]
  }
  ```

#### 2. Fetch Allocated Surveys Inventory
* **Endpoint**: `/api/get-allocated-surveys`
* **Method**: `GET`
* **Headers**: `X-API-TOKEN: <vendor_token>`
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "status": 200,
    "message": "Allocated surveys fetched successfully",
    "total": 1,
    "data": [
      {
        "SurveyId": 4567,
        "Name": "US Consumer Tech Survey",
        "TotalCompleteRequired": 500,
        "LOI": 15,
        "IR": 80,
        "CPI": 1.50,
        "LanguageId": 1
      }
    ]
  }
  ```

#### 3. Generate Secure Survey Target Link
* **Endpoint**: `/api/generate-survey-link`
* **Method**: `GET`
* **Headers**: `X-API-TOKEN: <vendor_token>`
* **Query Parameters**:
  - `SurveyId` (int, Required): The target survey ID.
  - `IpAddress` (string, Required): The respondent's IP address.
  - `TransactionId` (string, Required): The respondent ID from the vendor system.
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "status": 200,
    "message": "Survey link generated successfully",
    "data": "https://panelsurvey.prismmr.com/survey-start?pid=12&gid=4&user_id=trans_id_999"
  }
  ```

---

## 📝 3. OpenAPI 3.0 Specification (YAML)

Below is the OpenAPI specification mapping the vendor-facing integration APIs.

```yaml
openapi: 3.0.3
info:
  title: A2B Survey Router Vendor API
  description: Secure endpoints for vendor platforms to query languages, allocated survey inventories, and generate secure routing links.
  version: 1.0.0
servers:
  - url: https://dashboard.a2bsample.store/api
paths:
  /get-language:
    get:
      summary: Retrieve localized languages.
      security:
        - VendorAuth: []
      responses:
        '200':
          description: List of supported languages.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  message:
                    type: string
                  data:
                    type: array
                    items:
                      type: object

  /get-allocated-surveys:
    get:
      summary: Fetch active survey campaigns.
      security:
        - VendorAuth: []
      responses:
        '200':
          description: Available surveys inventory.
          content:
            application/json:
              schema:
                type: object

  /generate-survey-link:
    get:
      summary: Generate a secure routing token redirect link.
      security:
        - VendorAuth: []
      parameters:
        - name: SurveyId
          in: query
          required: true
          schema:
            type: integer
        - name: IpAddress
          in: query
          required: true
          schema:
            type: string
        - name: TransactionId
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Return target redirection URL.
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: string

components:
  securitySchemes:
    VendorAuth:
      type: apiKey
      in: header
      name: X-API-TOKEN
```
