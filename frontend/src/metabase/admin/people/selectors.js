import { createSelector } from 'reselect';

export const getGroups = (state) => state.permissions.groups;
export const getGroup = (state) => state.permissions.group;
export const getUsers = (state) => state.permissions.users;

// our master selector which combines all of our partial selectors above
export const adminPeopleSelectors = createSelector(
	[state => state.people.modal, state => state.people.users],
	(modal, users) => ({modal, users})
);
