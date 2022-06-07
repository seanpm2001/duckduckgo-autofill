/* DO NOT EDIT, this file was generated by scripts/api-call-generator.js */
// Generated by ts-to-zod
import { z } from "zod";

export const autofillFeatureTogglesSchema = z.object({
    inputType_credentials: z.boolean().optional(),
    inputType_identities: z.boolean().optional(),
    inputType_creditCards: z.boolean().optional(),
    emailProtection: z.boolean().optional(),
    password_generation: z.boolean().optional(),
    credentials_saving: z.boolean().optional(),
    inlineIcon_credentials: z.boolean().optional()
});

export const credentialsSchema = z.object({
    id: z.string().optional(),
    username: z.string(),
    password: z.string()
});

export const genericErrorSchema = z.object({
    message: z.string()
});

export const getAliasParamsSchema = z.object({
    requiresUserPermission: z.boolean(),
    shouldConsumeAliasIfProvided: z.boolean()
});

export const getAliasResultSchema = z.object({
    success: z.object({
        alias: z.string()
    })
});

export const getAutofillDataRequestSchema = z.object({
    inputType: z.string(),
    mainType: z.union([z.literal("credentials"), z.literal("identities"), z.literal("creditCards")]),
    subType: z.string()
});

export const getAutofillDataResponseSchema = z.object({
    type: z.literal("getAutofillDataResponse").optional(),
    success: z.object({
        credentials: credentialsSchema.optional(),
        action: z.union([z.literal("fill"), z.literal("focus"), z.literal("none")])
    }).optional(),
    error: genericErrorSchema.optional()
});

export const availableInputTypesSchema = z.object({
    credentials: z.boolean().optional(),
    identities: z.boolean().optional(),
    creditCards: z.boolean().optional(),
    email: z.boolean().optional()
});

export const contentScopeFeaturesItemSettingsSchema = z.record(z.any());

export const userPreferencesSchema = z.object({
    globalPrivacyControlValue: z.boolean().optional(),
    sessionKey: z.string().optional(),
    debug: z.boolean(),
    platform: z.object({
        name: z.union([z.literal("ios"), z.literal("macos"), z.literal("windows"), z.literal("extension"), z.literal("android"), z.literal("unknown")])
    }),
    features: z.record(z.object({
        settings: z.record(z.any())
    }))
});

export const contentScopeFeaturesSchema = z.record(z.object({
    exceptions: z.array(z.any()),
    state: z.union([z.literal("enabled"), z.literal("disabled")]),
    settings: contentScopeFeaturesItemSettingsSchema.optional()
}));

export const outgoingCredentialsSchema = z.object({
    username: z.string().optional(),
    password: z.string().optional()
});

export const autofillSettingsSchema = z.object({
    featureToggles: autofillFeatureTogglesSchema
});

export const getAvailableInputTypesResultSchema = z.object({
    type: z.literal("getAvailableInputTypesResponse").optional(),
    success: availableInputTypesSchema,
    error: genericErrorSchema.optional()
});

export const contentScopeSchema = z.object({
    features: contentScopeFeaturesSchema,
    unprotectedTemporary: z.array(z.any())
});

export const runtimeConfigurationSchema = z.object({
    contentScope: contentScopeSchema,
    userUnprotectedDomains: z.array(z.object({
        name: z.string().optional()
    })),
    userPreferences: userPreferencesSchema
});

export const storeFormDataSchema = z.object({
    credentials: outgoingCredentialsSchema.optional()
});

export const getRuntimeConfigurationResponseSchema = z.object({
    type: z.literal("getRuntimeConfigurationResponse").optional(),
    success: runtimeConfigurationSchema.optional(),
    error: genericErrorSchema.optional()
});
