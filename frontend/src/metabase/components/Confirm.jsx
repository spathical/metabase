/* eslint "react/prop-types": "warn" */
import React, { Component, PropTypes } from "react";

import ModalWithTrigger from "metabase/components/ModalWithTrigger.jsx";
import ConfirmContent from "./ConfirmContent.jsx";

export default class Confirm extends Component {
    static propTypes = {
        action: PropTypes.func.isRequired,
        title: PropTypes.string.isRequired,
        children: PropTypes.any,
        content: PropTypes.any,
    };

    render() {
        const { action, children, title, content } = this.props;
        return (
            <ModalWithTrigger ref="modal" triggerElement={children}>
                <ConfirmContent
                    title={title}
                    content={content}
                    onClose={() => {
                        this.refs.modal.close();
                    }}
                    onAction={action}
                />
            </ModalWithTrigger>
        );
    }
}
