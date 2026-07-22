<#import "field.ftl" as field>
<#import "footer.ftl" as loginFooter>
<#macro username>
  <#assign label>
    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
  </#assign>
  <@field.group name="username" label=label>
    <div class="${properties.kcInputGroup}">
      <div class="${properties.kcInputGroupItemClass} ${properties.kcFill}">
        <span class="${properties.kcInputClass} ${properties.kcFormReadOnlyClass}">
          <input id="kc-attempted-username" value="${auth.attemptedUsername}" readonly>
        </span>
      </div>
      <div class="${properties.kcInputGroupItemClass}">
        <button id="reset-login" class="${properties.kcFormPasswordVisibilityButtonClass} kc-login-tooltip" type="button"
              aria-label="${msg('restartLoginTooltip')}" onclick="location.href='${url.loginRestartFlowUrl}'">
            <i class="fa-sync-alt fas" aria-hidden="true"></i>
            <span class="kc-tooltip-text">${msg("restartLoginTooltip")}</span>
        </button>
      </div>
    </@field.group>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}"<#if realm.internationalizationEnabled> lang="${locale.currentLanguageTag}" dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";

        startSessionPolling(
            "${url.ssoLoginInOtherTabsUrl?no_esc}"
        );
    </script>
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!}">

<div class="a2b-login-page">
  <div class="a2b-login-brand">
    <div class="a2b-brand-logo">
      <span class="a2b-logo-icon">
        <img src="${url.resourcesPath}/img/logo.png" alt="A2B Software" />
      </span>
      <span>A2B Software</span>
    </div>

    <div class="a2b-brand-hero">
      <h1>Elevate your enterprise operations.</h1>
    </div>

    <div class="a2b-brand-features">
      <h2>Why Choose A2B Software?</h2>

      <div class="a2b-feature">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M8 12.5L10.5 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div>
          <strong>Seamless Integration</strong>
          <p>Connect your existing tools with zero friction and robust API support.</p>
        </div>
      </div>

      <div class="a2b-feature">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 20V10M12 20V4M20 20V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div>
          <strong>Real-time Analytics</strong>
          <p>Actionable insights delivered instantly through dynamic dashboards.</p>
        </div>
      </div>

      <div class="a2b-feature">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L19 6V11C19 15.4 16 19.2 12 21C8 19.2 5 15.4 5 11V6L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        <div>
          <strong>Enterprise-Grade Security</strong>
          <p>Bank-level encryption and compliance built into the core architecture.</p>
        </div>
      </div>

      <div class="a2b-feature">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 12L16 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <div>
          <strong>High-Performance Infrastructure</strong>
          <p>Scalable architecture designed for speed and reliability at any load.</p>
        </div>
      </div>
    </div>

    <div class="a2b-brand-footer">&copy; ${.now?string("yyyy")} A2B Software. All rights reserved.</div>
  </div>

  <div class="a2b-login-formcol">
    <div class="${properties.kcLogin!}">
      <div class="${properties.kcLoginContainer!}">
        <header id="kc-header" class="pf-v5-c-login__header">
          <div id="kc-header-wrapper"
                  class="pf-v5-c-brand">${kcSanitize(msg("loginTitleHtml",(realm.displayNameHtml!'')))?no_esc}</div>
        </header>
        <main class="${properties.kcLoginMain!}">
          <div class="${properties.kcLoginMainHeader!}">
            <h1 class="${properties.kcLoginMainTitle!}" id="kc-page-title"><#nested "header"></h1>
            <p class="a2b-login-subtitle">${msg("loginSubtitle")}</p>
            <#if realm.internationalizationEnabled  && locale.supported?size gt 1>
            <div class="${properties.kcLoginMainHeaderUtilities!}">
              <div class="${properties.kcInputClass!}">
                <select
                  aria-label="${msg("languages")}"
                  id="login-select-toggle"
                  onchange="if (this.value) window.location.href=this.value"
                >
                  <#list locale.supported?sort_by("label") as l>
                    <option
                      value="${l.url}"
                      ${(l.languageTag == locale.currentLanguageTag)?then('selected','')}
                    >
                      ${l.label}
                    </option>
                  </#list>
                </select>
                <span class="${properties.kcFormControlUtilClass}">
                  <span class="${properties.kcFormControlToggleIcon!}">
                    <svg
                      class="pf-v5-svg"
                      viewBox="0 0 320 512"
                      fill="currentColor"
                      aria-hidden="true"
                      role="img"
                      width="1em"
                      height="1em"
                    >
                      <path
                        d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"
                      >
                      </path>
                    </svg>
                  </span>
                </span>
              </div>
            </div>
            </#if>
          </div>
          <div class="${properties.kcLoginMainBody!}">
            <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
                <#if displayRequiredFields>
                    <div class="${properties.kcContentWrapperClass!}">
                        <div class="${properties.kcLabelWrapperClass!} subtitle">
                            <span class="${properties.kcInputHelperTextItemTextClass!}">
                              <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                            </span>
                        </div>
                    </div>
                </#if>
            <#else>
                <#if displayRequiredFields>
                    <div class="${properties.kcContentWrapperClass!}">
                        <div class="${properties.kcLabelWrapperClass!} subtitle">
                            <span class="${properties.kcInputHelperTextItemTextClass!}">
                              <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                            </span>
                        </div>
                        <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                            <#nested "show-username">
                            <@username />
                        </div>
                    </div>
                <#else>
                    <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                      <#nested "show-username">
                      <@username />
                    </div>
                </#if>
            </#if>

            <#-- App-initiated actions should not see warning messages about the need to complete the action -->
            <#-- during login.                                                                               -->
            <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                <div class="${properties.kcAlertClass!} pf-m-${(message.type = 'error')?then('danger', message.type)}">
                    <div class="${properties.kcAlertIconClass!}">
                        <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                        <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                        <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                        <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
                    </div>
                    <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${kcSanitize(message.summary)?no_esc}</span>
                </div>
            </#if>

            <#nested "form">

            <#if auth?has_content && auth.showTryAnotherWayLink()>
              <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
                  <input type="hidden" name="tryAnotherWay" value="on"/>
                  <a id="try-another-way" href="javascript:document.forms['kc-select-try-another-way-form'].requestSubmit()"
                      class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass} ${properties.kcMarginTopClass}">
                        ${kcSanitize(msg("doTryAnotherWay"))?no_esc}
                  </a>
              </form>
            </#if>

            <#if displayInfo>
              <div id="kc-info" class="${properties.kcSignUpClass!}">
                  <div id="kc-info-wrapper" class="${properties.kcInfoAreaWrapperClass!}">
                      <#nested "info">
                  </div>
              </div>
            </#if>
          </div>
          <div class="pf-v5-c-login__main-footer">
            <#nested "socialProviders">
          </div>
        </main>

        <@loginFooter.content/>
      </div>
    </div>
  </div>
</div>
</body>
</html>
</#macro>
