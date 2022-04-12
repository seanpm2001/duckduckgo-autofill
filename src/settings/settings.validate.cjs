// @ts-nocheck
"use strict";module.exports = validate10;module.exports.default = validate10;const schema11 = {"$schema":"http://json-schema.org/draft-06/schema#","$ref":"#/definitions/AutofillSettings","definitions":{"AutofillSettings":{"type":"object","properties":{"featureToggles":{"$ref":"#/definitions/FeatureToggles"}},"required":["featureToggles"],"title":"AutofillSettings"},"FeatureToggles":{"type":"object","properties":{"inputType_credentials":{"type":"boolean"},"inputType_identities":{"type":"boolean"},"inputType_creditCards":{"type":"boolean"},"emailProtection":{"type":"boolean"},"password_generation":{"type":"boolean"},"credentials_saving":{"type":"boolean"}},"required":["inputType_credentials","inputType_identities","inputType_creditCards","emailProtection","password_generation","credentials_saving"],"title":"FeatureToggles"}}};const schema12 = {"type":"object","properties":{"featureToggles":{"$ref":"#/definitions/FeatureToggles"}},"required":["featureToggles"],"title":"AutofillSettings"};const schema13 = {"type":"object","properties":{"inputType_credentials":{"type":"boolean"},"inputType_identities":{"type":"boolean"},"inputType_creditCards":{"type":"boolean"},"emailProtection":{"type":"boolean"},"password_generation":{"type":"boolean"},"credentials_saving":{"type":"boolean"}},"required":["inputType_credentials","inputType_identities","inputType_creditCards","emailProtection","password_generation","credentials_saving"],"title":"FeatureToggles"};function validate11(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){let vErrors = null;let errors = 0;if(errors === 0){if(data && typeof data == "object" && !Array.isArray(data)){let missing0;if((data.featureToggles === undefined) && (missing0 = "featureToggles")){validate11.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];return false;}else {if(data.featureToggles !== undefined){let data0 = data.featureToggles;const _errs2 = errors;if(errors === _errs2){if(data0 && typeof data0 == "object" && !Array.isArray(data0)){let missing1;if(((((((data0.inputType_credentials === undefined) && (missing1 = "inputType_credentials")) || ((data0.inputType_identities === undefined) && (missing1 = "inputType_identities"))) || ((data0.inputType_creditCards === undefined) && (missing1 = "inputType_creditCards"))) || ((data0.emailProtection === undefined) && (missing1 = "emailProtection"))) || ((data0.password_generation === undefined) && (missing1 = "password_generation"))) || ((data0.credentials_saving === undefined) && (missing1 = "credentials_saving"))){validate11.errors = [{instancePath:instancePath+"/featureToggles",schemaPath:"#/definitions/FeatureToggles/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];return false;}else {if(data0.inputType_credentials !== undefined){const _errs4 = errors;if(typeof data0.inputType_credentials !== "boolean"){validate11.errors = [{instancePath:instancePath+"/featureToggles/inputType_credentials",schemaPath:"#/definitions/FeatureToggles/properties/inputType_credentials/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];return false;}var valid2 = _errs4 === errors;}else {var valid2 = true;}if(valid2){if(data0.inputType_identities !== undefined){const _errs6 = errors;if(typeof data0.inputType_identities !== "boolean"){validate11.errors = [{instancePath:instancePath+"/featureToggles/inputType_identities",schemaPath:"#/definitions/FeatureToggles/properties/inputType_identities/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];return false;}var valid2 = _errs6 === errors;}else {var valid2 = true;}if(valid2){if(data0.inputType_creditCards !== undefined){const _errs8 = errors;if(typeof data0.inputType_creditCards !== "boolean"){validate11.errors = [{instancePath:instancePath+"/featureToggles/inputType_creditCards",schemaPath:"#/definitions/FeatureToggles/properties/inputType_creditCards/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];return false;}var valid2 = _errs8 === errors;}else {var valid2 = true;}if(valid2){if(data0.emailProtection !== undefined){const _errs10 = errors;if(typeof data0.emailProtection !== "boolean"){validate11.errors = [{instancePath:instancePath+"/featureToggles/emailProtection",schemaPath:"#/definitions/FeatureToggles/properties/emailProtection/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];return false;}var valid2 = _errs10 === errors;}else {var valid2 = true;}if(valid2){if(data0.password_generation !== undefined){const _errs12 = errors;if(typeof data0.password_generation !== "boolean"){validate11.errors = [{instancePath:instancePath+"/featureToggles/password_generation",schemaPath:"#/definitions/FeatureToggles/properties/password_generation/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];return false;}var valid2 = _errs12 === errors;}else {var valid2 = true;}if(valid2){if(data0.credentials_saving !== undefined){const _errs14 = errors;if(typeof data0.credentials_saving !== "boolean"){validate11.errors = [{instancePath:instancePath+"/featureToggles/credentials_saving",schemaPath:"#/definitions/FeatureToggles/properties/credentials_saving/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];return false;}var valid2 = _errs14 === errors;}else {var valid2 = true;}}}}}}}}else {validate11.errors = [{instancePath:instancePath+"/featureToggles",schemaPath:"#/definitions/FeatureToggles/type",keyword:"type",params:{type: "object"},message:"must be object"}];return false;}}}}}else {validate11.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];return false;}}validate11.errors = vErrors;return errors === 0;}function validate10(data, {instancePath="", parentData, parentDataProperty, rootData=data}={}){let vErrors = null;let errors = 0;if(!(validate11(data, {instancePath,parentData,parentDataProperty,rootData}))){vErrors = vErrors === null ? validate11.errors : vErrors.concat(validate11.errors);errors = vErrors.length;}validate10.errors = vErrors;return errors === 0;}