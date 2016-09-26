/* @flow weak */

import { createSelector } from 'reselect';

import { push } from "react-router-redux";

import { diffPermissions, updatePermission, getNativePermissions, getSchemasPermissions, getTablesPermissions, getFieldsPermissions } from "metabase/lib/permissions";

import _ from "underscore";

const getGroups = (state) => state.permissions.groups;
const getDatabases = (state) => state.permissions.databases;
const getPermissions = (state) => state.permissions.permissions;
const getOriginalPermissions = (state) => state.permissions.originalPermissions;

const getDatabaseId = (state, props) => props.params.databaseId ? parseInt(props.params.databaseId) : null
const getSchemaName = (state, props) => props.params.schemaName

export const getDirty = createSelector(
    getPermissions, getOriginalPermissions,
    (permissions, originalPermissions) =>
        JSON.stringify(permissions) !== JSON.stringify(originalPermissions)
)

export const getSaveError = (state) => state.permissions.saveError;

export const getTablesPermissionsGrid = createSelector(
    getGroups, getDatabases, getPermissions, getDatabaseId, getSchemaName,
    (groups, databases, permissions, databaseId, schemaName) => {
        if (!groups || !databases || !permissions) {
            return null;
        }

        let database = _.findWhere(databases, { id: databaseId });
        let tables = database.tables.filter(table => (table.schema || "") === schemaName);

        let schemaNames = _.uniq(database.tables.map(table => (table.schema || "")));
        let tableIds = tables.map(table => table.id);

        return {
            type: "table",
            groups,
            permissions: {
                "fields": {
                    options: ["all", "none"],
                    updater: (perms, groupId, { databaseId, schemaName, tableId }, value) => {
                        perms = updatePermission(perms, [groupId, databaseId, "schemas"], "controlled", schemaNames);
                        perms = updatePermission(perms, [groupId, databaseId, "schemas", schemaName], "controlled", tableIds);
                        perms = updatePermission(perms, [groupId, databaseId, "schemas", schemaName, tableId], value /* TODO: field ids, when enabled "controlled" fields */);
                        return perms;
                    }
                }
            },
            entities: tables.map(table => ({
                id: {
                    databaseId: databaseId,
                    schemaName: schemaName,
                    tableId: table.id
                },
                name: table.display_name,
            })),
            data: tables.map(table =>
                groups.map(group => ({
                    fields: getFieldsPermissions(permissions[group.id], databaseId, schemaName, table.id)
                }))
            )
        }
    }
);

export const getSchemasPermissionsGrid = createSelector(
    getGroups, getDatabases, getPermissions, getDatabaseId,
    (groups, databases, permissions, databaseId) => {
        if (!groups || !databases || !permissions) {
            return null;
        }

        let database = _.findWhere(databases, { id: databaseId });
        let schemaNames = _.uniq(database.tables.map(table => (table.schema || "")));
        return {
            type: "schema",
            groups,
            permissions: {
                "tables": {
                    options: ["all", "controlled", "none"],
                    updater: (perms, groupId, { databaseId, schemaName }, value) => {
                        let tableIds = database.tables.filter(table => (table.schema || "") === schemaName).map(table => table.id);
                        perms = updatePermission(perms, [groupId, databaseId, "schemas"], "controlled", schemaNames);
                        perms = updatePermission(perms, [groupId, databaseId, "schemas", schemaName], value, tableIds);
                        return perms;
                    },
                    postAction: (groupId, { databaseId, schemaName }, value) => {
                        if (value === "controlled") {
                            return push(`/admin/permissions/databases/${databaseId}/schemas/${encodeURIComponent(schemaName)}/tables`);
                        }
                    }
                }
            },
            entities: schemaNames.map(schemaName => ({
                id: {
                    databaseId,
                    schemaName
                },
                name: schemaName,
                link: { name: "View tables", url: `/admin/permissions/databases/${databaseId}/schemas/${encodeURIComponent(schemaName)}/tables`}
            })),
            data: schemaNames.map(schemaName =>
                groups.map(group => ({
                    tables: getTablesPermissions(permissions[group.id], databaseId, schemaName)
                }))
            )
        }
    }
);

export const getDatabasesPermissionsGrid = createSelector(
    getGroups, getDatabases, getPermissions,
    (groups, databases, permissions) => {
        if (!groups || !databases || !permissions) {
            return null;
        }

        return {
            type: "database",
            groups,
            permissions: {
                "schemas": {
                    options: ["all", "controlled", "none"],
                    updater: (perms, groupId, { databaseId }, value) => {
                        let database = _.findWhere(databases, { id: databaseId });
                        let schemaNames = database && _.uniq(database.tables.map(table => (table.schema || "")));
                        // disable native query permisisons if setting schema access to none
                        if (value === "none") {
                            perms = updatePermission(perms, [groupId, databaseId, "native"], "none");
                        }
                        return updatePermission(perms, [groupId, databaseId, "schemas"], value, schemaNames);
                    },
                    postAction: (groupId, { databaseId }, value) => {
                        if (value === "controlled") {
                            return push(`/admin/permissions/databases/${databaseId}/schemas`);
                        }
                    }
                },
                "native": {
                    options: ["write", "read", "none"],
                    updater: (perms, groupId, { databaseId }, value) => {
                        // if enabling native query write access, give access to all schemas since they are equivalent
                        if (value === "write") {
                            perms = updatePermission(perms, [groupId, databaseId, "schemas"], "all");
                        }
                        return updatePermission(perms, [groupId, databaseId, "native"], value);
                    },
                },
            },
            entities: databases.map(database => {
                let schemas = _.uniq(database.tables.map(table => (table.schema || "")));
                return {
                    id: {
                        databaseId: database.id
                    },
                    name: database.name,
                    link: schemas.length === 1 ?
                        { name: "View tables", url: schemas[0] === "" ?
                            `/admin/permissions/databases/${database.id}/tables` :
                            `/admin/permissions/databases/${database.id}/schemas/${schemas[0]}/tables`
                        } :
                        { name: "View schemas", url: `/admin/permissions/databases/${database.id}/schemas`}
                }
            }),
            data: databases.map(database =>
                groups.map(group => ({
                    native: getNativePermissions(permissions[group.id], database.id),
                    schemas: getSchemasPermissions(permissions[group.id], database.id)
                }))
            )
        }
    }
);


export const getDiff = createSelector(
    getGroups,
    getDatabases,
    getPermissions,
    getOriginalPermissions,
    diffPermissions
)
