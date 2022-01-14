//https://en.wikipedia.org/w/index.php?title=Special:UserLogin&returnto=Main+Page
module.exports = `
<form class="mw-htmlform mw-ui-vform mw-ui-container" action="/w/index.php?title=Special:UserLogin&amp;returnto=Main+Page" method="post" name="userlogin">
    <div>
        <div class="mw-htmlform-field-HTMLTextField loginText mw-ui-vform-field"><label for="wpName1">Username</label>
            <div class="mw-input"><input id="wpName1" name="wpName" size="20" class="loginText mw-ui-input" placeholder="Enter your username" tabindex="1" required="" autofocus="" autocomplete="username" data-manual-scoring="username">
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLTextField loginPassword mw-ui-vform-field"><label for="wpPassword1">Password</label>
            <div class="mw-input"><input id="wpPassword1" name="wpPassword" size="20" class="loginPassword mw-ui-input" placeholder="Enter your password" tabindex="2" required="" autocomplete="current-password" type="password" data-manual-scoring="password">
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLCheckField mw-userlogin-rememberme mw-ui-vform-field">
            <div class="mw-input mw-htmlform-nolabel">
                <div class="mw-ui-checkbox"><input name="wpRemember" type="checkbox" value="1" id="wpRemember" tabindex="3" class="mw-userlogin-rememberme">&nbsp;<label for="wpRemember">Keep me logged in (for up to 365 days)</label></div>
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLSubmitField mw-ui-vform-field">
            <div class="mw-input mw-htmlform-nolabel"><button class="mw-htmlform-submit mw-ui-button mw-ui-primary mw-ui-progressive" id="wpLoginAttempt" type="submit" name="wploginattempt" value="Log in" tabindex="6">Log in</button>
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLInfoField mw-form-related-link-container mw-userlogin-help mw-ui-vform-field">
            <div class="mw-input mw-htmlform-nolabel"><a href="https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Logging_in">Help with logging in</a>
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLInfoField mw-form-related-link-container mw-ui-vform-field">
            <div class="mw-input mw-htmlform-nolabel"><a href="/wiki/Special:PasswordReset" title="Special:PasswordReset">Forgot your password?</a>
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLInfoField mw-ui-vform-field">
            <div class="mw-input mw-htmlform-nolabel">
                <div id="mw-createaccount-cta" class="mw-ui-vform-field">Don't have an account?<a id="mw-createaccount-join" href="/w/index.php?title=Special:CreateAccount&amp;returnto=Main+Page&amp;campaign=loginCTA" class="mw-ui-button" tabindex="100">Join Wikipedia</a></div>
            </div>
        </div>
    </div><input id="wpEditToken" type="hidden" value="+\" name="wpEditToken">
    <input type="hidden" value="Special:UserLogin" name="title">
    <input name="authAction" type="hidden" value="login">
    <input name="force" type="hidden">
    <input name="wpLoginToken" type="hidden" value="987461f52698b48d3b0a238be5aabcb461e1db5d+\">
    <input id="mw-input-geEnabled" name="geEnabled" type="hidden" value="-1">
    <input id="mw-input-geNewLandingHtml" name="geNewLandingHtml" type="hidden" value="-1">
</form>
`