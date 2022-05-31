const {readdirSync, writeFileSync} = require('fs')
const {join, relative} = require('path')
const z = require('zod')

/**
 * @typedef ApiCallDefinition
 * @property {string} [id] - an optional ID to be used to listen for responses
 * @property {string} [description] - an optional description for future documentation use
 * @property {string} [paramsValidator] - a file path to a schema file to be used for validating output params
 * @property {string} [resultValidator] - a file path to a schema file to be used for validating results
 *
 * @typedef {Record<string, ApiCallDefinition>} ApiCallDefinitions - A helper type for Record<string, ApiCallDefinition>
 *
 * @typedef {Record<string, Record<string, any>>} SchemaMap
 */

// @ts-ignore
const runningAsScript = !module.parent

if (runningAsScript) {
    // Which folder we're operating from
    const BASE = join(__dirname, '../src/deviceApiCalls')
    const banner = `/* DO NOT EDIT, this file was generated by scripts/api-call-generator.js */`

    // Generate the files
    generateFiles(BASE)
        .then((outputs) => {
            for (let output of outputs) {
                writeFileSync(output.filepath, banner + '\n' + output.content)
                console.log(`✅`, relative(join(__dirname, '..'), output.filepath))
            }
        })
        .catch(e => {
            console.error(e)
            process.exit(1)
        })
}

/**
 * @param {string} baseDir
 * @returns {Promise<{filepath:string,content:string}[]>}
 */
async function generateFiles (baseDir) {
    const BASE_OUTPUT = join(baseDir, '/__generated__')
    const constants = {
        dirs: { schemas: join(baseDir, 'schemas') },
        outputs: {
            ts: join(BASE_OUTPUT, 'validators-ts.d.ts'),
            validators: join(BASE_OUTPUT, 'validators.zod.js'),
            apiCalls: join(BASE_OUTPUT, 'deviceApiCalls.js')
        },
        imports: {
            deviceApi: '../../../packages/device-api',
            validators: './validators.zod.js'
        }
    }

    // first, validate the input JSON
    const deviceApiCalls = validateCalls(require(join(baseDir, 'deviceApiCalls.json')))

    // next, ensure that all schemas are valid
    const schemas = createSchemaMap(constants.dirs.schemas)

    // now generate the file contents
    const typescript = await createTypescriptOutput(schemas, constants.dirs.schemas)
    const validators = createValidatorsOutput(typescript)
    const apiCalls = createApiCalls(deviceApiCalls, constants.imports, baseDir)

    return [
        {
            filepath: constants.outputs.ts,
            content: typescript
        },
        {
            filepath: constants.outputs.validators,
            content: validators
        },
        {
            filepath: constants.outputs.apiCalls,
            content: apiCalls
        }
    ]
}

/**
 * Takes a folder of schema files and converts it into key: value map of
 *    <absolute_path>: <json_content>
 * @param {string} schemaDir
 * @returns {SchemaMap}
 */
function createSchemaMap (schemaDir) {
    const schemaFiles = readdirSync(schemaDir)
    return Object.fromEntries(schemaFiles
        .filter(filename => filename.endsWith('.json') && !filename.startsWith('_'))
        .map(filename => {
            const abs = join(schemaDir, filename)
            const json = require(abs)
            json.$id = filename
            return [abs, json]
        }))
}

/**
 * Access all schemas in turn, generating types for each.
 * This uses `json-schema-to-typescript` to perform the conversion
 *
 * @param {SchemaMap} schemas
 * @param {string} schemaDir
 * @returns {Promise<string>}
 */
async function createTypescriptOutput (schemas, schemaDir) {
    const {compile} = require('json-schema-to-typescript')
    /** @type {string[]} */
    const blocks = []
    for (let [id, entry] of Object.entries(schemas)) {
        const res = await compile({
            ...entry,
            definitions: {
                ...schemas
            }
        }, id, {
            bannerComment: '// ' + entry.$id,
            cwd: schemaDir
        })
        blocks.push(res)
    }
    return blocks.join('\n')
}

/**
 * Convert the Typescript definitions into Zod definitions
 * to be used as validators.
 *
 * @param {string} typescriptDefinitions
 * @returns {string}
 */
function createValidatorsOutput (typescriptDefinitions) {
    const {generate} = require('ts-to-zod')
    const zodResult = generate({
        sourceText: typescriptDefinitions
    })
    return zodResult.getZodSchemasFile('')
}

/**
 * @param {ApiCallDefinitions} deviceApiCalls
 * @param {{validators: string, deviceApi: string}} importPaths
 * @param {string} baseDir
 * @returns {string}
 */
function createApiCalls (deviceApiCalls, importPaths, baseDir) {
    const createValidatorRef = (input) => input[0].toLowerCase() + input.slice(1) + 'Schema'
    const imports = new Set()
    const classes = []

    // For every entry in 'deviceApiCalls.json', try to resolve the schema files that it uses
    for (let [methodName, entry] of Object.entries(deviceApiCalls)) {
        const instanceName = methodName[0].toUpperCase() + methodName.slice(1) + 'Call'
        const classDef = {
            ...entry
        }
        if (entry.paramsValidator) {
            const schema = require(join(baseDir, entry.paramsValidator))
            if (!schema.title) throw new Error('missing `title` in ' + methodName)
            classDef.paramsValidator = createValidatorRef(schema.title)
            imports.add(classDef.paramsValidator)
        } else {
            classDef.paramsValidator = `any`
        }
        if (entry.resultValidator) {
            const schema = require(join(baseDir, entry.resultValidator))
            if (!schema.title) throw new Error('missing `title` in ' + methodName)
            classDef.resultValidator = createValidatorRef(schema.title)
            imports.add(classDef.resultValidator)
        } else {
            classDef.resultValidator = `any`
        }
        if (entry.id) {
            classDef.id = entry.id
        }
        classes.push(createClassDefinition(methodName, instanceName, classDef))
    }

    if (classes.length === 0) {
        return '// no DeviceApiCalls were given'
    }

    // create all the imports
    const validatorImport = JSON.stringify(importPaths.validators)
    const deviceApiImport = JSON.stringify(importPaths.deviceApi)
    const importStr = `import {\n${[...imports].map(x => '    ' + x).join(',\n')}\n} from ${validatorImport}`

    // import the device-api package
    const importStr2 = `import { DeviceApiCall } from ${deviceApiImport};`

    // join all class blocks together
    const classDefsStr = classes.join('\n')

    // combine everything
    return importStr.concat('\n', importStr2, '\n\n', classDefsStr)
}

/**
 * @param {string} methodName
 * @param {string} instanceName
 * @param {ApiCallDefinition} cd
 */
function createClassDefinition (methodName, instanceName, cd) {
    const lines = []
    if (cd.resultValidator || cd.paramsValidator) {
        lines.push('/**')
        lines.push(` * @extends {DeviceApiCall<${cd.paramsValidator}, ${cd.resultValidator}>} `)
        lines.push(' */')
    }
    lines.push(`export class ${instanceName} extends DeviceApiCall {`)
    lines.push(`  method = ${JSON.stringify(methodName)}`)
    if (cd.id) {
        lines.push(`  id = ${JSON.stringify(cd.id)}`)
    }
    if (cd.paramsValidator && cd.paramsValidator !== 'any') {
        lines.push(`  paramsValidator = ${cd.paramsValidator}`)
    }
    if (cd.resultValidator && cd.resultValidator !== 'any') {
        lines.push(`  resultValidator = ${cd.resultValidator}`)
    }
    lines.push(`}`)
    return lines.join('\n')
}

/**
 * The validator for the incoming JSON files
 * @param {ApiCallDefinitions} deviceApiCalls
 * @returns {ApiCallDefinitions}
 */
function validateCalls (deviceApiCalls) {
    return z.record(z.object({
        id: z.string().optional(),
        paramsValidator: z.string().optional(),
        resultValidator: z.string().optional()
    }).strict()).parse(deviceApiCalls)
}

module.exports.generateFiles = generateFiles