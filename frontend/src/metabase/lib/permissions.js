/* @flow */

import { getIn, setIn } from "icepick";

import type { Database, DatabaseId } from "metabase/meta/types/Database";
import type { SchemaName, TableId } from "metabase/meta/types/Table";

import type { Group, GroupId, GroupsPermissions, GroupPermissions } from "metabase/meta/types/Permissions";

const getAccess = (value) => {
    if (!value) {
        return "none";
    } else if (typeof value === "object") {
        return "controlled";
    } else {
        return value;
    }
}

export const getSchemasPermissions = (permissions: GroupPermissions, dbId: DatabaseId): string => {
    return getAccess(getIn(permissions, [dbId, "schemas"]));
}

export const getNativePermissions = (permissions: GroupPermissions, dbId: DatabaseId): string => {
    return getIn(permissions, [dbId, "native"]);
}

export const getTablesPermissions = (permissions: GroupPermissions, dbId: DatabaseId, schemaName: ?SchemaName): string => {
    let schemas = getSchemasPermissions(permissions, dbId);
    if (schemas === "controlled") {
        let tables = getIn(permissions, [dbId, "schemas", schemaName || ""]);
        if (tables) {
            return getAccess(tables);
        } else {
            return "none";
        }
    } else {
        return schemas;
    }
}

export const getFieldsPermissions = (permissions: GroupPermissions, dbId: DatabaseId, schemaName: ?SchemaName, tableId: TableId): string => {
    let tables = getTablesPermissions(permissions, dbId, schemaName);
    if (tables === "controlled") {
        let fields = getIn(permissions, [dbId, "schemas", schemaName || "", tableId]);
        if (fields) {
            return getAccess(fields);
        } else {
            return "none";
        }
    } else {
        return tables;
    }
}

export function updatePermission(perms: GroupsPermissions, path: Array<string>, value: string, entityIds: ?Array<string|number>): GroupsPermissions {
    let current = getIn(perms, path);
    if (current === value || (current && typeof current === "object" && value === "controlled")) {
        return perms;
    }
    let newValue;
    if (value === "controlled") {
        newValue = {};
        if (entityIds) {
            for (let entityId of entityIds) {
                newValue[entityId] = current
            }
        }
    } else {
        newValue = value;
    }
    for (var i = 0; i < path.length; i++) {
        if (typeof getIn(perms, path.slice(0, i)) === "string") {
            perms = setIn(perms, path.slice(0, i), {});
        }
    }
    return setIn(perms, path, newValue);
}

type PermissionsDiff = {
    groups: {
        [key: GroupId]: GroupPermissionsDiff
    }
}

type GroupPermissionsDiff = {
    name?: string,
    databases: {
        [key: DatabaseId]: DatabasePermissionsDiff
    }
}

type DatabasePermissionsDiff = {
    name?: string,
    native?: string,
    revokedTables: {
        [key: TableId]: TablePermissionsDiff
    },
    grantedTables: {
        [key: TableId]: TablePermissionsDiff
    },
}

type TablePermissionsDiff = {
    name?: string,
}

function deleteIfEmpty(object: { [key: any]: any }, key: any) {
    if (Object.keys(object[key]).length === 0) {
        delete object[key];
    }
}

function diffDatabasePermissions(database, newGroupPermissions, oldGroupPermissions): DatabasePermissionsDiff {
    const databaseDiff: DatabasePermissionsDiff = { grantedTables: {}, revokedTables: {} };
    // get the native permisisons for this db
    const oldNativePerm = getNativePermissions(oldGroupPermissions, database.id);
    const newNativePerm = getNativePermissions(newGroupPermissions, database.id);
    if (oldNativePerm !== newNativePerm) {
        databaseDiff.native = newNativePerm;
    }
    // check each table in this db
    for (const table of database.tables) {
        const oldFieldsPerm = getFieldsPermissions(oldGroupPermissions, database.id, table.schema, table.id);
        const newFieldsPerm = getFieldsPermissions(newGroupPermissions, database.id, table.schema, table.id);
        if (oldFieldsPerm !== newFieldsPerm) {
            if (oldFieldsPerm === "none") {
                databaseDiff.revokedTables[table.id] = { name: table.display_name };
            } else {
                databaseDiff.grantedTables[table.id] = { name: table.display_name };
            }
        }
    }
    // remove types that have no tables
    for (let type of ["grantedTables", "revokedTables"]) {
        deleteIfEmpty(databaseDiff, type);
    }
    return databaseDiff;
}

function diffGroupPermissions(databases, newGroupPermissions, oldGroupPermissions): GroupPermissionsDiff {
    let groupDiff: GroupPermissionsDiff = { databases: {} };
    for (const database of databases) {
        groupDiff.databases[database.id] = diffDatabasePermissions(database, newGroupPermissions, oldGroupPermissions);
        deleteIfEmpty(groupDiff.databases, database.id);
        if (groupDiff.databases[database.id]) {
            groupDiff.databases[database.id].name = database.name;
        }
    }
    deleteIfEmpty(groupDiff, "databases");
    return groupDiff;
}

export function diffPermissions(groups: Array<Group>, databases: Array<Database>, newPermissions: GroupsPermissions, oldPermissions: GroupsPermissions): PermissionsDiff {
    let permissionsDiff: PermissionsDiff = { groups: {} };
    if (databases && newPermissions && oldPermissions) {
        for (let group of groups) {
            permissionsDiff.groups[group.id] = diffGroupPermissions(databases, newPermissions[group.id], oldPermissions[group.id]);
            deleteIfEmpty(permissionsDiff.groups, group.id);
            if (permissionsDiff.groups[group.id]) {
                permissionsDiff.groups[group.id].name = group.name;
            }
        }
    }
    return permissionsDiff;
}
