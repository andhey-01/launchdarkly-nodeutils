import { default as jsonPatch } from 'fast-json-patch';
import { default as fs } from 'fs';
import { default as path } from 'path';
import { default as globule } from 'globule';
import { default as _ } from 'lodash';

export class LaunchDarklyUtilsRoles {
    constructor(apiClient, log) {
        this.log = log;
        this.apiClient = apiClient;
    }

    get API_GROUP() {
        return 'Custom roles';
    }

    async getCustomRoles() {
        try {
            return this.apiClient.apis[this.API_GROUP].getCustomRoles();
        } catch (e) {
            throw {
                api: 'getCustomRoles',
                message: e.message,
                docs: 'https://apidocs.launchdarkly.com/docs/list-custom-roles'
            };
        }
    }

    async getCustomRole(customRoleKey) {
        try {
            return this.apiClient.apis[this.API_GROUP].getCustomRole({ customRoleKey: customRoleKey });
        } catch (e) {
            throw {
                api: 'getCustomRole',
                message: e.message,
                docs: 'https://apidocs.launchdarkly.com/docs/list-custom-roles'
            };
        }
    }

    async getCustomRoleById(customRoleId) {
        return this.apiClient.apis[this.API_GROUP].getCustomRoles().then(roleList => {
            let roles = _.filter(roleList.body.items, { _id: customRoleId });

            if (roles.length !== 1) {
                throw {
                    api: 'getCustomRoles',
                    message: `role not found for _id ${customRoleId}`,
                    docs: 'https://apidocs.launchdarkly.com/docs/list-custom-roles'
                };
            }

            return this.getCustomRole(roles[0].key);
        });
    }

    async createCustomRole(customRoleKey, customRoleName, customRolePolicyArray, customRoleDescription) {
        let customRole = {
            name: customRoleName,
            key: customRoleKey,
            description: customRoleDescription,
            policy: customRolePolicyArray
        };
        try {
            return this.apiClient.apis[this.API_GROUP].postCustomRole({ customRoleBody: customRole });
        } catch (e) {
            throw {
                api: 'postCustomRole',
                message: e.message,
                docs: 'https://apidocs.launchdarkly.com/docs/create-custom-role'
            };
        }
    }

    async updateCustomRole(customRoleKey, customRoleName, customRolePolicyArray, customRoleDescription) {
        let updatedCustomRole = {
            name: customRoleName,
            key: customRoleKey,
            description: customRoleDescription,
            policy: customRolePolicyArray
        };

        let that = this;
        return this.getCustomRole(customRoleKey)

            .then(customRoleResponse => {
                let patchDelta = jsonPatch.compare(customRoleResponse.obj, updatedCustomRole);
                that.log.debug(`customRoleDiff for '${customRoleKey}' ${JSON.stringify(patchDelta)}`);
                return patchDelta;
            })
            .then(patchDelta => {
                try {
                    return this.apiClient.apis[this.API_GROUP].patchCustomRole({
                        customRoleKey: customRoleKey,
                        patchDelta: patchDelta
                    });
                } catch (e) {
                    throw {
                        api: 'patchCustomRole',
                        message: e.message,
                        docs: 'https://apidocs.launchdarkly.com/docs/update-custom-role'
                    };
                }
            });
    }

    async upsertCustomRole(customRoleKey, customRoleName, customRolePolicyArray, customRoleDescription) {
        let that = this;
        return this.getCustomRole(customRoleKey)

            .then(() => {
                that.log.debug(`Role '${customRoleKey}' Found, Updating...`);
                return this.updateCustomRole(
                    customRoleKey,
                    customRoleName,
                    customRolePolicyArray,
                    customRoleDescription
                );
            })

            .catch(() => {
                that.log.debug(`Role '${customRoleKey}' Not Found, Creating...`);
                return this.createCustomRole(
                    customRoleKey,
                    customRoleName,
                    customRolePolicyArray,
                    customRoleDescription
                );
            });
    }

    async bulkUpsertCustomRoles(roleBulkLoadFile) {
        let filePath = path.resolve(roleBulkLoadFile);
        let roles = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let that = this;

        this.log.debug(`Bulk Upserting Roles from File: ${filePath}`);

        return roles.reduce(function(acc, role) {
            return acc.then(function(results) {
                return that.upsertCustomRole(role.key, role.name, role.policy, role.description).then(function(data) {
                    results.push(data);
                    return results;
                });
            });
        }, Promise.resolve([]));
    }

    async bulkUpsertCustomRoleFolder(roleFolder) {
        let folderPath = path.normalize(path.resolve(roleFolder));
        let globMatch = folderPath + '/*.json';
        this.log.debug(`Looking for Files with Pattern '${globMatch}'`);
        let fileArray = globule.find(globMatch);
        let results = [];
        let that = this;
        fileArray.forEach(async function(file) {
            that.log.debug(`Found File '${file}'. Calling 'bulkUpsertCustomRoles'`);
            let result = await that.bulkUpsertCustomRoles(file);
            results.push(result);
        });
        return results;
    }
}