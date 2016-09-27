
export function isDefaultGroup(group) {
    return group.name === "All Users";
}

export function isAdminGroup(group) {
    return group.name === "Administrators";
}

export function canEditPermissions(group) {
    return !isAdminGroup(group);
}

export function canEditMembership(group) {
    return !isDefaultGroup(group);
}
