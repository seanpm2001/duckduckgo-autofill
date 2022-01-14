//https://en.wikipedia.org/w/index.php?title=Special:CreateAccount&returnto=Main+Page
module.exports = `
<form class="mw-htmlform mw-ui-vform mw-ui-container" action="/w/index.php?title=Special:CreateAccount&amp;returnto=Main+Page" method="post" id="userlogin2" name="userlogin2">
    <div>
        <div class="mw-htmlform-field-HTMLInfoField mw-ui-vform-field">
            <div class="mw-input mw-htmlform-nolabel">
                <div id="mw-createacct-status-area"></div>
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLTextField loginText mw-ui-vform-field"><label for="wpName2">Username<span class="mw-ui-flush-right"><a href="/wiki/Wikipedia:Username_policy" title="Wikipedia:Username policy">(help me choose)</a></span></label>
            <div class="mw-input"><input id="wpName2" name="wpName" size="20" class="loginText mw-ui-input" placeholder="Enter your username" tabindex="1" required="" autocomplete="username" data-manual-scoring="username">
                <div style="display: none;"></div>
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLTextField loginPassword mw-ui-vform-field mw-htmlform-hide-if" data-cond-state="{&quot;class&quot;:[&quot;mw-htmlform-hide-if&quot;],&quot;hide&quot;:[&quot;===&quot;,&quot;wpCreateaccountMail&quot;,&quot;1&quot;]}"><label for="wpPassword2">Password</label>
            <div class="mw-input"><input id="wpPassword2" name="wpPassword" size="20" class="loginPassword mw-ui-input" placeholder="Enter a password" tabindex="2" required="" autocomplete="new-password" type="password" data-manual-scoring="password">
                <div style="display: none;"></div>
            </div>
        </div>
        <div class="htmlform-tip mw-htmlform-hide-if" data-cond-state="{&quot;class&quot;:[&quot;mw-htmlform-hide-if&quot;],&quot;hide&quot;:[&quot;===&quot;,&quot;wpCreateaccountMail&quot;,&quot;1&quot;]}">It is recommended to use a unique password that you are not using on any other website.</div>
        <div class="mw-htmlform-field-HTMLTextField loginPassword mw-ui-vform-field mw-htmlform-hide-if" data-cond-state="{&quot;class&quot;:[&quot;mw-htmlform-hide-if&quot;],&quot;hide&quot;:[&quot;===&quot;,&quot;wpCreateaccountMail&quot;,&quot;1&quot;]}"><label for="wpRetype">Confirm password</label>
            <div class="mw-input"><input id="wpRetype" name="retype" size="20" class="loginPassword mw-ui-input" placeholder="Enter password again" tabindex="3" required="" autocomplete="new-password" type="password" data-manual-scoring="password">
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLTextField loginText mw-ui-vform-field"><label for="wpEmail">Email address (recommended)</label>
            <div class="mw-input"><input id="wpEmail" name="email" size="20" class="loginText mw-ui-input" placeholder="Enter your email address" tabindex="4" autocomplete="email" type="email" data-manual-scoring="emailAddress">
            </div>
        </div>
        <div class="htmlform-tip">Email is required to recover your account if you lose your password.</div>
        <div class="mw-htmlform-field-HTMLFancyCaptchaField mw-ge-confirmemail-captcha mw-ui-vform-field">
            <p><label for="mw-input-captchaWord">CAPTCHA Security check (<a href="/wiki/Special:Captcha/help" title="Special:Captcha/help">what is this?</a>)</label></p><label for="mw-input-captchaWord">CAPTCHA Security check</label>
            <div class="mw-input">
                <div class="fancycaptcha-captcha-container">
                    <div class="fancycaptcha-captcha-and-reload">
                        <div class="fancycaptcha-image-container"><img class="fancycaptcha-image" src="/w/index.php?title=Special:Captcha/image&amp;wpCaptchaId=1280959840" alt=""><small class="confirmedit-captcha-reload fancycaptcha-reload">Refresh</small></div>
                    </div>
                    <input id="mw-input-captchaWord" name="captchaWord" class="mw-ui-input" size="12" autocomplete="off" autocorrect="off" autocapitalize="off" placeholder="Enter the text you see on the image" tabindex="6" required="" data-manual-scoring="unknown"><small class="mw-createacct-captcha-assisted">Can't see the image? <a href="/wiki/Wikipedia:Request_an_account" title="Wikipedia:Request an account">Request an account</a></small></div>
            </div>
        </div>
        <div class="mw-htmlform-field-HTMLSubmitField mw-ui-vform-field">
            <div class="mw-input mw-htmlform-nolabel"><button class="mw-htmlform-submit mw-ui-button mw-ui-primary mw-ui-progressive" id="wpCreateaccount" type="submit" name="wpCreateaccount" value="Create your account" tabindex="10">Create your account</button>
            </div>
        </div>
    </div><input id="wpEditToken" type="hidden" value="+\" name="wpEditToken">
    <input type="hidden" value="Special:CreateAccount" name="title">
    <input name="authAction" type="hidden" value="create">
    <input name="force" type="hidden">
    <input name="wpCreateaccountToken" type="hidden" value="dba36071e79e64a4395b1a8c2173274561e1dcd9+\">
    <input id="mw-input-captchaId" name="captchaId" type="hidden" value="1280959840">
    <input id="mw-input-campaign" name="campaign" type="hidden" value="loginCTA">
    <input id="mw-input-geEnabled" name="geEnabled" type="hidden" value="-1">
    <input id="mw-input-geNewLandingHtml" name="geNewLandingHtml" type="hidden" value="-1">
</form>
`