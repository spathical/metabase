import React, { Component, PropTypes } from "react";

import ModalContent from "metabase/components/ModalContent.jsx";

const ConfirmContent = ({ title, content, onClose, onAction }) =>
    <ModalContent
        title={title}
        closeFn={onClose}
    >
        {content}

        <div className="Form-inputs mb4">
            <p>Are you sure you want to do this?</p>
        </div>

        <div className="Form-actions">
            <button className="Button Button--danger" onClick={() => { onAction(); onClose(); }}>Yes</button>
            <button className="Button ml1" onClick={onClose}>No</button>
        </div>
    </ModalContent>

export default ConfirmContent;
