import React, { Component, PropTypes } from "react";

import cx from "classnames";

const AddRow = ({ value, isValid, placeholder, onKeyDown, onChange, onDone, onCancel, children }) =>
    <div className="my2 pl2 p1 bordered border-brand rounded relative flex align-center">
        <input
            className="input--borderless h3 flex-full"
            type="text"
            value={value}
            placeholder={placeholder}
            autoFocus
            onKeyDown={onKeyDown}
            onChange={onChange}
        />
        {children}
        <span className="link no-decoration cursor-pointer" onClick={onCancel}>
            Cancel
        </span>
        <button className={cx("Button ml2", {"Button--primary": !!isValid})} disabled={!isValid} onClick={onDone}>
            Done
        </button>
    </div>

export default AddRow;
