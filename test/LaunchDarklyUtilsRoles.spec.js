import { default as fs } from 'fs';
import { expect } from 'chai';
import { default as assert } from 'assert';
import { describe, it, before, beforeEach } from 'mocha';
import { default as nock } from 'nock';
import { LaunchDarklyUtils } from '../src/LaunchDarklyUtils';
import { LaunchDarklyLogger } from '../src/LaunchDarklyLogger';

let log = LaunchDarklyLogger.logger();

describe('LaunchDarklyUtilsRoles', () => {
    let ldutils;
    beforeEach(async () => {
        ldutils = await new LaunchDarklyUtils().create('MOCK', log);
    });

    describe('getCustomRoles', () => {
        before(done => {
            let scope = nock('https://app.launchdarkly.com')
                .get('/api/v2/roles')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-list.json', {
                    'Content-Type': 'application/json'
                });
            assert(scope);
            done();
        });

        it('should make expected api call and return results', async () => {
            let expected = JSON.parse(fs.readFileSync(__dirname + '/fixtures/custom-roles-list.json', 'utf-8'));
            return ldutils.roles.getCustomRoles().then(actual => {
                expect(actual).to.deep.equal(expected);
            });
        });
    });

    describe('getCustomRole', () => {
        before(done => {
            let scope = nock('https://app.launchdarkly.com')
                .get('/api/v2/roles/example-role')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                });
            assert(scope);
            done();
        });

        it('should make expected api call and return results', async () => {
            let expected = JSON.parse(fs.readFileSync(__dirname + '/fixtures/custom-roles-get.json', 'utf-8'));
            return ldutils.roles.getCustomRole('example-role').then(actual => {
                expect(actual).to.deep.equal(expected);
            });
        });
    });

    describe('getCustomRoleById', () => {
        before(done => {
            let scope = nock('https://app.launchdarkly.com')
                .get('/api/v2/roles')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-list.json', {
                    'Content-Type': 'application/json'
                })
                .get('/api/v2/roles/example-role')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                });
            assert(scope);
            done();
        });

        it('should make expected api call and return results', async () => {
            let expected = JSON.parse(fs.readFileSync(__dirname + '/fixtures/custom-roles-get.json', 'utf-8'));
            return ldutils.roles.getCustomRoleById('5a593f890z875421af55d96e').then(actual => {
                expect(actual).to.deep.equal(expected);
            });
        });
    });

    describe('createCustomRole', () => {
        let postBody;
        before(done => {
            let scope = nock('https://app.launchdarkly.com')
                .post('/api/v2/roles', body => {
                    postBody = body;
                    return body;
                })
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-create.json', {
                    'Content-Type': 'application/json'
                });
            assert(scope);
            done();
        });

        it('should make expected api call and return results', async () => {
            let expected = JSON.parse(fs.readFileSync(__dirname + '/fixtures/custom-roles-create.json', 'utf-8'));
            return ldutils.roles
                .createCustomRole(
                    'test-role',
                    'test role',
                    [
                        {
                            resources: ['proj/*:env/production'],
                            actions: ['*'],
                            effect: 'allow'
                        }
                    ],
                    'Allow access to production'
                )
                .then(actual => {
                    expect(actual).to.deep.equal(expected);
                    expect(postBody).to.deep.equal({
                        name: 'test role',
                        key: 'test-role',
                        description: 'Allow access to production',
                        policy: [
                            {
                                resources: ['proj/*:env/production'],
                                actions: ['*'],
                                effect: 'allow'
                            }
                        ]
                    });
                });
        });
    });

    describe('updateCustomRole', () => {
        let patchBody;
        before(done => {
            let scope = nock('https://app.launchdarkly.com')
                .get('/api/v2/roles/sample-role')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .patch('/api/v2/roles/sample-role', body => {
                    patchBody = body;
                    return body;
                })
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-update.json', {
                    'Content-Type': 'application/json'
                });
            assert(scope);
            done();
        });

        it('should make expected api call and return results', async () => {
            let expected = JSON.parse(fs.readFileSync(__dirname + '/fixtures/custom-roles-update.json', 'utf-8'));
            return ldutils.roles
                .updateCustomRole(
                    'sample-role',
                    'sample role',
                    [
                        {
                            resources: ['proj/*:env/production'],
                            actions: ['*'],
                            effect: 'allow'
                        }
                    ],
                    'Allow access to production'
                )
                .then(actual => {
                    expect(actual).to.deep.equal(expected);
                    expect(patchBody).to.deep.equal([
                        { op: 'replace', path: '/policy/0/effect', value: 'allow' },
                        { op: 'replace', path: '/policy/0/resources/0', value: 'proj/*:env/production' },
                        { op: 'remove', path: '/_id' },
                        { op: 'replace', path: '/description', value: 'Allow access to production' },
                        { op: 'replace', path: '/key', value: 'sample-role' },
                        { op: 'replace', path: '/name', value: 'sample role' },
                        { op: 'remove', path: '/_links' }
                    ]);
                });
        });
    });

    describe('upsertCustomRole', () => {
        before(done => {
            let scope = nock('https://app.launchdarkly.com')
                // update
                .get('/api/v2/roles/example-role')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .get('/api/v2/roles/example-role')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .patch('/api/v2/roles/example-role')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-update.json', {
                    'Content-Type': 'application/json'
                })

                // create
                .get('/api/v2/roles/example-role')
                .reply(
                    404,
                    { error: 'Not Found' },
                    {
                        'Content-Type': 'application/json'
                    }
                )
                .post('/api/v2/roles')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-create.json', {
                    'Content-Type': 'application/json'
                });

            assert(scope);
            done();
        });

        it('should patch existing role if found', async () => {
            let expected = JSON.parse(fs.readFileSync(__dirname + '/fixtures/custom-roles-update.json', 'utf-8'));
            return ldutils.roles
                .upsertCustomRole(
                    'example-role',
                    'example role',
                    [
                        {
                            resources: ['proj/*:env/production'],
                            actions: ['*'],
                            effect: 'allow'
                        }
                    ],
                    'Allow access to production'
                )
                .then(actual => {
                    expect(actual).to.deep.equal(expected);
                });
        });

        it('should create new role if not found', async () => {
            let expected = JSON.parse(fs.readFileSync(__dirname + '/fixtures/custom-roles-create.json', 'utf-8'));
            return ldutils.roles
                .upsertCustomRole(
                    'example-role',
                    'example role',
                    [
                        {
                            resources: ['proj/*:env/production'],
                            actions: ['*'],
                            effect: 'allow'
                        }
                    ],
                    'Allow access to production'
                )
                .then(actual => {
                    expect(actual).to.deep.equal(expected);
                });
        });
    });

    describe('bulkUpsertCustomRoles', () => {
        before(done => {
            let scope = nock('https://app.launchdarkly.com')
                // update
                .get('/api/v2/roles/test-role-one')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .get('/api/v2/roles/test-role-one')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .patch('/api/v2/roles/test-role-one')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-update.json', {
                    'Content-Type': 'application/json'
                })

                .get('/api/v2/roles/test-role-two')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .get('/api/v2/roles/test-role-two')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .patch('/api/v2/roles/test-role-two')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-update.json', {
                    'Content-Type': 'application/json'
                })

                // create
                .get('/api/v2/roles/test-role-three')
                .reply(
                    404,
                    { error: 'Not Found' },
                    {
                        'Content-Type': 'application/json'
                    }
                )
                .post('/api/v2/roles')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-create.json', {
                    'Content-Type': 'application/json'
                });

            assert(scope);
            done();
        });

        it('should operate on json bulkload file', async () => {
            let expected = JSON.parse(
                fs.readFileSync(__dirname + '/fixtures/custom-roles-bulk-load-result.json', 'utf-8')
            );
            return ldutils.roles
                .bulkUpsertCustomRoles(__dirname + '/fixtures/custom-roles-bulk-load-file.json')
                .then(actual => {
                    expect(actual).to.deep.equal(expected);
                });
        });
    });

    describe('bulkUpsertCustomRoleFolder', () => {
        before(done => {
            let scope = nock('https://app.launchdarkly.com')
                // update
                .get('/api/v2/roles/test-role-one')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .get('/api/v2/roles/test-role-one')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .patch('/api/v2/roles/test-role-one')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-update.json', {
                    'Content-Type': 'application/json'
                })

                .get('/api/v2/roles/test-role-two')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .get('/api/v2/roles/test-role-two')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-get.json', {
                    'Content-Type': 'application/json'
                })
                .patch('/api/v2/roles/test-role-two')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-update.json', {
                    'Content-Type': 'application/json'
                })

                // create
                .get('/api/v2/roles/test-role-three')
                .reply(
                    404,
                    { error: 'Not Found' },
                    {
                        'Content-Type': 'application/json'
                    }
                )
                .post('/api/v2/roles')
                .replyWithFile(200, __dirname + '/fixtures/custom-roles-create.json', {
                    'Content-Type': 'application/json'
                });

            assert(scope);
            done();
        });

        it('should operate on json bulkload file', async () => {
            let expected = JSON.parse(
                fs.readFileSync(__dirname + '/fixtures/custom-roles-bulk-load-result.json', 'utf-8')
            );
            return ldutils.roles.bulkUpsertCustomRoleFolder(__dirname + '/fixtures/bulkroles').then(actual => {
                expect(actual).to.deep.equal(expected);
            });
        });
    });
});
