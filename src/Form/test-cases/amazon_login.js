module.exports = `
<form name="signIn" method="post" novalidate="" action="https://www.amazon.com/ap/signin" class="auth-validate-form auth-real-time-validation a-spacing-none" data-fwcim-id="iFXpNxeb">
    <input type="hidden" name="appActionToken" value=""><input type="hidden" name="appAction" value="SIGNIN_PWD_COLLECT">
    <input type="hidden" name="subPageType" value="SignInClaimCollect">

    <input type="hidden" name="openid.return_to" value="">

    <input type="hidden" name="prevRID" value="=">

    <input type="hidden" name="workflowState" value="">

    <div class="a-section">
        <div class="a-box">
            <div class="a-box-inner a-padding-extra-large">
                <h1 class="a-spacing-small">
                    Sign-In
                </h1>
                <!-- optional subheading element -->

                <div class="a-row a-spacing-base">
                    <label for="ap_email" class="a-form-label">
              Email or mobile phone number
            </label>

                    <input type="email" maxlength="128" id="ap_email" name="email" tabindex="1" class="a-input-text a-span12 auth-autofocus auth-required-field" data-manual-scoring="username">

                    <input type="password" maxlength="1024" id="ap-credential-autofill-hint" name="password" class="a-input-text hide" data-manual-scoring="password">

                    <div id="auth-email-missing-alert" class="a-box a-alert-inline a-alert-inline-error auth-inlined-error-message a-spacing-top-mini" role="alert">
                        <div class="a-box-inner a-alert-container"><i class="a-icon a-icon-alert"></i>
                            <div class="a-alert-content">
                                Enter your email or mobile phone number
                            </div>
                        </div>
                    </div>

                </div>

                <input type="hidden" name="create" value="0">

                <div class="a-section">

                    <span id="continue" class="a-button a-button-span12 a-button-primary"><span class="a-button-inner"><input id="continue" tabindex="5" class="a-button-input" type="submit" aria-labelledby="continue-announce"><span id="continue-announce" class="a-button-text" aria-hidden="true">
              Continue
            </span></span>
                    </span>

                    <div id="legalTextRow" class="a-row a-spacing-top-medium a-size-small">
                        By continuing, you agree to Amazon's <a href="/gp/help/customer/display.html/ref=ap_signin_notification_condition_of_use?ie=UTF8&amp;nodeId=508088">Conditions of Use</a> and <a href="/gp/help/customer/display.html/ref=ap_signin_notification_privacy_notice?ie=UTF8&amp;nodeId=468496">Privacy Notice</a>.
                    </div>

                    <script>
                        function cf() {
                            if (typeof window.uet === 'function') {
                              uet('cf');
                            }
                            if (window.embedNotification &&
                              typeof window.embedNotification.onCF === 'function') {
                              embedNotification.onCF();
                            }
                          }
                    </script>

                    <script type="text/javascript">
                        cf()
                    </script>

                </div>

                <div class="a-section">
                    <div class="a-row a-expander-container a-expander-inline-container">
                        <a data-csa-c-func-deps="aui-da-a-expander-toggle" data-csa-c-type="widget" data-csa-interaction-events="click" aria-expanded="false" role="button" href="javascript:void(0)" data-action="a-expander-toggle" class="a-expander-header a-declarative a-expander-inline-header a-link-expander" data-a-expander-toggle="{&quot;allowLinkDefault&quot;:true, &quot;expand_prompt&quot;:&quot;&quot;, &quot;collapse_prompt&quot;:&quot;&quot;}" data-csa-c-id="715t5j-lwz11t-dv5wyg-6xysi4"><i class="a-icon a-icon-expand"></i><span class="a-expander-prompt">
      Need help?
    </span></a>

                        <div aria-expanded="false" class="a-expander-content a-expander-inline-content a-expander-inner" style="display:none">

                            <a id="auth-fpp-link-bottom" class="a-link-normal" href="https://www.amazon.com/ap/forgotpassword?showRememberMe=true&amp;openid.pape.max_auth_age=0&amp;openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&amp;pageId=usflex&amp;openid.return_to=https%3A%2F%2Fwww.amazon.com%2F%3F_encoding%3DUTF8%26ref_%3Dnav_custrec_newcust&amp;prevRID=ADY9MAJ34QK1VMVYN4QP&amp;openid.assoc_handle=usflex&amp;openid.mode=checkid_setup&amp;prepopulatedLoginId=&amp;failedSignInCount=0&amp;openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&amp;openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0">
  Forgot your password?
</a>
                        </div>

                        <div aria-expanded="false" class="a-expander-content a-expander-inline-content a-expander-inner" style="display:none">
                            <a id="ap-other-signin-issues-link" class="a-link-normal" href="/gp/help/customer/account-issues/ref=ap_login_with_otp_claim_collection?ie=UTF8">
        Other issues with Sign-In
      </a>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
    `