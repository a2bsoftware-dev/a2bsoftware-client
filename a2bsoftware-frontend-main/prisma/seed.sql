-- UUIDv7 fixture ids (regenerated for the UUID primary key migration).
-- Literal values are inlined directly (not MySQL session variables) since
-- `prisma db execute --file` may not guarantee session continuity across statements.
--
-- role_admin       019f74a5-6863-708c-abe7-61c459062383
-- role_manager     019f74a5-6863-7bc7-9cff-f9e6e6ac7744
-- user_admin       019f74a5-6863-76d4-96e0-4fa31da5699d
-- country_us       019f74a5-6863-7492-b6e6-4e3c7a72c4a0
-- country_ca       019f74a5-6863-72a9-99e1-55d75c436d0e
-- country_uk       019f74a5-6863-7659-955b-23025a7cf31d
-- country_de       019f74a5-6863-7b84-af46-68e3a55d8a30
-- country_in       019f74a5-6863-7eca-a414-2f0de3581cd1
-- client_prismmr   019f74a5-6863-75fd-a478-7c58e0723bec
-- client_trayistats 019f74a5-6863-7f51-b9da-c07dd8c2615f
-- client_zamplia   019f74a5-6863-7aea-9f74-932890180cbc
-- vendor_ssi       019f74a5-6863-7060-9b7a-e82178e4df99
-- vendor_dynata    019f74a5-6863-706e-b51b-40325bc634a7
-- vendor_cint      019f74a5-6863-7946-9329-d22463133d61
-- project_101      019f74a5-6863-78c7-8239-e409657848f0
-- project_102      019f74a5-6863-74bb-afca-3b2746138710
-- project_103      019f74a5-6863-72ea-98be-83f08eb8cc6d
-- project_104      019f74a5-6863-7fb4-acee-94de762ed2c3
-- project_105      019f74a5-6863-7281-bf7c-8f502f0d8c3d
-- lang_en          019f74a5-6863-79f6-8e0f-db64a2b4801c
-- lang_es          019f74a5-6863-7723-94f5-f9951afceb43
-- lang_fr          019f74a5-6863-7744-b442-3b25209700dd
-- lang_de          019f74a5-6863-7541-854c-4e88960103dc
-- lang_ja          019f74a5-6863-7b0b-b51b-24d47900d101
-- curr_usd         019f74a5-6863-786e-bdae-df4ccea3a0ff
-- curr_eur         019f74a5-6863-715d-880d-78595c62a74c
-- curr_gbp         019f74a5-6863-7ebf-af35-a34f37358cca
-- curr_cad         019f74a5-6863-75bd-b78c-8f8df683f2e6
-- curr_inr         019f74a5-6863-7553-b9a1-951ebb124937
-- curr_jpy         019f74a5-6863-7f24-b76f-32a9646901c6

INSERT INTO settings (id, param, value) VALUES
('019f74a5-6863-7474-90df-19058861d482', 'fevico_image', 'next.svg'),
('019f74a5-6863-72b8-a513-88495ca1708d', 'loader_image', 'next.svg'),
('019f74a5-6863-779d-a2cb-0d744995e511', 'small_image', 'next.svg'),
('019f74a5-6863-7309-9826-17c2996f3aba', 'show_client_api', '1'),
('019f74a5-6863-7237-b6c1-4720e981080c', 'show_setting', '1')
ON DUPLICATE KEY UPDATE value=VALUES(value);

INSERT INTO roles (id, name, status) VALUES
('019f74a5-6863-708c-abe7-61c459062383', 'Admin', 1),
('019f74a5-6863-7bc7-9cff-f9e6e6ac7744', 'Manager', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO client_user_priv (id, user_type_id, access_right_id) VALUES
('019f74a5-6864-7000-8000-000000000001', '019f74a5-6863-708c-abe7-61c459062383', '1,6,10,14,18,19,20,21'),
('019f74a5-6864-7000-8000-000000000002', '019f74a5-6863-7bc7-9cff-f9e6e6ac7744', '1,6,14,18,19')
ON DUPLICATE KEY UPDATE access_right_id=VALUES(access_right_id);

INSERT INTO users (id, user_name, email, password, role_id, wallet_balance) VALUES
('019f74a5-6863-76d4-96e0-4fa31da5699d', 'admin', 'admin@a2bsurvey.com', '$2y$10$HzuuAMFqvqfJFB7AwOBKKWkYbPlXpz1L/RWMcAX0zp8=', '019f74a5-6863-708c-abe7-61c459062383', 0)
ON DUPLICATE KEY UPDATE user_name=VALUES(user_name);

INSERT INTO countries (id, name, countryID) VALUES
('019f74a5-6863-7492-b6e6-4e3c7a72c4a0', 'United States', 1),
('019f74a5-6863-72a9-99e1-55d75c436d0e', 'Canada', 2),
('019f74a5-6863-7659-955b-23025a7cf31d', 'United Kingdom', 3),
('019f74a5-6863-7b84-af46-68e3a55d8a30', 'Germany', 4),
('019f74a5-6863-7eca-a414-2f0de3581cd1', 'India', 5)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO languages (id, language_name) VALUES
('019f74a5-6863-79f6-8e0f-db64a2b4801c', 'English'),
('019f74a5-6863-7723-94f5-f9951afceb43', 'Spanish'),
('019f74a5-6863-7744-b442-3b25209700dd', 'French'),
('019f74a5-6863-7541-854c-4e88960103dc', 'German'),
('019f74a5-6863-7b0b-b51b-24d47900d101', 'Japanese')
ON DUPLICATE KEY UPDATE language_name=VALUES(language_name);

INSERT INTO currencies (id, currency_name) VALUES
('019f74a5-6863-786e-bdae-df4ccea3a0ff', 'USD'),
('019f74a5-6863-715d-880d-78595c62a74c', 'EUR'),
('019f74a5-6863-7ebf-af35-a34f37358cca', 'GBP'),
('019f74a5-6863-75bd-b78c-8f8df683f2e6', 'CAD'),
('019f74a5-6863-7553-b9a1-951ebb124937', 'INR'),
('019f74a5-6863-7f24-b76f-32a9646901c6', 'JPY')
ON DUPLICATE KEY UPDATE currency_name=VALUES(currency_name);

INSERT INTO clients (id, clientName) VALUES
('019f74a5-6863-75fd-a478-7c58e0723bec', 'PrismMR Panels'),
('019f74a5-6863-7f51-b9da-c07dd8c2615f', 'Trayistats Inc'),
('019f74a5-6863-7aea-9f74-932890180cbc', 'Zamplia Router')
ON DUPLICATE KEY UPDATE clientName=VALUES(clientName);

INSERT INTO vendors (id, vendorName, apiToken) VALUES
('019f74a5-6863-7060-9b7a-e82178e4df99', 'Survey Sampling Int', 'token1'),
('019f74a5-6863-706e-b51b-40325bc634a7', 'Dynata Panels', 'token2'),
('019f74a5-6863-7946-9329-d22463133d61', 'Cint Group', 'token3')
ON DUPLICATE KEY UPDATE vendorName=VALUES(vendorName);

INSERT INTO projects (id, project_name, status, client_id, req_complete, loi, ir, cpc, vendor_cpi, approved, client_api_data, country_id, language_id, currency_id) VALUES
('019f74a5-6863-78c7-8239-e409657848f0', 'US Consumer Tech Survey A', 3, '019f74a5-6863-75fd-a478-7c58e0723bec', 500, 15, 80, 2.50, 1.50, 1, 0, '019f74a5-6863-7492-b6e6-4e3c7a72c4a0', '019f74a5-6863-79f6-8e0f-db64a2b4801c', '019f74a5-6863-786e-bdae-df4ccea3a0ff'),
('019f74a5-6863-74bb-afca-3b2746138710', 'CA Automotive Study', 1, '019f74a5-6863-7f51-b9da-c07dd8c2615f', 300, 10, 70, 3.00, 2.00, 1, 0, '019f74a5-6863-72a9-99e1-55d75c436d0e', '019f74a5-6863-79f6-8e0f-db64a2b4801c', '019f74a5-6863-75bd-b78c-8f8df683f2e6'),
('019f74a5-6863-72ea-98be-83f08eb8cc6d', 'UK Financial Trends', 2, '019f74a5-6863-7aea-9f74-932890180cbc', 400, 12, 60, 4.00, 3.20, 1, 0, '019f74a5-6863-7659-955b-23025a7cf31d', '019f74a5-6863-79f6-8e0f-db64a2b4801c', '019f74a5-6863-7ebf-af35-a34f37358cca'),
('019f74a5-6863-7fb4-acee-94de762ed2c3', 'DE Retail Feedback', 4, '019f74a5-6863-75fd-a478-7c58e0723bec', 250, 8, 90, 1.80, 1.20, 1, 0, '019f74a5-6863-7b84-af46-68e3a55d8a30', '019f74a5-6863-7541-854c-4e88960103dc', '019f74a5-6863-715d-880d-78595c62a74c'),
('019f74a5-6863-7281-bf7c-8f502f0d8c3d', 'IN Telecom Survey', 5, '019f74a5-6863-7f51-b9da-c07dd8c2615f', 600, 20, 50, 2.00, 1.20, 1, 0, '019f74a5-6863-7eca-a414-2f0de3581cd1', '019f74a5-6863-79f6-8e0f-db64a2b4801c', '019f74a5-6863-7553-b9a1-951ebb124937')
ON DUPLICATE KEY UPDATE project_name=VALUES(project_name);

-- Seed Today's Survey transactions
INSERT INTO start_survey_informations (id, pid, gid, user_id, ref_id, start_ip_address, end_ip_address, status, start_time, end_time, date) VALUES
('019f74a5-6863-7d6d-8534-0dd36a669412', '019f74a5-6863-78c7-8239-e409657848f0', '019f74a5-6863-7060-9b7a-e82178e4df99', 'user_001', 'ref_001', '192.168.1.1', '192.168.1.1', 1, NOW(), NOW(), CURDATE()),
('019f74a5-6863-70b6-833e-f95c62565a82', '019f74a5-6863-74bb-afca-3b2746138710', '019f74a5-6863-706e-b51b-40325bc634a7', 'user_002', 'ref_002', '192.168.1.2', '192.168.1.2', 2, NOW(), NOW(), CURDATE()),
('019f74a5-6863-7c2c-a14b-4d9c2624b8f6', '019f74a5-6863-72ea-98be-83f08eb8cc6d', '019f74a5-6863-7946-9329-d22463133d61', 'user_003', 'ref_003', '192.168.1.3', '192.168.1.3', 3, NOW(), NOW(), CURDATE()),
('019f74a5-6863-7af7-a6a5-773d37dea48b', '019f74a5-6863-7fb4-acee-94de762ed2c3', '019f74a5-6863-7060-9b7a-e82178e4df99', 'user_004', 'ref_004', '192.168.1.4', '192.168.1.4', 4, NOW(), NOW(), CURDATE()),
('019f74a5-6863-766d-a263-2b595cf7cd9c', '019f74a5-6863-78c7-8239-e409657848f0', '019f74a5-6863-706e-b51b-40325bc634a7', 'user_005', 'ref_005', '192.168.1.5', NULL, 0, NOW(), NULL, CURDATE())
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);
