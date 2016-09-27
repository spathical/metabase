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
    getMetadata, getGroups, getPermissions, getDatabaseId, getSchemaName,
    (metadata: Metadata, groups: Array<Group>, permissions: GroupsPermissions, databaseId: DatabaseId, schemaName: SchemaName) => {
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
                    options(groupId, entityId) {
                        return ["all", "none"]
                    },
                    getter(groupId, entityId) {
                        return getFieldsPermission(permissions, groupId, entityId);
                    },
                    updater(groupId, entityId, value) {
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
    getMetadata, getGroups, getPermissions, getDatabaseId,
    (metadata: Metadata, groups: Array<Group>, permissions: GroupsPermissions, databaseId: DatabaseId) => {
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
                    options(groupId, entityId) {
                        return ["all", "controlled", "none"]
                    },
                    getter(groupId, entityId) {
                        return getTablesPermission(permissions, groupId, entityId);
                    },
                    updater(groupId, entityId, value) {
                        return updateTablesPermission(permissions, groupId, entityId, value, metadata);
                    },
                    postAction(groupId, { databaseId, schemaName }, value) {
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
    getMetadata, getGroups, getPermissions,
    (metadata: Metadata, groups: Array<Group>, permissions: GroupsPermissions) => {
        if (!groups || !permissions || !metadata) {
            return null;
        }

        const databases = metadata.databases();

        return {
            type: "database",
            groups,
            permissions: {
                "schemas": {
                    options(groupId, entityId) {
                        return ["all", "controlled", "none"]
                    },
                    getter(groupId, entityId) {
                        return getSchemasPermission(permissions, groupId, entityId);
                    },
                    updater(groupId, entityId, value) {
                        return updateSchemasPermission(permissions, groupId, entityId, value, metadata)
                    },
                    postAction(groupId, { databaseId }, value) {
                        if (value === "controlled") {
                            return push(`/admin/permissions/databases/${databaseId}/schemas`);
                        }
                    }
                },
                "native": {
                    options(groupId, entityId) {
                        if (getSchemasPermission(permissions, groupId, entityId) === "none") {
                            return ["none"];
                        } else {
                            return ["write", "read", "none"];
                        }
                    },
                    getter(groupId, entityId) {
                        return getNativePermission(permissions, groupId, entityId);
                    },
                    updater(groupId, entityId, value) {
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
    getMetadata, getGroups, getPermissions, getOriginalPermissions,
    (metadata: Metadata, groups: Array<Group>, permissions: GroupsPermissions, originalPermissions: GroupsPermissions) =>
        diffPermissions(permissions, originalPermissions, groups, metadata)
);
