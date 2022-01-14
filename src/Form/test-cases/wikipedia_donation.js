//https://payments.wikimedia.org/index.php?title=Special:IngenicoGateway&appeal=JimmyQuote&ffname=cc-vmad&recurring=false&payment_method=cc&country=US&uselang=en&amount=5&utm_medium=sidebar&utm_campaign=C13_en.wikipedia.org&utm_source=donate.default%7Edefault%7Edefault%7Edefault%7Econtrol.cc&utm_key=vw_1440%7Evh_377%7EotherAmt_0%7Etime_6&referrer=en.wikipedia.org%2F&currency=USD
//On the real page, the credit card section is an iframe separate from the address info; here they're combined together
module.exports = `
<div id="payment_gateway-personal-info">
    <span id="amountMsg" class="errorMsgHide"></span>

    <span id="currencyMsg" class="errorMsgHide"></span>

    <div id="step1header">
        <h3 class="amount_header">Donation amount
            <span id="amount_input" class="hidden">
											<input type="number" step="any" name="amount" id="amount" title="" value="5.00" >
											<select name="currency" id="currency" title="" >
												<option value="AED">AED</option>
												<option value="ARS">ARS</option>
												<option value="AUD">AUD</option>
												<option value="BBD">BBD</option>
												<option value="BDT">BDT</option>
												<option value="BGN">BGN</option>
												<option value="BHD">BHD</option>
												<option value="BMD">BMD</option>
												<option value="BND">BND</option>
												<option value="BOB">BOB</option>
												<option value="BRL">BRL</option>
												<option value="BZD">BZD</option>
												<option value="CAD">CAD</option>
												<option value="CHF">CHF</option>
												<option value="CLP">CLP</option>
												<option value="CNY">CNY</option>
												<option value="COP">COP</option>
												<option value="CRC">CRC</option>
												<option value="CZK">CZK</option>
												<option value="DKK">DKK</option>
												<option value="DOP">DOP</option>
												<option value="DZD">DZD</option>
												<option value="EGP">EGP</option>
												<option value="EUR">EUR</option>
												<option value="GBP">GBP</option>
												<option value="GTQ">GTQ</option>
												<option value="HKD">HKD</option>
												<option value="HNL">HNL</option>
												<option value="HRK">HRK</option>
												<option value="HUF">HUF</option>
												<option value="IDR">IDR</option>
												<option value="ILS">ILS</option>
												<option value="INR">INR</option>
												<option value="JMD">JMD</option>
												<option value="JOD">JOD</option>
												<option value="JPY">JPY</option>
												<option value="KES">KES</option>
												<option value="KRW">KRW</option>
												<option value="KZT">KZT</option>
												<option value="LBP">LBP</option>
												<option value="LKR">LKR</option>
												<option value="MAD">MAD</option>
												<option value="MKD">MKD</option>
												<option value="MUR">MUR</option>
												<option value="MVR">MVR</option>
												<option value="MXN">MXN</option>
												<option value="MYR">MYR</option>
												<option value="NIO">NIO</option>
												<option value="NOK">NOK</option>
												<option value="NZD">NZD</option>
												<option value="OMR">OMR</option>
												<option value="PAB">PAB</option>
												<option value="PEN">PEN</option>
												<option value="PHP">PHP</option>
												<option value="PKR">PKR</option>
												<option value="PLN">PLN</option>
												<option value="QAR">QAR</option>
												<option value="RON">RON</option>
												<option value="RUB">RUB</option>
												<option value="SAR">SAR</option>
												<option value="SEK">SEK</option>
												<option value="SGD">SGD</option>
												<option value="SVC">SVC</option>
												<option value="THB">THB</option>
												<option value="TJS">TJS</option>
												<option value="TND">TND</option>
												<option value="TRY">TRY</option>
												<option value="TTD">TTD</option>
												<option value="TWD">TWD</option>
												<option value="UAH">UAH</option>
												<option value="UYU">UYU</option>
												<option value="USD" selected="">USD</option>
												<option value="VND">VND</option>
												<option value="XAF">XAF</option>
												<option value="XCD">XCD</option>
												<option value="ZAR">ZAR</option>
											</select>
										</span>
            <span id="selected-amount">
											$5.00
										</span>
        </h3>
    </div>
    <h3 class="cc_header">Billing information<img src="/extensions/DonationInterface/gateway_forms/includes/padlock.gif"></h3>

    <div>
        <div class="halfwidth">
            <label for="first_name">First name</label>
            <input id="first_name" name="first_name" value="" type="text" title="First name" required="" autocomplete="billing given-name cc-given-name" maxlength="64" data-manual-scoring="firstName" class="" style="background-color: rgb(248, 244, 152) !important; color: rgb(51, 51, 51) !important;" >
            <span id="first_nameMsg" class="errorMsgHide">Please enter your first name</span>

        </div>
        <div class="halfwidth">
            <label for="last_name">Last name</label>
            <input id="last_name" name="last_name" value="" type="text" title="Last name" required="" autocomplete="billing family-name cc-family-name" maxlength="64" data-manual-scoring="lastName" class="" style="background-color: rgb(248, 244, 152) !important; color: rgb(51, 51, 51) !important;" >
            <span id="last_nameMsg" class="errorMsgHide">Please enter your last name</span>

        </div>
    </div>
    <div>
        <label for="street_address">Street</label>
        <input class="fullwidth" id="street_address" name="street_address" value="" type="text" title="Street" required="" autocomplete="billing address-line1" maxlength="96" data-manual-scoring="addressStreet" >
        <span id="street_addressMsg" class="errorMsgHide">Please enter your street address</span>

    </div>
    <div>
        <div class="thirdwidth">
            <label for="city">City</label>
            <input class="inputDefault" id="city" name="city" value="" type="text" title="City" required="" autocomplete="billing address-level2" maxlength="64" data-manual-scoring="addressCity" style="background-color: rgb(248, 244, 152) !important; color: rgb(51, 51, 51) !important;" >
            <span id="cityMsg" class="errorMsgHide">Please enter your city</span>

        </div>
        <div class="thirdwidth">
            <label for="state_province">State</label>
            <select id="state_province" name="state_province" title="State" required="" autocomplete="billing address-level1" data-manual-scoring="addressProvince" class="" style="background-color: rgb(248, 244, 152) !important; color: rgb(51, 51, 51) !important;" >
            <option value="" selected=""> -- </option>
            <option value="AK">Alaska</option>
<option value="AL">Alabama</option>
<option value="AR">Arkansas</option>
<option value="AZ">Arizona</option>
<option value="CA">California</option>
<option value="CO">Colorado</option>
<option value="CT">Connecticut</option>
<option value="DC">Washington D.C.</option>
<option value="DE">Delaware</option>
<option value="FL">Florida</option>
<option value="GA">Georgia</option>
<option value="HI">Hawaii</option>
<option value="IA">Iowa</option>
<option value="ID">Idaho</option>
<option value="IL">Illinois</option>
<option value="IN">Indiana</option>
<option value="KS">Kansas</option>
<option value="KY">Kentucky</option>
<option value="LA">Louisiana</option>
<option value="MA">Massachusetts</option>
<option value="MD">Maryland</option>
<option value="ME">Maine</option>
<option value="MI">Michigan</option>
<option value="MN">Minnesota</option>
<option value="MO">Missouri</option>
<option value="MS">Mississippi</option>
<option value="MT">Montana</option>
<option value="NC">North Carolina</option>
<option value="ND">North Dakota</option>
<option value="NE">Nebraska</option>
<option value="NH">New Hampshire</option>
<option value="NJ">New Jersey</option>
<option value="NM">New Mexico</option>
<option value="NV">Nevada</option>
<option value="NY">New York</option>
<option value="OH">Ohio</option>
<option value="OK">Oklahoma</option>
<option value="OR">Oregon</option>
<option value="PA">Pennsylvania</option>
<option value="PR">Puerto Rico</option>
<option value="RI">Rhode Island</option>
<option value="SC">South Carolina</option>
<option value="SD">South Dakota</option>
<option value="TN">Tennessee</option>
<option value="TX">Texas</option>
<option value="UT">Utah</option>
<option value="VA">Virginia</option>
<option value="VT">Vermont</option>
<option value="WA">Washington</option>
<option value="WI">Wisconsin</option>
<option value="WV">West Virginia</option>
<option value="WY">Wyoming</option>
<option value="AA">AA (Military)</option>
<option value="AE">AE (Military)</option>
<option value="AP">AP (Military)</option>
        </select><span id="state_provinceMsg" class="errorMsgHide">Please enter your state</span>

        </div>
        <div class="thirdwidth">
            <label for="postal_code">Zip</label>
            <input class="inputDefault" id="postal_code" name="postal_code" value="" type="text" title="Zip" required="" autocomplete="billing postal-code" maxlength="64" data-manual-scoring="addressPostalCode" style="background-color: rgb(248, 244, 152) !important; color: rgb(51, 51, 51) !important;" >
            <span id="postal_codeMsg" class="errorMsgHide">Please enter your zip code</span>

        </div>
    </div>
    <div>
        <label for="email">Email address</label>
        <input class="fullwidth" id="email" name="email" value="" type="email" title="Email address" required="" autocomplete="email" maxlength="254" data-manual-scoring="emailAddress" >
        <div id="emailSuggestion" style="display: none;">
            <span></span>
            <div class="close-button">×</div>
        </div>
        <span id="emailMsg" class="errorMsgHide">Please enter your email address</span>

    </div>
    <dl class="submethods">
        <dd class="field">
            <ul class="options-h enabled four-per-line" id="cards">

                <li title="Visa">
                    <label for="submethod-visa">
                                                    <input id="submethod-visa" name="payment_submethod" type="radio" value="visa" class="cardradio">
                                                    <img class="submethod-logo" alt="Visa" src="/extensions/DonationInterface/gateway_forms/includes/card-visa-lg.png">
                                                </label>
                </li>

                <li title="Mastercard">
                    <label for="submethod-mc">
                                                    <input id="submethod-mc" name="payment_submethod" type="radio" value="mc" class="cardradio">
                                                    <img class="submethod-logo" alt="Mastercard" src="/extensions/DonationInterface/gateway_forms/includes/card-mastercard.png" srcset="/extensions/DonationInterface/gateway_forms/includes/card-mastercard_2x.png 2x,/extensions/DonationInterface/gateway_forms/includes/card-mastercard_3x.png 3x">
                                                </label>
                </li>

                <li title="American Express">
                    <label for="submethod-amex">
                                                    <input id="submethod-amex" name="payment_submethod" type="radio" value="amex" class="cardradio">
                                                    <img class="submethod-logo" alt="American Express" src="/extensions/DonationInterface/gateway_forms/includes/card-amex-lg.png">
                                                </label>
                </li>

                <li title="Discover">
                    <label for="submethod-discover">
                                                    <input id="submethod-discover" name="payment_submethod" type="radio" value="discover" class="cardradio">
                                                    <img class="submethod-logo" alt="Discover" src="/extensions/DonationInterface/gateway_forms/includes/card-discover-lg.png">
                                                </label>
                </li>
            </ul>
        </dd>
    </dl>
    <div id="paymentContinue"> <input class="btn" id="paymentContinueBtn" type="button" value="Continue"></div>
    <div id="paymentSubmit"> <input class="btn enabled" id="paymentSubmitBtn" type="button" value="Donate"></div>
    <div class="mw-donate-submessage" id="payment_gateway-donate-submessage">
        <img src="/extensions/DonationInterface/gateway_forms/includes/padlock.gif"> Your credit / debit card will be securely processed.
    </div>
</div>

<form id="paymentoptionForm" method="post" class="validatedForm" novalidate="novalidate" action="/checkout">
    <input type="hidden" value="6570" name="publicMerchantId">

    <input type="hidden" value="102" name="variantCode">

    <input type="hidden" value="en_US" name="locale">

    <input type="hidden" value="89f5275f-ff6e-43c4-a873-1a871789b329" name="idempotenceKey">

    <input type="hidden" value="6570-88ba6613f28d4646b38c6c98a5bd8b85:061e1df9-ca6e-71ff-a914-b4b55523a10c:da19d11d53a244a293e733c2b6da23bc" name="token">

    <input type="hidden" value="d3a6fef8-e670-4475-a03b-1b1f2ddb28bd" name="requestToken">
    <input type="hidden" value="true" name="isPaymentProductDetailsShown">
    <input type="hidden" value="true" name="jsEnabled">
    <input type="hidden" id="buttonValue">

    <input type="hidden" value="cards" name="paymentProductGroupId">

    <input type="hidden" value="false" name="isFramed">

    <div class="paymentoption">
        <input type="hidden" name="colorDepth">
        <input type="hidden" name="screenHeight">
        <input type="hidden" name="screenWidth">
        <input type="hidden" name="timezoneOffsetUtcMinutes">
        <input type="hidden" name="browserLocale">
        <input type="hidden" name="javaEnabled">
        <input type="hidden" name="innerHeight">
        <input type="hidden" name="innerWidth">

        <div class="form-group form-group--prefill-editable hasIcon" data-display-order="0">
            <label id="label-cardNumber" for="cardNumber" class="hidden-xs hidden-sm">Card number</label>
            <div class="hasIcon ltr" dir="ltr">
                <input name="cardNumber" placeholder="0000 0000 0000 0000" id="cardNumber" class="form-control cc-num" data-send="true" autocomplete="cc-number" data-rule-allowedincontext="true" data-fixedpaymentproduct="" type="tel" required="" data-rule-length="true" data-manual-scoring="cardNumber">

                <span class="cc-image" style="display: none;">
                            </span>
                <i class="icon-card"></i>

            </div>
            <div id="cobrand">
                <button type="button" class="toggle-cobrand" aria-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Multiple payment options detected.</button>
                <div class="cobrand-wrapper" aria-labelledby="cobrand">
                    <div class="row">
                        <div class="col-xs-20 cobrand-intro-wrapper">
                            <p>This card has multiple payment options. Please choose your preferred option.</p>
                        </div>
                        <div class="col-xs-4 cobrand-close-wrapper">
                            <button type="button" class="cobrand-close" aria-label="close"><span class="icon-close"></span></button>
                        </div>
                    </div>
                    <ul id="paymentoptionslist">

                    </ul>
                </div>
            </div>
        </div>

        <div class="form-group hasIcon expiration" data-display-order="2">
            <label id="label-expiryDate" for="expiryDate" class="hidden-xs hidden-sm" style="height: 0px;">Expiry date</label>
            <div class="hasIcon ltr" dir="ltr">
                <input name="expiryDate" placeholder="MM/YY" id="expiryDate" class="form-control cc-exp" data-send="true" type="tel" required="" data-rule-expirationdate="true" data-rule-regularexpression="true" data-rule-length="true" data-manual-scoring="expiration">
                <i class="icon-date"></i>
            </div>
        </div>

        <div class="form-group cvv hasIcon" data-display-order="3">
            <label id="label-cvv" for="cvv" class="hidden-xs hidden-sm" style="height: 0px;">CVV</label>
            <div class="hasIcon ltr" dir="ltr">
                <input name="cvv" placeholder="123" id="cvv" class="form-control cvvinput cc-cvc" data-send="true" autocomplete="off" type="tel" required="" data-rule-regularexpression="true" data-rule-length="true" data-manual-scoring="cardSecurityCode">
                <i class="icon-lock"></i>
                <span class="tooltip-button-container" tabindex="0">
                <button type="button" data-content="<span>Please enter your security code as shown in the image</span><img src='https://assets.pay2.secured-by-ingenico.com/templates/master/global/css/img/ppimages/ppf_cvv_v1.png?size=150x92' alt='CVV' style='display: block;' class='cvvImage' />" id="cvv-popover" data-toggle="popover" class="info-popover show-js" title="" data-html="true" data-original-title="">
                <i class="icon-qmark"></i>
                <span class="sr-only">
                        Additional information                    </span>
                </button>
                </span>
            </div>
        </div>

        <div class="clearfix"></div>

        <div class="checkbox" id="remembermeBlock">
            <label>
        <input name="remember" type="checkbox" class="sendInput" id="rememberme">
        <span id="remembermeText">
            Remember my details for future purchases        </span>
    </label>
            <span class="tooltip-button-container" tabindex="0">
        <button type="button" data-content="If you check this box, your payment information will be stored for future purchases." data-toggle="popover" class="info-popover show-js" title="" data-original-title="">
            <i class="icon-qmark"></i>
            <span class="sr-only">
                Additional information            </span>
            </button>
            </span>
        </div>
    </div>

    <div class="paymentbuttons" id="paymentButtons">
        <button id="primaryButton" class="btn btn-block-rpp btn-primary" type="submit" name="doPayment" value="doPayment" >
        <span id="paymentbuttontext">
            Donate        </span>
    </button>

        <button id="secondaryButton" class="btn btn-block-rpp btn-secondary cancel " type="submit" name="cancelPayment" value="cancelPayment">
        <span id="cancelbuttontext" class="cancel">
            CANCEL DONATION        </span>
    </button>
    </div>
    <input name="expiryDateMonth" id="expiryDateMonth" type="text" autocomplete="cc-exp-month" tabindex="-1" aria-labelledby="label-expiryDate" style="opacity: 0; width: 0px; height: 0px; overflow: hidden; pointer-events: none; margin: 0px; padding: 0px; position: absolute;" data-manual-scoring="expirationMonth"><input name="expiryDateYear" id="expiryDateYear" type="text" autocomplete="cc-exp-year" tabindex="-1" aria-labelledby="label-expiryDate" style="opacity: 0; width: 0px; height: 0px; overflow: hidden; pointer-events: none; margin: 0px; padding: 0px; position: absolute;" data-manual-scoring="expirationYear"></form>
`