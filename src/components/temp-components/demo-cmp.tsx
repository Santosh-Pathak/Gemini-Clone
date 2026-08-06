"use client";
import { NodeViewWrapper } from "@tiptap/react";
import React from "react";
import root from "react-shadow/styled-components";
import { FormatOutput } from "@/utils/shadow";

function DemoComponent(props: { node: { attrs: { count?: string } } }) {
  return (
    <NodeViewWrapper className="react-component">
      <label>React Component</label>
      <root.div className="content">
        <FormatOutput>{props.node.attrs.count}</FormatOutput>
      </root.div>
    </NodeViewWrapper>
  );
}

export default DemoComponent;
