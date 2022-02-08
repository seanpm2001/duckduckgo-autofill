const FORM_INPUTS_SELECTOR = `
input:not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]),
select`

const SUBMIT_BUTTON_SELECTOR = `
input[type=submit],
input[type=button],
button:not([role=switch]):not([role=link]),
[role=button]`

const email = `
input:not([type])[name*=mail i],
input[type=""][name*=mail i],
input[type=text][name*=mail i],
input:not([type])[placeholder*=mail i]:not([placeholder*=search i]),
input[type=text][placeholder*=mail i]:not([placeholder*=search i]),
input[type=""][placeholder*=mail i]:not([placeholder*=search i]),
input:not([type])[placeholder*=mail i]:not([placeholder*=search i]),
input[type=email],
input[type=text][aria-label*=mail i]:not([aria-label*=search i]),
input:not([type])[aria-label*=mail i]:not([aria-label*=search i]),
input[type=text][placeholder*=mail i]:not([placeholder*=search i]),
input[autocomplete=email]`

// We've seen non-standard types like 'user'. This selector should get them, too
const GENERIC_TEXT_FIELD = `
input:not([type=button]):not([type=checkbox]):not([type=color]):not([type=date]):not([type=datetime-local]):not([type=datetime]):not([type=file]):not([type=hidden]):not([type=month]):not([type=number]):not([type=radio]):not([type=range]):not([type=reset]):not([type=search]):not([type=submit]):not([type=time]):not([type=url]):not([type=week])`

const password = `input[type=password]:not([autocomplete*=cc]):not([autocomplete=one-time-code])`

const cardName = `
input[autocomplete="cc-name"],
input[autocomplete="ccname"],
input[name="ccname"],
input[name="cc-name"],
input[name="ppw-accountHolderName"],
input[id*=cardname i],
input[id*=card-name i],
input[id*=card_name i]`

const cardNumber = `
input[autocomplete="cc-number"],
input[autocomplete="ccnumber"],
input[autocomplete="cardnumber"],
input[autocomplete="card-number"],
input[name="ccnumber"],
input[name="cc-number"],
input[name="cardnumber"],
input[name="card-number"],
input[name*=creditCardNumber i],
input[id*=cardnumber i],
input[id*=card-number i],
input[id*=card_number i]`

const cardSecurityCode = `
input[autocomplete="cc-csc"],
input[autocomplete="csc"],
input[autocomplete="cc-cvc"],
input[autocomplete="cvc"],
input[name="cvc"],
input[name="cc-cvc"],
input[name="cc-csc"],
input[name="csc"],
input[name="securityCode"]`

const expirationMonth = `
[autocomplete="cc-exp-month"],
[name="ccmonth"],
[name="ppw-expirationDate_month"],
[name=cardExpiryMonth],
[name="expiration-month"],
[name*=ExpDate_Month i],
[id*=expiration-month i]`

const expirationYear = `
[autocomplete="cc-exp-year"],
[name="ccyear"],
[name="ppw-expirationDate_year"],
[name=cardExpiryYear],
[name="expiration-year"],
[name*=ExpDate_Year i],
[id*=expiration-year i]`

const expiration = `
[autocomplete="cc-exp"],
[name="cc-exp"],
[name="exp-date"],
[name="expirationDate"],
input[id*=expiration i]`

const firstName = `
[name*=fname i], [autocomplete*=given-name i],
[name*=firstname i], [autocomplete*=firstname i],
[name*=first-name i], [autocomplete*=first-name i],
[name*=first_name i], [autocomplete*=first_name i],
[name*=givenname i], [autocomplete*=givenname i],
[name*=given-name i],
[name*=given_name i], [autocomplete*=given_name i],
[name*=forename i], [autocomplete*=forename i]`

const middleName = `
[name*=mname i], [autocomplete*=additional-name i],
[name*=middlename i], [autocomplete*=middlename i],
[name*=middle-name i], [autocomplete*=middle-name i],
[name*=middle_name i], [autocomplete*=middle_name i],
[name*=additionalname i], [autocomplete*=additionalname i],
[name*=additional-name i],
[name*=additional_name i], [autocomplete*=additional_name i]`

const lastName = `
[name=lname], [autocomplete*=family-name i],
[name*=lastname i], [autocomplete*=lastname i],
[name*=last-name i], [autocomplete*=last-name i],
[name*=last_name i], [autocomplete*=last_name i],
[name*=familyname i], [autocomplete*=familyname i],
[name*=family-name i],
[name*=family_name i], [autocomplete*=family_name i],
[name*=surname i], [autocomplete*=surname i]`

const fullName = `
[name=name], [autocomplete=name],
[name*=fullname i], [autocomplete*=fullname i],
[name*=full-name i], [autocomplete*=full-name i],
[name*=full_name i], [autocomplete*=full_name i],
[name*=your-name i], [autocomplete*=your-name i]`

const phone = `
[name*=phone i], [name*=mobile i], [autocomplete=tel]`

const addressStreet1 = `
[name=address], [autocomplete=street-address], [autocomplete=address-line1],
[name=street],
[name=ppw-line1]`

const addressStreet2 = `
[name=address], [autocomplete=address-line2],
[name=ppw-line2]`

const addressCity = `
[name=city], [autocomplete=address-level2],
[name=ppw-city]`

const addressProvince = `
[name=province], [name=state], [autocomplete=address-level1]`

const addressPostalCode = `
[name=zip], [name=zip2], [name=postal], [autocomplete=postal-code], [autocomplete=zip-code],
[name*=postalCode i], [name*=zipcode i]`

const addressCountryCode = `
[name=country], [autocomplete=country],
[name*=countryCode i], [name*=country-code i],
[name*=countryName i], [name*=country-name i]`

const birthdayDay = `
[name=bday-day],
[name=birthday_day], [name=birthday-day],
[name=date_of_birth_day], [name=date-of-birth-day],
[name^=birthdate_d], [name^=birthdate-d]`

const birthdayMonth = `
[name=bday-month],
[name=birthday_month], [name=birthday-month],
[name=date_of_birth_month], [name=date-of-birth-month],
[name^=birthdate_m], [name^=birthdate-m]`

const birthdayYear = `
[name=bday-year],
[name=birthday_year], [name=birthday-year],
[name=date_of_birth_year], [name=date-of-birth-year],
[name^=birthdate_y], [name^=birthdate-y]`

// todo: these are still used directly right now, mostly in scanForInputs
// todo: ensure these can be set via configuration
module.exports.FORM_INPUTS_SELECTOR = FORM_INPUTS_SELECTOR
module.exports.SUBMIT_BUTTON_SELECTOR = SUBMIT_BUTTON_SELECTOR

// Exported here for now, to be moved to configuration later
module.exports.__secret_do_not_use = {
    GENERIC_TEXT_FIELD,
    SUBMIT_BUTTON_SELECTOR,
    FORM_INPUTS_SELECTOR,
    email: email,
    password,
    username: `${GENERIC_TEXT_FIELD}[autocomplete^=user]`,

    cardName,
    cardNumber,
    cardSecurityCode,
    expirationMonth,
    expirationYear,
    expiration,

    firstName,
    middleName,
    lastName,
    fullName,
    phone,
    addressStreet1,
    addressStreet2,
    addressCity,
    addressProvince,
    addressPostalCode,
    addressCountryCode,
    birthdayDay,
    birthdayMonth,
    birthdayYear
}