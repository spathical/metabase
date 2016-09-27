import React, { Component, PropTypes } from "react";

import cx from "classnames";

const AdminPaneTitle = ({ title, buttonText, buttonAction, buttonDisabled }) =>
    <section className="clearfix px2">
        { buttonText && buttonAction ?
            <button className={cx("Button float-right", {"Button--primary": !buttonDisabled})} disabled={buttonDisabled} onClick={buttonAction}>
                {buttonText}
            </button>
        : null }
        <h2 className="PageTitle">{title}</h2>
    </section>

const AdminPaneLayout = ({ title, buttonText, buttonAction, buttonDisabled, children }) =>
    <div className="wrapper">
        <AdminPaneTitle title={title} buttonText={buttonText} buttonAction={buttonAction} buttonDisabled={buttonDisabled} />
        {children}
    </div>

export default AdminPaneLayout;
