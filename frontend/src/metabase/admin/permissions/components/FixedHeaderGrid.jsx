import React, { Component, PropTypes } from "react";

import { Grid, AutoSizer, ScrollSync } from 'react-virtualized'
import 'react-virtualized/styles.css'; // only needs to be imported once

import cx from "classnames";

// import scrollbarSize from 'dom-helpers/util/scrollbarSize'
const scrollbarSize = () => 10;

const FixedHeaderGrid = ({
    className,

    rowsCount,
    columnsCount,
    renderCell,
    columnWidth,
    rowHeight,

    renderColumnHeader,
    columnHeaderHeight,

    rowHeaderWidth,
    renderRowHeader,

    renderCorner
}) =>
    <div className={cx(className, "relative")}>
        <AutoSizer>
        {({ height, width }) =>
            <ScrollSync>
                {({ clientHeight, clientWidth, onScroll, scrollHeight, scrollLeft, scrollTop, scrollWidth }) =>
                    <div>
                        {/* CORNER */}
                        <div style={{ position: "absolute", top: 0, left: 0, overflow: "hidden" }}>
                            <Grid
                                width={rowHeaderWidth}
                                height={columnHeaderHeight}
                                renderCell={renderCorner}
                                columnsCount={1}
                                rowsCount={1}
                                columnWidth={rowHeaderWidth}
                                rowHeight={columnHeaderHeight}
                            />
                        </div>
                        {/* COLUMN HEADERS */}
                        <div style={{ position: "absolute", top: 0, left: rowHeaderWidth, height: columnHeaderHeight, overflow: "hidden" }}>
                            <Grid
                                width={width - rowHeaderWidth}
                                height={columnHeaderHeight + scrollbarSize()}
                                renderCell={(...args) =>
                                    // HACK: offsets the additional height needed to hide the scrollbars
                                    <div style={{ height: columnHeaderHeight, position: "relative" }}>{renderColumnHeader(...args)}</div>
                                }
                                columnsCount={columnsCount}
                                rowsCount={1}
                                columnWidth={columnWidth}
                                rowHeight={columnHeaderHeight + scrollbarSize()}
                                scrollLeft={scrollLeft}
                            />
                        </div>
                        {/* ROW HEADERS */}
                        <div style={{ position: "absolute", top: columnHeaderHeight, left: 0, width: rowHeaderWidth, overflow: "hidden" }}>
                            <Grid
                                width={rowHeaderWidth + scrollbarSize()}
                                height={height - columnHeaderHeight}
                                renderCell={(...args) =>
                                    // HACK: offsets the additional width needed to hide the scrollbars
                                    <div style={{ width: rowHeaderWidth, position: "relative" }}>{renderRowHeader(...args)}</div>
                                }
                                columnsCount={1}
                                rowsCount={rowsCount}
                                columnWidth={rowHeaderWidth + scrollbarSize()}
                                rowHeight={rowHeight}
                                scrollTop={scrollTop}
                            />
                        </div>
                        {/* CELLS */}
                        <div style={{ position: "absolute", top: columnHeaderHeight, left: rowHeaderWidth, overflow: "hidden" }}>
                            <Grid
                                width={width - rowHeaderWidth}
                                height={height - columnHeaderHeight}
                                renderCell={renderCell}
                                columnsCount={columnsCount}
                                rowsCount={rowsCount}
                                columnWidth={columnWidth}
                                rowHeight={rowHeight}
                                onScroll={onScroll}
                            />
                        </div>
                    </div>
                }
            </ScrollSync>
        }
        </AutoSizer>
    </div>

export default FixedHeaderGrid;
