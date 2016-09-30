/* eslint "react/prop-types": "warn" */
import React, { Component, PropTypes } from "react";
import cx from "classnames";

import { inflect } from "metabase/lib/formatting";

import Icon from "metabase/components/Icon.jsx";
import PopoverWithTrigger from "metabase/components/PopoverWithTrigger.jsx";
import CheckBox from "metabase/components/CheckBox.jsx";
import LoadingSpinner from "metabase/components/LoadingSpinner.jsx";

import { isAdminGroup, isDefaultGroup } from "metabase/lib/groups";

import _ from "underscore";

const GroupOption = ({ name, color, selected, disabled, onChange }) =>
    <div className={cx("flex align-center p1 px2", { "cursor-pointer": !disabled })} onClick={() => !disabled && onChange(!selected) }>
        <span className={cx("pr1", color, { disabled })}>
            <CheckBox checked={selected} borderColor="currentColor" size={18} />
        </span>
        {name}
    </div>

GroupOption.propTypes = {
    name: PropTypes.string,
    color: PropTypes.string,
    selected: PropTypes.bool,
    disabled: PropTypes.bool,
    onChange: PropTypes.func,
}

export default class UserGroupSelect extends Component {
    static propTypes = {
        user: PropTypes.object.isRequired,
        groups: PropTypes.array,
        createMembership: PropTypes.func.isRequired,
        deleteMembership: PropTypes.func.isRequired,
    };

    static defaultProps = {
        isInitiallyOpen: false
    };

    toggle () {
        this.refs.popover.toggle();
    }

    render() {
        let { user, groups, createMembership, deleteMembership } = this.props;

        if (!groups || groups.length === 0 || !user.memberships) {
            return <LoadingSpinner />;
        }

        const changeMembership = (group, member) => {
            if (member) {
                createMembership({ groupId: group.id, userId: user.id })
            } else {
                deleteMembership({ membershipId: group.membership.membership_id })
            }
        }

        let adminGroup = _.find(groups, isAdminGroup);
        let defaultGroup = _.find(groups, isDefaultGroup);
        let otherGroups = groups.filter(g => !isAdminGroup(g) && !isDefaultGroup(g));

        let groupOptions = [];
        groupOptions.push({
            ...adminGroup,
            color: "text-purple",
            membership: user.memberships[adminGroup.id]
        });
        groupOptions.push({
            ...defaultGroup,
            color: "text-grey-4",
            membership: user.memberships[defaultGroup.id],
            disabled: true
        });
        if (otherGroups.length) {
            groupOptions.push(null); // signifies a divider
            for (const otherGroup of otherGroups) {
                groupOptions.push({
                    ...otherGroup,
                    color: "text-brand",
                    membership: user.memberships[otherGroup.id]
                })
            }
        }

        let isAdmin = user.memberships[adminGroup.id];
        let other = otherGroups.filter(group => user.memberships[group.id]);

        let triggerText;
        if (isAdmin) {
            triggerText = (
                <span>
                    <span className="text-purple">Admin</span>
                    { other.length > 0 && " and " }
                    { other.length > 0 && <span className="text-brand">{other.length + " other " + inflect("group", other.length)}</span> }
                </span>
            );
        } else if (other.length === 1) {
            triggerText = <span className="text-brand">{other[0].name}</span>;
        } else if (other.length > 1) {
            triggerText = <span className="text-brand">{other.length + " " + inflect("group", other.length)}</span>;
        } else {
            triggerText = "Default";
        }

        return (
            <PopoverWithTrigger
                ref="popover"
                className="UserRolePopover block"
                triggerElement={
                    <div className="flex align-center">
                        <span className="mr1 text-grey-4">{triggerText}</span>
                        <Icon className="text-grey-2" name="chevrondown"  size={10}/>
                    </div>
                }
                triggerClasses="AdminSelectBorderless py1"
            >
                <div className="py1">
                    { groupOptions.map(group =>
                        group == null ?
                            <div key="divider" className="border-bottom pb1 mb1" />
                        :
                            <GroupOption
                                key={group.id}
                                name={group.name}
                                color={group.color}
                                disabled={group.disabled}
                                selected={!!group.membership}
                                onChange={changeMembership.bind(null, group)}
                            />
                    )}
                </div>
            </PopoverWithTrigger>
        );
    }
}
