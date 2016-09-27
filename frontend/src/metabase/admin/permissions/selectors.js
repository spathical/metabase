/* @flow weak */

import { createSelector } from 'reselect';

import { push } from "react-router-redux";

import Metadata from "metabase/meta/metadata/Metadata";

import type { DatabaseId } from "metabase/meta/types/Database";
import type { SchemaName } from "metabase/meta/types/Table";
import type { Group, GroupsPermissions } from "metabase/meta/types/Permissions";

import {
    getNativePermission,
    getSchemasPermission,
    getTablesPermission,
    getFieldsPermission,
    updateFieldsPermission,
    updateTablesPermission,
    updateSchemasPermission,
    updateNativePermission,
    diffPermissions,
} from "metabase/lib/permissions";

export const getGroups = (state) => state.permissions.groups;
const getDatabases = (state) => state.permissions.databases;
const getPermissions = (state) => state.permissions.permissions;
const getOriginalPermissions = (state) => state.permissions.originalPermissions;

const getDatabaseId = (state, props) => props.params.databaseId ? parseInt(props.params.databaseId) : null
const getSchemaName = (state, props) => props.params.schemaName

const getMetadata = createSelector(
    [(state) => state.permissions.databases],
    (databases) => databases && new Metadata(databases)
);

export const getDirty = createSelector(
    getPermissions, getOriginalPermissions,
    (permissions, originalPermissions) =>
        JSON.stringify(permissions) !== JSON.stringify(originalPermissions)
)

export const getSaveError = (state) => state.permissions.saveError;

export const getTablesPermissionsGrid = createSelector(
    getGroups, getMetadata, getPermissions, getDatabaseId, getSchemaName,
    (groups: Array<Group>, metadata: Metadata, permissions: GroupsPermissions, databaseId: DatabaseId, schemaName: SchemaName) => {
        const database = metadata && metadata.database(databaseId);

        if (!groups || !permissions || !metadata || !database) {
            return null;
        }

        const tables = database.tablesInSchema(schemaName || null);

        return {
            type: "table",
            groups,
            permissions: {
                "fields": {
                    options: ["all", "none"],
                    getter: (groupId, entityId) => {
                        return getFieldsPermission(permissions, groupId, entityId);
                    },
                    updater: (permissions, groupId, entityId, value) => {
                        return updateFieldsPermission(permissions, groupId, entityId, value, metadata);
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
            }))
        };
    }
);

export const getSchemasPermissionsGrid = createSelector(
    getGroups, getMetadata, getPermissions, getDatabaseId,
    (groups: Array<Group>, metadata: Metadata, permissions: GroupsPermissions, databaseId: DatabaseId) => {
        const database = metadata && metadata.database(databaseId);

        if (!groups || !permissions || !metadata || !database) {
            return null;
        }

        const schemaNames = database.schemaNames();

        return {
            type: "schema",
            groups,
            permissions: {
                "tables": {
                    options: ["all", "controlled", "none"],
                    getter: (groupId, entityId) => {
                        return getTablesPermission(permissions, groupId, entityId);
                    },
                    updater: (permissions, groupId, entityId, value) => {
                        return updateTablesPermission(permissions, groupId, entityId, value, metadata);
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
            }))
        }
    }
);

export const getDatabasesPermissionsGrid = createSelector(
    getGroups, getMetadata, getPermissions,
    (groups: Array<Group>, metadata: Metadata, permissions: GroupsPermissions) => {
        if (!groups || !permissions || !metadata) {
            return null;
        }

        const databases = metadata.databases();

        return {
            type: "database",
            groups,
            permissions: {
                "schemas": {
                    options: ["all", "controlled", "none"],
                    getter: (groupId, entityId) => {
                        return getSchemasPermission(permissions, groupId, entityId);
                    },
                    updater: (permissions, groupId, entityId, value) => {
                        return updateSchemasPermission(permissions, groupId, entityId, value, metadata)
                    },
                    postAction: (groupId, { databaseId }, value) => {
                        if (value === "controlled") {
                            return push(`/admin/permissions/databases/${databaseId}/schemas`);
                        }
                    }
                },
                "native": {
                    options: ["write", "read", "none"],
                    getter: (groupId, entityId) => {
                        return getNativePermission(permissions, groupId, entityId);
                    },
                    updater: (permissions, groupId, entityId, value) => {
                        return updateNativePermission(permissions, groupId, entityId, value, metadata);
                    },
                },
            },
            entities: databases.map(database => {
                let schemas = database.schemaNames();
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
            })
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
