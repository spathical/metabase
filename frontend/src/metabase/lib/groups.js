
export function isDefaultGroup(group) {
    return group.name === "Default"; // FIXME: "All Users"
}

export function isAdminGroup(group) {
    return group.name === "Admin"; // FIXME: "Administrators";
}

export function canEditPermissions(group) {
    return !isAdminGroup(group);
}

export function canEditMembership(group) {
    return !isDefaultGroup(group);
}
